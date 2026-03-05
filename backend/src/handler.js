const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

const NOTION_API_VERSION = process.env.NOTION_API_VERSION || '2022-06-28';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const NOTION_TAGS_PROPERTY_TYPE = process.env.NOTION_TAGS_PROPERTY_TYPE || 'multi_select';
const MAX_EXISTING_CONTEXT_CHARS = 6000;
const MAX_INPUT_CHARS = 20000;
const SECTION_MATCH_THRESHOLD = 0.4;
const STOP_WORDS = new Set(['and', 'or', 'the', 'a', 'an', 'of', 'in', 'for', 'to', 'with', 'by', 'on', 'at']);

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    ...corsHeaders
  },
  body: JSON.stringify(body)
});

const readJsonBody = (event) => {
  if (!event.body) {
    return null;
  }

  try {
    return JSON.parse(event.body);
  } catch (error) {
    return null;
  }
};

// ─── Retry helper ──────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async (fn, options = {}) => {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    retryOn = (error) => {
      const msg = error.message || '';
      return msg.includes('fetch failed') ||
             msg.includes('429') ||
             msg.includes('529') ||
             msg.includes(' 500') ||
             msg.includes(' 502') ||
             msg.includes(' 503');
    }
  } = options;

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts || !retryOn(error)) {
        throw error;
      }
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(`Attempt ${attempt} failed: ${error.message}. Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw lastError;
};

// ─── Fuzzy section matching ────────────────────────────────────────────────────

const tokenize = (heading) =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));

const jaccardSimilarity = (tokensA, tokensB) => {
  if (tokensA.length === 0 && tokensB.length === 0) return 1;
  const a = new Set(tokensA);
  const b = new Set(tokensB);
  const intersection = [...a].filter(x => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
};

const findMatchingSection = (headingMap, newHeading) => {
  const newTokens = tokenize(newHeading);
  let bestKey = null;
  let bestScore = SECTION_MATCH_THRESHOLD;
  for (const key of Object.keys(headingMap)) {
    const existingTokens = tokenize(headingMap[key].heading);
    const score = jaccardSimilarity(newTokens, existingTokens);
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }
  return bestKey;
};

// ─── AI prompts ────────────────────────────────────────────────────────────────

const buildPrompt = (scratchpadContent, existingStructure = {}, styleExample = null) => {
  const hasExisting = Object.keys(existingStructure).length > 0;
  let existingContext = '';

  if (hasExisting) {
    const lines = [];
    let totalChars = 0;

    for (const [topic, sections] of Object.entries(existingStructure)) {
      if (sections && typeof sections === 'object' && !Array.isArray(sections)) {
        // Rich format: { "Hooks": ["useState - ...", "useEffect - ..."], ... }
        const sectionLines = [];
        for (const [heading, bullets] of Object.entries(sections)) {
          const bulletLines = bullets.slice(0, 5).map(b => `    - ${b}`).join('\n');
          sectionLines.push(`  - "${heading}":\n${bulletLines}`);
        }
        const topicBlock = `"${topic}" page:\n${sectionLines.join('\n')}`;
        if (totalChars + topicBlock.length > MAX_EXISTING_CONTEXT_CHARS) {
          lines.push(`"${topic}" page: [truncated — too large to include in full]`);
          break;
        }
        lines.push(topicBlock);
        totalChars += topicBlock.length;
      } else if (Array.isArray(sections)) {
        // Legacy format: array of heading names
        lines.push(`"${topic}" page has sections: [${sections.join(', ')}]`);
      }
    }

    existingContext = `\n\nEXISTING KNOWLEDGE BASE:\n${lines.join('\n\n')}\n\n` +
      `IMPORTANT:\n` +
      `1. Use the EXACT existing section names when content belongs there.\n` +
      `2. Do NOT suggest content that already appears in the existing bullets above.\n` +
      `3. Only add genuinely new information.`;
  }

  let styleExampleBlock = '';
  if (styleExample && styleExample.description && styleExample.description.trim()) {
    styleExampleBlock = `\n\nUSER STYLE REQUIREMENTS (MANDATORY — these override ALL default instructions including the JSON schema example and formatting steps below):
${styleExample.description.trim()}

You MUST follow the above requirements even if they contradict the example format or steps below.
`;
  }

  return `You are organizing learning notes into a structured knowledge base.

Take these scratchpad notes and organize them:

${scratchpadContent}${existingContext}${styleExampleBlock}
STEP 1 - Identify the topic and choose organization strategy:
- If USER STYLE REQUIREMENTS are provided above, apply them faithfully — they take precedence over everything below
- If it's a well-documented technology (React, Python, AWS, etc.), organize content the way its OFFICIAL DOCUMENTATION does
  - React: Group all hooks together, all components together, etc.
  - Python: Group decorators together, comprehensions together, etc.
  - AWS: Group by service, then by operation type
- If it's an academic subject (Biology, History, Math), organize like a TEXTBOOK would
- If no clear standard exists, use FALLBACK principles: simple→complex, chronological, or categorical grouping

STEP 2 - Group by TYPE, not by purpose:
- WRONG: Separate sections for "State Management", "Side Effects", "Performance" with hooks scattered
- CORRECT: One "Hooks" section containing useState, useEffect, useReducer, useCallback together

STEP 3 - Format items according to USER STYLE REQUIREMENTS above (if provided). Otherwise:
- Use sub-bullets for related items that have parent/child relationships
- Use simple strings for standalone points, objects with "children" for nested items

Return JSON format:
{
  "organizationMethod": "official-docs" | "textbook" | "fallback",
  "organizationReason": "Brief explanation of why this method was chosen",
  "pages": [
    {
      "topic": "React",
      "tags": ["JavaScript", "Frontend", "Hooks"],
      "sections": [
        {
          "heading": "Hooks",
          "itemType": "bullet",
          "bullets": [
            "useState - manages local component state",
            {
              "text": "useEffect - handles side effects",
              "children": [
                "Runs after every render by default",
                "Return a cleanup function to avoid memory leaks"
              ]
            }
          ]
        }
      ],
      "relatedTopics": ["JavaScript", "TypeScript"]
    }
  ]
}

The "itemType" field on each section controls how items are rendered:
- "bullet" — bulleted list (default)
- "numbered" — numbered list
- "paragraph" — plain paragraph text, no list markers
- "callout" — highlighted callout box with 💡 icon, good for key takeaways or important notes
- "quote" — indented quote block, good for definitions or cited material
- "toggle" — collapsible toggle, good for detailed explanations or optional deep-dives (children become the hidden content)

Choose itemType based on the content's purpose and any USER STYLE REQUIREMENTS.

If content spans multiple topics, split into separate pages.`;
};

// ─── JSON parsing ──────────────────────────────────────────────────────────────

const extractJson = (text) => {
  // Strategy 1: Extract from ```json ... ``` or ``` ... ``` code fence
  const fenceMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (fenceMatch) return fenceMatch[1];
  // Strategy 2: Greedy brace match (handles raw JSON)
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) return braceMatch[0];
  return null;
};

const parseStructuredPages = (aiText) => {
  const jsonText = extractJson(aiText);
  if (!jsonText) {
    throw new Error(`AI response contained no JSON. Raw (first 200 chars): ${aiText.slice(0, 200)}`);
  }

  let structured;
  try {
    structured = JSON.parse(jsonText);
  } catch (e) {
    throw new Error(`AI response JSON malformed: ${e.message}. JSON (first 300 chars): ${jsonText.slice(0, 300)}`);
  }

  if (!Array.isArray(structured.pages)) {
    throw new Error('AI response missing "pages" array');
  }
  if (structured.pages.length === 0) {
    throw new Error('No pages generated from content');
  }
  for (const page of structured.pages) {
    if (!page.topic || typeof page.topic !== 'string') {
      throw new Error(`Page missing "topic" field: ${JSON.stringify(page).slice(0, 100)}`);
    }
    if (!Array.isArray(page.sections)) page.sections = [];
  }

  return {
    pages: structured.pages,
    organizationMethod: structured.organizationMethod || 'unknown',
    organizationReason: structured.organizationReason || ''
  };
};

const buildReviewPrompt = (scratchpadContent, currentOrganization) => `You are reviewing an AI-organized knowledge base for quality.

ORIGINAL NOTES:
${scratchpadContent}

CURRENT ORGANIZATION:
${JSON.stringify(currentOrganization, null, 2)}

Review the organization and identify issues:
1. Is any content from the original notes MISSING or significantly altered?
2. Are similar/related items properly GROUPED together (not scattered)?
3. Is the organizationMethod appropriate for this content type?
4. Are there any obvious improvements to section headings or structure?

Return JSON:
{
  "issues": [
    { "type": "missing_content" | "poor_grouping" | "wrong_method" | "structure", "description": "..." }
  ],
  "needsRevision": true | false,
  "suggestedFixes": "Brief description of what to fix, or empty if none"
}

Be strict - only set needsRevision to true if there are genuine problems.`;

const buildRefinePrompt = (scratchpadContent, currentOrganization, reviewFeedback) => `You are refining an AI-organized knowledge base based on review feedback.

ORIGINAL NOTES:
${scratchpadContent}

CURRENT ORGANIZATION:
${JSON.stringify(currentOrganization, null, 2)}

REVIEW FEEDBACK:
${reviewFeedback}

Fix the identified issues and return the improved organization in the same JSON format:
{
  "organizationMethod": "official-docs" | "textbook" | "fallback",
  "organizationReason": "Brief explanation",
  "pages": [...]
}

Keep what works well, only fix the identified problems.`;

const parseReviewResponse = (aiText) => {
  const jsonText = extractJson(aiText);
  if (!jsonText) return { issues: [], needsRevision: false, suggestedFixes: '' };
  try {
    const parsed = JSON.parse(jsonText);
    return {
      issues: parsed.issues || [],
      needsRevision: parsed.needsRevision || false,
      suggestedFixes: parsed.suggestedFixes || ''
    };
  } catch (e) {
    return { issues: [], needsRevision: false, suggestedFixes: '' };
  }
};

// ─── Anthropic API ─────────────────────────────────────────────────────────────

const callAnthropic = async (anthropicKey, prompt) => {
  return withRetry(async () => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (response.status === 429 || response.status === 529 || response.status >= 500) {
      const errorText = await response.text();
      throw new Error(`Anthropic HTTP ${response.status}: ${errorText}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic request failed: ${errorText}`);
    }

    const data = await response.json();
    return data.content?.find(block => block.type === 'text')?.text || '';
  }, { maxAttempts: 3, baseDelayMs: 1000 });
};

const reviewAndRefine = async (anthropicKey, scratchpadContent, currentOrganization, maxIterations = 1) => {
  let organization = currentOrganization;
  let iterationsUsed = 0;
  let lastReview = null;

  try {
    for (let i = 0; i < maxIterations; i++) {
      const reviewPrompt = buildReviewPrompt(scratchpadContent, organization);
      const reviewText = await callAnthropic(anthropicKey, reviewPrompt);
      const review = parseReviewResponse(reviewText);
      lastReview = review;
      iterationsUsed++;

      if (!review.needsRevision) {
        break;
      }

      const refinePrompt = buildRefinePrompt(scratchpadContent, organization, review.suggestedFixes);
      const refineText = await callAnthropic(anthropicKey, refinePrompt);

      try {
        const refined = parseStructuredPages(refineText);
        organization = {
          pages: refined.pages,
          organizationMethod: refined.organizationMethod,
          organizationReason: refined.organizationReason
        };
      } catch (e) {
        console.error('Refinement parsing failed:', e.message);
        lastReview = { ...lastReview, refinementParsingError: e.message };
        break;
      }
    }
  } catch (reviewError) {
    // Review loop failed — return original organization unchanged
    console.error('Review loop failed, using initial organization:', reviewError.message);
  }

  return {
    organization,
    iterationsUsed,
    lastReview,
    canRefineMore: lastReview?.needsRevision || false
  };
};

// ─── Notion content blocks ─────────────────────────────────────────────────────

const buildContentBlocks = (sections) => {
  const blocks = [];

  for (const section of sections) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{
          type: 'text',
          text: { content: section.heading }
        }]
      }
    });

    const sectionBullets = Array.isArray(section.bullets) ? section.bullets
      : Array.isArray(section.items) ? section.items
      : Array.isArray(section.content) ? section.content
      : [];
    const sectionType = section.itemType || 'bullet';

    for (const bullet of sectionBullets) {
      const isNested = typeof bullet === 'object' && bullet !== null && bullet.text;
      const bulletText = isNested ? bullet.text : bullet;

      let block;

      if (sectionType === 'callout') {
        block = {
          object: 'block',
          type: 'callout',
          callout: {
            rich_text: [{ type: 'text', text: { content: bulletText } }],
            icon: { type: 'emoji', emoji: '💡' }
          }
        };
      } else if (sectionType === 'quote') {
        block = {
          object: 'block',
          type: 'quote',
          quote: {
            rich_text: [{ type: 'text', text: { content: bulletText } }]
          }
        };
      } else if (sectionType === 'toggle') {
        block = {
          object: 'block',
          type: 'toggle',
          toggle: {
            rich_text: [{ type: 'text', text: { content: bulletText } }],
            children: isNested && bullet.children?.length > 0
              ? bullet.children.map(child => ({
                  object: 'block',
                  type: 'paragraph',
                  paragraph: { rich_text: [{ type: 'text', text: { content: child } }] }
                }))
              : []
          }
        };
      } else {
        const notionType = sectionType === 'numbered' ? 'numbered_list_item'
          : sectionType === 'paragraph' ? 'paragraph'
          : 'bulleted_list_item';

        block = {
          object: 'block',
          type: notionType,
          [notionType]: {
            rich_text: [{ type: 'text', text: { content: bulletText } }]
          }
        };

        if (isNested && bullet.children?.length > 0 && notionType !== 'paragraph') {
          block[notionType].children = bullet.children.map(child => ({
            object: 'block',
            type: notionType,
            [notionType]: { rich_text: [{ type: 'text', text: { content: child } }] }
          }));
        }
      }

      blocks.push(block);
    }
  }

  return blocks;
};

// ─── Notion API helpers ────────────────────────────────────────────────────────

const notionFetch = async (path, token, options = {}) => {
  const response = await fetch(`https://api.notion.com/v1/${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': NOTION_API_VERSION,
      ...(options.headers || {})
    }
  });

  return response;
};

const findPageByTitle = async (token, databaseId, title) => {
  const response = await notionFetch(`databases/${databaseId}/query`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

const appendToPage = async (token, pageId, contentBlocks) => {
  const response = await notionFetch(`blocks/${pageId}/children`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      children: [
        { object: 'block', type: 'divider', divider: {} },
        ...contentBlocks
      ]
    })
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`Notion append failed: ${JSON.stringify(errorBody)}`);
  }
};

const createPage = async (token, databaseId, topic, tags, contentBlocks) => {
  const properties = {
    Name: {
      title: [{ text: { content: topic } }]
    }
  };

  if (tags && tags.length > 0) {
    if (NOTION_TAGS_PROPERTY_TYPE === 'multi_select') {
      properties.Tags = {
        multi_select: tags.map(tag => ({ name: tag.trim() }))
      };
    } else {
      properties.Tags = {
        rich_text: [{ text: { content: tags.join(', ') } }]
      };
    }
  }

  const response = await notionFetch('pages', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
      children: contentBlocks
    })
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`Notion page creation failed: ${JSON.stringify(errorBody)}`);
  }

  return await response.json();
};

// Paginated block fetching — handles pages with more than 100 blocks
const fetchPageBlocks = async (token, pageId) => {
  const allResults = [];
  let cursor = undefined;
  do {
    const params = cursor ? `?start_cursor=${encodeURIComponent(cursor)}` : '';
    const response = await notionFetch(`blocks/${pageId}/children${params}`, token, { method: 'GET' });
    if (!response.ok) break;
    const data = await response.json();
    allResults.push(...(data.results || []));
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return allResults;
};

const fetchExistingStructure = async (token, databaseId) => {
  const response = await notionFetch(`databases/${databaseId}/query`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page_size: 20 })
  });
  if (!response.ok) return {};
  const data = await response.json();
  const structure = {};

  for (const page of (data.results || []).slice(0, 10)) {
    const title = page.properties?.Name?.title?.[0]?.text?.content || '';
    if (!title) continue;

    const blocks = await fetchPageBlocks(token, page.id);
    let currentSection = null;
    const sections = {};

    for (const block of blocks) {
      if (block.type === 'heading_2') {
        const heading = block.heading_2?.rich_text?.[0]?.text?.content || '';
        if (heading) {
          currentSection = heading;
          sections[heading] = [];
        }
      } else if (block.type === 'bulleted_list_item' && currentSection) {
        const text = block.bulleted_list_item?.rich_text?.[0]?.text?.content || '';
        if (text && sections[currentSection].length < 5) {
          sections[currentSection].push(text);
        }
      }
    }

    if (Object.keys(sections).length > 0) structure[title] = sections;
  }

  return structure;
};

// ─── Smart merge helpers ───────────────────────────────────────────────────────

const getBulletText = (bullet) =>
  typeof bullet === 'object' && bullet !== null ? bullet.text : bullet;

const fetchBulletWithChildren = async (token, block) => {
  const text = block.bulleted_list_item?.rich_text?.[0]?.text?.content || '';
  if (!block.has_children) return text;
  const childBlocks = await fetchPageBlocks(token, block.id);
  const children = childBlocks
    .filter(b => b.type === 'bulleted_list_item')
    .map(b => b.bulleted_list_item?.rich_text?.[0]?.text?.content || '')
    .filter(Boolean);
  return children.length > 0 ? { text, children } : text;
};

const buildHeadingMap = async (token, blocks) => {
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
        currentKey = null; // duplicate heading — skip
      }
    } else if (block.type === 'bulleted_list_item' && currentKey) {
      const bulletData = await fetchBulletWithChildren(token, block);
      map[currentKey].bullets.push(bulletData);
    }
  }

  return map;
};

const archiveBlock = async (token, blockId) => {
  await notionFetch(`blocks/${blockId}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ archived: true })
  });
};

const mergeNewBulletsIntoSection = (existingEntry, newBullets) => {
  const existingLower = existingEntry.bullets.map(b => getBulletText(b).toLowerCase());
  let added = 0;
  for (const bullet of newBullets) {
    const bulletText = getBulletText(bullet);
    if (!existingLower.includes(bulletText.toLowerCase())) {
      existingEntry.bullets.push(bullet); // push full object to preserve nesting
      existingLower.push(bulletText.toLowerCase());
      added++;
    }
  }
  return added;
};

const smartAppendToPage = async (token, pageId, sections) => {
  // Step 1: Read current state (paginated, with nested bullet children)
  const existingBlocks = await fetchPageBlocks(token, pageId);
  const headingMap = await buildHeadingMap(token, existingBlocks);
  const orderedKeys = Object.keys(headingMap);

  // SAFETY: Snapshot current content for rollback before any destructive operations
  const backupSections = orderedKeys.map(key => ({
    heading: headingMap[key].heading,
    bullets: [...headingMap[key].bullets]
  }));

  // Step 2: Merge in memory using fuzzy section name matching
  let bulletsAdded = 0;
  let sectionsCreated = 0;
  let sectionsMerged = 0;

  for (const section of sections) {
    if (!section.heading) continue;
    const matchKey = findMatchingSection(headingMap, section.heading);
    if (matchKey) {
      const added = mergeNewBulletsIntoSection(headingMap[matchKey], section.bullets || []);
      bulletsAdded += added;
      sectionsMerged++;
    } else {
      const key = section.heading.toLowerCase();
      headingMap[key] = {
        heading: section.heading,
        bullets: section.bullets || []
      };
      orderedKeys.push(key);
      sectionsCreated++;
      bulletsAdded += (section.bullets || []).length;
    }
  }

  // Step 3: Archive all existing top-level blocks
  for (const block of existingBlocks) {
    await archiveBlock(token, block.id);
  }

  // Step 4: Repost the fully merged content — with rollback on failure
  const mergedSections = orderedKeys.map(key => ({
    heading: headingMap[key].heading,
    bullets: headingMap[key].bullets
  }));

  try {
    const response = await notionFetch(`blocks/${pageId}/children`, token, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ children: buildContentBlocks(mergedSections) })
    });
    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(`Notion append failed: ${JSON.stringify(errorBody)}`);
    }
  } catch (writeError) {
    // ROLLBACK: attempt to restore pre-merge content
    console.error('Write failed, attempting rollback:', writeError.message);
    try {
      const rollbackResponse = await notionFetch(`blocks/${pageId}/children`, token, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ children: buildContentBlocks(backupSections) })
      });
      if (rollbackResponse.ok) {
        throw new Error(`Merge write failed (original content restored): ${writeError.message}`);
      } else {
        const rb = await rollbackResponse.json().catch(() => ({}));
        throw new Error(
          `CRITICAL: Merge write failed AND rollback failed (${JSON.stringify(rb)}). ` +
          `Backup: ${JSON.stringify(backupSections)}. Original error: ${writeError.message}`
        );
      }
    } catch (rollbackError) {
      if (rollbackError.message.startsWith('CRITICAL:') ||
          rollbackError.message.startsWith('Merge write failed')) {
        throw rollbackError;
      }
      throw new Error(
        `CRITICAL: Merge write failed AND rollback threw: ${rollbackError.message}. ` +
        `Backup: ${JSON.stringify(backupSections)}`
      );
    }
  }

  return { bulletsAdded, sectionsCreated, sectionsMerged, backup: backupSections };
};

const createOrUpdatePage = async (token, databaseId, pageData) => {
  const existingPage = await findPageByTitle(token, databaseId, pageData.topic);

  if (existingPage) {
    const mergeStats = await smartAppendToPage(token, existingPage.id, pageData.sections || []);
    return { action: 'updated', topic: pageData.topic, pageId: existingPage.id, ...mergeStats };
  }

  const newPage = await createPage(
    token, databaseId, pageData.topic, pageData.tags || [],
    buildContentBlocks(pageData.sections || [])
  );
  return { action: 'created', topic: pageData.topic, pageId: newPage.id, pageUrl: newPage.url, backup: null };
};

// ─── Route handlers ────────────────────────────────────────────────────────────

const handleUndo = async (event) => {
  const body = readJsonBody(event);
  const token = process.env.NOTION_TOKEN;
  const undoData = body && body.undoData;

  if (!token) return jsonResponse(500, { error: 'Missing NOTION_TOKEN' });
  if (!Array.isArray(undoData) || undoData.length === 0) return jsonResponse(400, { error: 'Missing undoData' });

  const results = await Promise.allSettled(undoData.map(async (entry) => {
    if (entry.action === 'created') {
      // Archive the page that was created
      await notionFetch(`pages/${entry.pageId}`, token, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true })
      });
      return { topic: entry.topic, undone: 'deleted' };
    } else {
      // Restore previous content: clear current blocks, re-write backup
      const currentBlocks = await fetchPageBlocks(token, entry.pageId);
      await Promise.all(currentBlocks.map(b => archiveBlock(token, b.id)));
      if (entry.backup && entry.backup.length > 0) {
        await notionFetch(`blocks/${entry.pageId}/children`, token, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ children: buildContentBlocks(entry.backup) })
        });
      }
      return { topic: entry.topic, undone: 'restored' };
    }
  }));

  const succeeded = results.filter(r => r.status === 'fulfilled').map(r => r.value);
  const failed = results.filter(r => r.status === 'rejected').map(r => r.reason?.message);
  return jsonResponse(200, { succeeded, failed: failed.length > 0 ? failed : undefined });
};

const handleHealth = () => jsonResponse(200, { status: 'ok' });

const handleTestConnection = async (event) => {
  const body = readJsonBody(event);
  const databaseId = (body && body.databaseId) || process.env.NOTION_DATABASE_ID;
  const token = process.env.NOTION_TOKEN;

  if (!token) {
    return jsonResponse(500, { error: 'Missing NOTION_TOKEN in environment' });
  }

  if (!databaseId) {
    return jsonResponse(400, { error: 'Missing databaseId' });
  }

  const response = await notionFetch(`databases/${databaseId}`, token, { method: 'GET' });

  if (response.ok) {
    return jsonResponse(200, { ok: true });
  }

  let errorBody = null;
  try {
    errorBody = await response.json();
  } catch (error) {
    errorBody = await response.text();
  }

  return jsonResponse(200, {
    ok: false,
    status: response.status,
    details: errorBody
  });
};

const handleSync = async (event) => {
  const body = readJsonBody(event);
  const token = process.env.NOTION_TOKEN;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const databaseId = (body && body.databaseId) || process.env.NOTION_DATABASE_ID;
  const scratchpadContent = body && body.scratchpadContent;
  const maxReviewIterations = (body && body.maxReviewIterations) || 1;
  const skipSync = body && body.skipSync;
  const styleExample = (body && body.styleExample) || null;
  const userFeedback = (body && body.userFeedback) || '';
  const currentPages = (body && body.currentPages) || null;

  if (!token) {
    return jsonResponse(500, { error: 'Missing NOTION_TOKEN in environment' });
  }

  if (!anthropicKey) {
    return jsonResponse(500, { error: 'Missing ANTHROPIC_API_KEY in environment' });
  }

  if (!databaseId) {
    return jsonResponse(400, { error: 'Missing databaseId' });
  }

  if (!scratchpadContent || !scratchpadContent.trim()) {
    return jsonResponse(400, { error: 'Missing scratchpadContent' });
  }

  if (scratchpadContent.length > MAX_INPUT_CHARS) {
    return jsonResponse(400, {
      error: 'Scratchpad content too large',
      details: `Content is ${scratchpadContent.length} characters. Maximum is ${MAX_INPUT_CHARS}.`,
      suggestion: 'Break your notes into smaller batches and sync separately.'
    });
  }

  // Fast-refine shortcut: if user provided feedback + current pages, skip full pipeline
  if (userFeedback && currentPages) {
    let refineText;
    try {
      refineText = await callAnthropic(
        anthropicKey,
        buildRefinePrompt(scratchpadContent, { pages: currentPages }, userFeedback)
      );
    } catch (error) {
      return jsonResponse(502, { error: 'Anthropic request failed', details: error.message });
    }

    let refineParsed;
    try {
      refineParsed = parseStructuredPages(refineText);
    } catch (error) {
      return jsonResponse(502, { error: 'Failed to parse AI response', details: error.message });
    }

    return jsonResponse(200, {
      preview: true,
      pages: refineParsed.pages,
      organizationMethod: refineParsed.organizationMethod,
      organizationReason: refineParsed.organizationReason,
      reviewIterations: 0,
      canRefineMore: false,
      reviewFeedback: []
    });
  }

  // Step 0: Fetch existing page structure so AI can match section names and avoid duplicates
  let existingStructure = {};
  try {
    existingStructure = await fetchExistingStructure(token, databaseId);
  } catch (e) {
    // Non-critical — proceed without context
    console.warn('Could not fetch existing structure:', e.message);
  }

  // Step 1: Initial organization
  let aiText;
  try {
    aiText = await callAnthropic(anthropicKey, buildPrompt(scratchpadContent, existingStructure, styleExample));
  } catch (error) {
    return jsonResponse(502, { error: 'Anthropic request failed', details: error.message });
  }

  let parsed;
  try {
    parsed = parseStructuredPages(aiText);
  } catch (error) {
    return jsonResponse(502, { error: 'Failed to parse AI response', details: error.message });
  }

  const { pages, organizationMethod, organizationReason } = parsed;

  // Step 2: Sync all pages to Notion in parallel
  const pageResults = await Promise.allSettled(
    pages.map(page => createOrUpdatePage(token, databaseId, page))
  );

  const results = [];
  const errors = [];

  for (let i = 0; i < pageResults.length; i++) {
    const outcome = pageResults[i];
    if (outcome.status === 'fulfilled') {
      results.push(outcome.value);
    } else {
      errors.push({ topic: pages[i].topic, error: outcome.reason?.message || 'Unknown error' });
    }
  }

  return jsonResponse(200, {
    results,
    pagesCount: results.length,
    organizationMethod,
    organizationReason,
    reviewIterations: 1,
    canRefineMore: false,
    errors: errors.length > 0 ? errors : undefined
  });
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  const path = event.path || '';

  try {
    if (event.httpMethod === 'GET' && path.endsWith('/api/health')) {
      return handleHealth();
    }

    if (event.httpMethod === 'POST' && path.endsWith('/api/notion/test')) {
      return await handleTestConnection(event);
    }

    if (event.httpMethod === 'POST' && path.endsWith('/api/sync')) {
      return await handleSync(event);
    }

    if (event.httpMethod === 'POST' && path.endsWith('/api/undo')) {
      return await handleUndo(event);
    }

    return jsonResponse(404, { error: 'Not found' });
  } catch (error) {
    return jsonResponse(500, { error: 'Unexpected error', details: error.message });
  }
};
