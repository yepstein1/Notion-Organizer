// Backend API client for processing and syncing notes

const API_BASE = process.env.REACT_APP_API_BASE || '';

export const exchangeNotionCode = async (code, redirectUri) => {
  const response = await fetch(`${API_BASE}/api/notion/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirectUri })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'OAuth token exchange failed');
  return data;
};

export const syncNotesWithBackend = async (scratchpadContent, databaseId, options = {}) => {
  const { maxReviewIterations = 1, skipSync = false, styleExample = null, userFeedback = '', currentPages = null, notionToken = null } = options;

  const response = await fetch(`${API_BASE}/api/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      scratchpadContent,
      databaseId,
      maxReviewIterations,
      skipSync,
      styleExample,
      userFeedback,
      currentPages,
      notionToken
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Sync failed');
  }

  return data;
};

export const undoLastSync = async (undoData, notionToken = null) => {
  const response = await fetch(`${API_BASE}/api/undo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ undoData, notionToken })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Undo failed');
  return data;
};

export const testNotionConnection = async (databaseId, notionToken = null) => {
  const response = await fetch(`${API_BASE}/api/notion/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      databaseId,
      notionToken
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Connection test failed');
  }

  return data.ok === true;
};
