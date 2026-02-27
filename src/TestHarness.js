import React, { useState } from 'react';
const API_BASE = process.env.REACT_APP_API_BASE || '';
const DATABASE_ID = process.env.REACT_APP_DATABASE_ID || '';

const DEFAULT_TEST_INPUTS = [
  {
    id: 'many-topics',
    label: 'Many Topics',
    text: `Mitochondria are the powerhouse of the cell, producing ATP through cellular respiration.\nThe cell membrane is a phospholipid bilayer that controls what enters and exits.\nDNA stores genetic information in the nucleus.\nPython decorators are functions that modify other functions.\n@staticmethod makes a method that doesn't receive self.\nuseState is for local state in React.\nuseEffect handles side effects.`,
  },
  {
    id: 'one-topic-subtopics',
    label: 'One Topic, Subtopics',
    text: `React hooks: useState for local state, useEffect for side effects, useReducer for complex state.\nReact context: useContext for global state, Context avoids prop drilling.\nPerformance: useMemo caches computed values, useCallback memoizes functions.`,
  },
  {
    id: 'incremental',
    label: 'Incremental Addition',
    text: `useContext provides access to context value.`,
    extra: `Context avoids prop drilling for deeply nested components.\nContext.Provider wraps components to supply value.`,
  },
  // ── Style Example test cases ─────────────────────────────────────────────────
  {
    id: 'style-flat-bullets',
    label: 'Style Example — Flat bullets (no nesting)',
    text: `SQL joins: INNER JOIN returns matching rows from both tables. LEFT JOIN returns all rows from left table, NULLs for non-matches on the right. CROSS JOIN is a cartesian product. GROUP BY aggregates rows sharing a column value. HAVING filters groups after aggregation, unlike WHERE which filters rows before.`,
    styleExample: {
      rawNotes: `HTTP methods: GET fetches a resource. POST creates a new resource. PUT replaces a resource. DELETE removes a resource. PATCH partially updates a resource.`,
      organizedOutput: `## HTTP Methods\n- GET — fetch a resource (read-only, idempotent)\n- POST — create a new resource\n- PUT — replace a resource entirely (idempotent)\n- PATCH — partial update\n- DELETE — remove a resource`,
    },
  },
  {
    id: 'style-term-definition',
    label: 'Style Example — Term: definition format',
    text: `Async/await in JS: async functions always return a promise. await pauses execution until the promise resolves. You can only use await inside an async function. Try/catch handles rejected promises in async/await. Promise.all runs multiple promises in parallel and waits for all to finish. Promise.race resolves/rejects with whichever promise settles first.`,
    styleExample: {
      rawNotes: `CSS box model concepts: margin is space outside the border. Padding is space inside the border. Border wraps around the padding. Content is the innermost area.`,
      organizedOutput: `## CSS Box Model\n- **Content**: innermost area where text/elements render\n- **Padding**: space between content and border (inside)\n- **Border**: line wrapping around the padding\n- **Margin**: space outside the border (between elements)`,
    },
  },
  {
    id: 'style-emoji-headings',
    label: 'Style Example — Emoji section headings',
    text: `Docker basics: An image is a read-only template. A container is a running instance of an image. Dockerfile defines how to build an image. docker build creates an image from a Dockerfile. docker run starts a container. docker ps lists running containers. Volumes persist data outside the container lifecycle. Networks let containers communicate.`,
    styleExample: {
      rawNotes: `Git basics: commits save a snapshot of your code. Branches let you work on features in isolation. Merging combines branch changes. Rebasing rewrites commit history onto a new base.`,
      organizedOutput: `## 📸 Saving Work\n- Commits — snapshot of the repo at a point in time\n\n## 🌿 Branching\n- Branch — isolated line of development\n- Rebase — replay commits onto a different base\n\n## 🔀 Combining Work\n- Merge — joins branch history into current branch`,
    },
  },
  {
    id: 'style-cross-domain',
    label: 'Style Example — Cross-domain style transfer',
    text: `TypeScript: static typing catches errors at compile time. Interfaces define object shapes. Generics let functions work with multiple types. Union types allow a variable to be one of several types. Type guards narrow the type within a conditional block. The keyof operator produces a union of an object's keys.`,
    styleExample: {
      rawNotes: `Photosynthesis: light reactions happen in the thylakoid. Calvin cycle happens in the stroma. Chlorophyll absorbs red and blue light. ATP and NADPH are produced in the light reactions and used in the Calvin cycle.`,
      organizedOutput: `## Light Reactions (thylakoid)\n- Chlorophyll absorbs red + blue light\n- Produces ATP and NADPH\n\n## Calvin Cycle (stroma)\n- Uses ATP + NADPH from light reactions\n- Fixes CO₂ into glucose`,
    },
  },
  {
    id: 'style-no-style',
    label: 'Style Example — Absent (baseline, no styleExample)',
    text: `Python list comprehensions: [x*2 for x in range(10)] doubles each item. Add a condition: [x for x in range(10) if x % 2 == 0] gives even numbers. Dict comprehension: {k: v for k, v in pairs}. Set comprehension uses curly braces without the colon.`,
  },
];


export default function TestHarness() {
  const [results, setResults] = useState({});
  const [inputs, setInputs] = useState(DEFAULT_TEST_INPUTS);
  const [incremental, setIncremental] = useState(false);
  const [loading, setLoading] = useState({});

  // Generate new tests in the same style as the originals
  // Generate meaningful test content
  // Generate new content every time
  // Use AI to generate test notes for each scenario
  const generateTestNote = async (prompt) => {
    const res = await fetch(`${API_BASE}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scratchpadContent: prompt, skipSync: false, databaseId: DATABASE_ID }),
    });
    const data = await res.json();
    // Try to extract the original notes from the AI's response
    // If not possible, just return the prompt
    return prompt;
  };
  const generateMoreTests = () => {
    // Prompts for each scenario
    const prompts = [
      {
        id: 'many-topics-' + Math.random().toString(36).slice(2, 8),
        label: 'Many Topics',
        prompt: 'Generate a note containing information about several unrelated topics, such as biology, programming, and history.',
      },
      {
        id: 'one-topic-subtopics-' + Math.random().toString(36).slice(2, 8),
        label: 'One Topic, Subtopics',
        prompt: 'Generate a note about one main topic (e.g., React), but with several distinct subtopics or sections.',
      },
      {
        id: 'incremental-' + Math.random().toString(36).slice(2, 8),
        label: 'Incremental Addition',
        prompt: 'Generate a note about React useEffect, then generate a second note about useEffect that expands or adds new information. These should be combined for incremental testing.',
      },
    ];
    // Generate notes using AI
    Promise.all(prompts.map(async (p, idx) => {
      if (p.label === 'Incremental Addition') {
        // For incremental, generate two notes
        const base = await generateTestNote('Generate a note about React useEffect, focusing on its cleanup function.');
        const extra = await generateTestNote('Generate a note about React useEffect, focusing on how it updates after render and interacts with state.');
        return { ...p, text: base, extra };
      } else {
        const text = await generateTestNote(p.prompt);
        return { ...p, text };
      }
    })).then(newTests => {
      setInputs(newTests);
      setResults({});
    });
  };

  const runTest = async (id, text, extra, styleExample) => {
    setLoading(l => ({ ...l, [id]: true }));
    let content = text;
    if (incremental && extra) content += '\n' + extra;
    const res = await fetch(`${API_BASE}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scratchpadContent: content,
        skipSync: true,
        databaseId: DATABASE_ID,
        ...(styleExample ? { styleExample } : {}),
      }),
    });
    const data = await res.json();
    setResults(r => ({ ...r, [id]: data }));
    setLoading(l => ({ ...l, [id]: false }));
  };

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: 24, background: '#fff', borderRadius: 12, boxShadow: '0 4px 24px #0001' }}>
      <h2 style={{ fontSize: 32 }}>Test Harness</h2>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 18 }}>
          <input type="checkbox" checked={incremental} onChange={e => setIncremental(e.target.checked)} /> Incremental addition (for test 3)
        </label>
        <button onClick={generateMoreTests} style={{ fontSize: 18, padding: '4px 16px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #ddd', cursor: 'pointer' }}>
          Generate More Tests
        </button>
      </div>
      {inputs.map(test => (
        <div key={test.id} style={{ marginBottom: 32, borderBottom: '1px solid #eee', paddingBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 22 }}>
            {test.label}
            {test.styleExample && (
              <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 400, background: '#e0e7ff', color: '#4f46e5', borderRadius: 6, padding: '2px 8px' }}>style example active</span>
            )}
          </div>
          <pre style={{ background: '#f8fafc', padding: 18, borderRadius: 6, fontSize: 20, lineHeight: 1.5 }}>{test.text}{incremental && test.extra ? '\n' + test.extra : ''}</pre>
          <button onClick={() => runTest(test.id, test.text, test.extra, test.styleExample)} disabled={loading[test.id]} style={{ marginRight: 8, fontSize: 18, padding: '4px 16px', borderRadius: 8 }}>
            {loading[test.id] ? 'Running...' : 'Run Test'}
          </button>
          {test.id === 'incremental' && (
            <button onClick={() => runTest(test.id, test.text, undefined, undefined)} disabled={loading[test.id]} style={{ marginRight: 8, fontSize: 18, padding: '4px 16px', borderRadius: 8 }}>
              Run Initial Only
            </button>
          )}
          {results[test.id] && (
            <details style={{ marginTop: 8 }} open>
              <summary style={{ fontSize: 18 }}>Result</summary>
              <pre style={{ background: '#f1f5f9', padding: 12, borderRadius: 6, fontSize: 15 }}>{JSON.stringify(results[test.id], null, 2)}</pre>
            </details>
          )}
        </div>
      ))}
      <button onClick={() => inputs.forEach(t => runTest(t.id, t.text, t.extra, t.styleExample))} disabled={Object.values(loading).some(Boolean)} style={{ fontSize: 20, padding: '8px 24px', borderRadius: 8, background: '#e0e7ef', border: '1px solid #bbb', cursor: 'pointer' }}>
        Run All Tests
      </button>
    </div>
  );
}
