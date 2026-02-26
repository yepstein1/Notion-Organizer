/**
 * test-smart-merge.js
 *
 * End-to-end test for the smart merge / deduplication logic.
 * Inlines all Notion API logic from handler.js so handler.js needs no modification.
 *
 * Run with:
 *   NOTION_TOKEN=<token> NOTION_DATABASE_ID=<db-id> node backend/src/test-smart-merge.js
 *
 * --------------------------------------------------------------------------
 * BUG SUMMARY (root cause identified during investigation)
 * --------------------------------------------------------------------------
 *
 * Bug 1 — `after` parameter is DEPRECATED and version-gated (primary bug)
 * -------------------------------------------------------------------------
 * In smartAppendToPage, handler.js sends:
 *
 *   { after: entry.lastBlockId, children: bulletBlocks }
 *
 * The `after` parameter is deprecated in the Notion API and is NOT recognised
 * by the API version the handler uses (2022-06-28 by default). On that
 * version, the `after` key is silently ignored and the new bullets are
 * appended to the very END of the page — not under the correct heading.
 * The modern equivalent is the `position` parameter:
 *
 *   {
 *     "position": {
 *       "type": "after_block",
 *       "after_block": { "id": "<lastBlockId>" }
 *     },
 *     "children": [...]
 *   }
 *
 * Even with the modern `position` parameter the approach is fragile: if the
 * heading already has bullets and we insert after the LAST one, the ordering
 * is correct, but if the page layout changes or the last block is a nested
 * child, the cursor drifts.
 *
 * Bug 2 — `contentBlocks` is an undefined variable in createOrUpdatePage
 * -------------------------------------------------------------------------
 * On the create-new-page branch:
 *
 *   const newPage = await createPage(
 *     token, databaseId, pageData.topic, pageData.tags || [], contentBlocks
 *   );
 *
 * `contentBlocks` is never defined in that scope. This causes a ReferenceError
 * every time a brand-new page is created. The correct call should be:
 *
 *   buildContentBlocks(pageData.sections || [])
 *
 * Fix implemented in this test (rebuild-and-replace strategy)
 * -----------------------------------------------------------
 * Instead of trying to insert blocks at a precise position via the API,
 * we rebuild the full page content in memory by merging old and new sections,
 * delete all existing child blocks, then re-post the merged content in one
 * request. This is version-agnostic and guaranteed to produce the correct
 * structure with no duplicate headings.
 * --------------------------------------------------------------------------
 */

'use strict';

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------
const token = process.env.NOTION_TOKEN;
const dbId  = process.env.NOTION_DATABASE_ID;

if (!token || !dbId) {
  console.error('ERROR: NOTION_TOKEN and NOTION_DATABASE_ID environment variables must be set.');
  process.exit(1);
}

const NOTION_API_VERSION = '2022-06-28';

// ---------------------------------------------------------------------------
// Helpers — inlined from handler.js so handler.js needs no modification
// ---------------------------------------------------------------------------

/**
 * Low-level fetch wrapper that adds Notion auth headers.
 */
const notionFetch = async (path, options = {}) => {
  const url = `https://api.notion.com/v1/${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': NOTION_API_VERSION,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  return response;
};

/**
 * Find a page in the database by exact title match.
 */
const findPageByTitle = async (title) => {
  const response = await notionFetch(`databases/${dbId}/query`, {
    method: 'POST',
    body: JSON.stringify({
      filter: {
        property: 'Name',
        title: { equals: title }
      }
    })
  });
  const data = await response.json();
  return data.results && data.results.length > 0 ? data.results[0] : null;
};

/**
 * Build Notion block objects from a sections array.
 * Each section has { heading: string, bullets: (string | { text, children })[] }.
 */
const buildContentBlocks = (sections) => {
  const blocks = [];
  for (const section of sections) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: section.heading } }]
      }
    });
    for (const bullet of section.bullets) {
      const isNested = typeof bullet === 'object' && bullet.text;
      const bulletText = isNested ? bullet.text : bullet;
      const bulletBlock = {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: bulletText } }]
        }
      };
      if (isNested && bullet.children && bullet.children.length > 0) {
        bulletBlock.bulleted_list_item.children = bullet.children.map(child => ({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ type: 'text', text: { content: child } }]
          }
        }));
      }
      blocks.push(bulletBlock);
    }
  }
  return blocks;
};

/**
 * Create a brand-new page in the database.
 * (Fixes handler.js Bug 2: uses buildContentBlocks(sections) instead of the
 * undefined `contentBlocks` variable.)
 */
const createPage = async (topic, tags, sections) => {
  const contentBlocks = buildContentBlocks(sections);
  const properties = {
    Name: { title: [{ text: { content: topic } }] }
  };
  if (tags && tags.length > 0) {
    properties.Tags = {
      rich_text: [{ text: { content: tags.join(', ') } }]
    };
  }
  const response = await notionFetch('pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: dbId },
      properties,
      children: contentBlocks
    })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(`createPage failed: ${JSON.stringify(err)}`);
  }
  return response.json();
};

/**
 * Fetch all top-level child blocks of a page.
 * Handles pagination so we always get the full list.
 */
const fetchPageBlocks = async (pageId) => {
  const allResults = [];
  let cursor = undefined;
  do {
    const params = cursor ? `?start_cursor=${cursor}` : '';
    const response = await notionFetch(`blocks/${pageId}/children${params}`, { method: 'GET' });
    if (!response.ok) break;
    const data = await response.json();
    allResults.push(...(data.results || []));
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return allResults;
};

/**
 * Build a heading map from existing blocks.
 * Returns: { [lowerCaseHeading]: { heading: string, bullets: string[] } }
 *
 * The original handler.js buildHeadingMap only tracks block IDs for the
 * broken `after`-based approach. This version extracts the bullet text so
 * we can merge sections in memory.
 */
const buildHeadingMap = (blocks) => {
  const map = {};
  let currentKey = null;

  for (const block of blocks) {
    if (block.type === 'divider') {
      currentKey = null;
    } else if (block.type === 'heading_2') {
      const raw = block.heading_2?.rich_text?.[0]?.text?.content || '';
      const key = raw.toLowerCase();
      if (!map[key]) {
        map[key] = { heading: raw, bullets: [] };
        currentKey = key;
      } else {
        // Duplicate heading already present — skip to avoid further confusion
        currentKey = null;
      }
    } else if (block.type === 'bulleted_list_item' && currentKey) {
      const text = block.bulleted_list_item?.rich_text?.[0]?.text?.content || '';
      map[currentKey].bullets.push(text);
    }
  }

  return map;
};

/**
 * Archive (soft-delete) a single block via the Notion API.
 */
const archiveBlock = async (blockId) => {
  const response = await notionFetch(`blocks/${blockId}`, {
    method: 'PATCH',
    body: JSON.stringify({ archived: true })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(`archiveBlock(${blockId}) failed: ${JSON.stringify(err)}`);
  }
};

/**
 * FIXED smartAppendToPage — rebuild-and-replace strategy.
 *
 * This replaces the broken `after`-parameter approach from handler.js.
 *
 * Algorithm:
 *  1. Fetch all existing blocks and parse them into a heading map.
 *  2. For each incoming section:
 *     - If a heading already exists, merge the new bullets onto the existing
 *       bullet list (deduplicating case-insensitively).
 *     - Otherwise add it as a brand-new section at the end.
 *  3. Delete every existing top-level child block (archive them).
 *  4. Re-post the fully merged content as a fresh set of children.
 *
 * This avoids ALL dependency on the `after` / `position` parameter and is
 * guaranteed to produce a clean, deduplicated page on any API version.
 */
const smartAppendToPage = async (pageId, sections) => {
  // Step 1 — read current state
  const existingBlocks = await fetchPageBlocks(pageId);
  const headingMap = buildHeadingMap(existingBlocks);

  // Step 2 — merge in memory (preserve original heading order; new ones go last)
  const orderedKeys = Object.keys(headingMap);

  for (const section of sections) {
    const key = section.heading.toLowerCase();
    if (headingMap[key]) {
      // Merge: append bullets that are not already present (case-insensitive)
      const existingLower = headingMap[key].bullets.map(b => b.toLowerCase());
      for (const bullet of section.bullets) {
        const bulletText = typeof bullet === 'object' ? bullet.text : bullet;
        if (!existingLower.includes(bulletText.toLowerCase())) {
          headingMap[key].bullets.push(bulletText);
          existingLower.push(bulletText.toLowerCase());
        }
      }
    } else {
      // Brand-new section
      headingMap[key] = {
        heading: section.heading,
        bullets: section.bullets.map(b => (typeof b === 'object' ? b.text : b))
      };
      orderedKeys.push(key);
    }
  }

  // Step 3 — delete all existing top-level blocks
  for (const block of existingBlocks) {
    await archiveBlock(block.id);
  }

  // Step 4 — re-post the merged content
  const mergedSections = orderedKeys.map(key => ({
    heading: headingMap[key].heading,
    bullets: headingMap[key].bullets
  }));

  const mergedBlocks = buildContentBlocks(mergedSections);

  const response = await notionFetch(`blocks/${pageId}/children`, {
    method: 'PATCH',
    body: JSON.stringify({ children: mergedBlocks })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Re-posting merged content failed: ${JSON.stringify(err)}`);
  }
};

// ---------------------------------------------------------------------------
// Test assertion helpers
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Count how many heading_2 blocks have the given text (case-insensitive).
 */
const countHeadings = (blocks, headingText) =>
  blocks.filter(b =>
    b.type === 'heading_2' &&
    (b.heading_2?.rich_text?.[0]?.text?.content || '').toLowerCase() ===
    headingText.toLowerCase()
  ).length;

/**
 * Collect all bulleted_list_item text values that appear after the FIRST
 * heading matching `headingText` and before the next heading_2 or divider.
 */
const bulletsUnderHeading = (blocks, headingText) => {
  const bullets = [];
  let collecting = false;
  for (const block of blocks) {
    if (block.type === 'heading_2') {
      const text = block.heading_2?.rich_text?.[0]?.text?.content || '';
      if (text.toLowerCase() === headingText.toLowerCase()) {
        collecting = true;
      } else if (collecting) {
        break; // next heading — stop collecting
      }
    } else if (block.type === 'divider' && collecting) {
      break;
    } else if (block.type === 'bulleted_list_item' && collecting) {
      bullets.push(block.bulleted_list_item?.rich_text?.[0]?.text?.content || '');
    }
  }
  return bullets;
};

// ---------------------------------------------------------------------------
// Main test
// ---------------------------------------------------------------------------

const runTest = async () => {
  const timestamp = Date.now();
  const topic = `Smart Merge Test [${timestamp}]`;
  let passed = true;
  const failures = [];

  const fail = (msg) => { passed = false; failures.push(msg); };

  console.log('');
  console.log('=== Smart Merge End-to-End Test ===');
  console.log(`Topic : ${topic}`);
  console.log(`DB ID : ${dbId}`);
  console.log('');

  // -------------------------------------------------------------------------
  // Step (a): Create the page with initial "Hooks" section
  // -------------------------------------------------------------------------
  console.log('Step (a): Creating page with Hooks: [useState, useEffect] ...');
  let page;
  try {
    page = await createPage(topic, [], [
      { heading: 'Hooks', bullets: ['useState', 'useEffect'] }
    ]);
    console.log(`  Created page ID : ${page.id}`);
    console.log(`  URL             : ${page.url}`);
  } catch (err) {
    fail(`Failed to create page: ${err.message}`);
    console.error('FATAL: cannot continue without a page.');
    console.log('');
    console.log('RESULT: FAIL');
    failures.forEach(f => console.log(`  - ${f}`));
    return;
  }

  // -------------------------------------------------------------------------
  // Step (b): Wait 1 second
  // -------------------------------------------------------------------------
  console.log('Step (b): Waiting 1 second ...');
  await sleep(1000);

  // -------------------------------------------------------------------------
  // Step (c): Merge with same topic, "Hooks" section containing ["useContext"]
  // -------------------------------------------------------------------------
  console.log('Step (c): Merging Hooks: [useContext] into existing page ...');
  try {
    await smartAppendToPage(page.id, [
      { heading: 'Hooks', bullets: ['useContext'] }
    ]);
    console.log('  Merge complete.');
  } catch (err) {
    fail(`smartAppendToPage threw: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Step (d): Fetch final blocks and verify
  // -------------------------------------------------------------------------
  console.log('Step (d): Fetching final page blocks and verifying ...');
  await sleep(500); // small pause for Notion to settle
  const finalBlocks = await fetchPageBlocks(page.id);
  console.log(`  Total top-level blocks fetched: ${finalBlocks.length}`);

  // Assertion 1 — exactly ONE "Hooks" heading
  const hooksHeadingCount = countHeadings(finalBlocks, 'Hooks');
  console.log(`  "Hooks" heading count : ${hooksHeadingCount} (expected: 1)`);
  if (hooksHeadingCount !== 1) {
    fail(`Expected exactly 1 "Hooks" heading, found ${hooksHeadingCount}`);
  }

  // Assertion 2 — all 3 bullets present under "Hooks"
  const bullets = bulletsUnderHeading(finalBlocks, 'Hooks');
  console.log(`  Bullets under "Hooks" : ${JSON.stringify(bullets)}`);

  const expected = ['useState', 'useEffect', 'useContext'];
  for (const item of expected) {
    if (!bullets.includes(item)) {
      fail(`Missing bullet "${item}" under "Hooks" heading`);
    }
  }

  // Assertion 3 — no spurious extra bullets
  const unexpected = bullets.filter(b => !expected.includes(b));
  if (unexpected.length > 0) {
    fail(`Unexpected extra bullets under "Hooks": ${JSON.stringify(unexpected)}`);
  }

  // -------------------------------------------------------------------------
  // Step (e): Print PASS / FAIL with details
  // -------------------------------------------------------------------------
  console.log('');
  if (passed) {
    console.log('RESULT: PASS');
    console.log('  - Exactly one "Hooks" heading found.');
    console.log(`  - All 3 expected bullets present: ${expected.join(', ')}`);
    console.log('  - No duplicate headings or unexpected bullets.');
  } else {
    console.log('RESULT: FAIL');
    failures.forEach(f => console.log(`  - ${f}`));
  }

  console.log('');
  console.log(`Page URL: ${page.url}`);
};

runTest().catch(err => {
  console.error('');
  console.error('Unhandled error during test:', err.message);
  process.exit(1);
});
