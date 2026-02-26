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

  const runTest = async (id, text, extra) => {
    setLoading(l => ({ ...l, [id]: true }));
    let content = text;
    if (incremental && extra) content += '\n' + extra;
    const res = await fetch(`${API_BASE}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scratchpadContent: content, skipSync: false, databaseId: DATABASE_ID }),
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
          <div style={{ fontWeight: 600, fontSize: 22 }}>{test.label}</div>
          <pre style={{ background: '#f8fafc', padding: 18, borderRadius: 6, fontSize: 20, lineHeight: 1.5 }}>{test.text}{incremental && test.extra ? '\n' + test.extra : ''}</pre>
          <button onClick={() => runTest(test.id, test.text, test.extra)} disabled={loading[test.id]} style={{ marginRight: 8, fontSize: 18, padding: '4px 16px', borderRadius: 8 }}>
            {loading[test.id] ? 'Running...' : 'Run Test'}
          </button>
          {test.id === 'incremental' && (
            <button onClick={() => runTest(test.id, test.text, undefined)} disabled={loading[test.id]} style={{ marginRight: 8, fontSize: 18, padding: '4px 16px', borderRadius: 8 }}>
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
      <button onClick={() => inputs.forEach(t => runTest(t.id, t.text, t.extra))} disabled={Object.values(loading).some(Boolean)} style={{ fontSize: 20, padding: '8px 24px', borderRadius: 8, background: '#e0e7ef', border: '1px solid #bbb', cursor: 'pointer' }}>
        Run All Tests
      </button>
    </div>
  );
}
