import { useEffect, useState } from 'react';
import { exchangeNotionCode } from '../utils/ai-service';
import { storage } from '../utils/storage';

// Handles the redirect back from Notion OAuth.
// Notion redirects to: /oauth/callback?code=xxx&state=xxx
export const OAuthCallback = ({ onSuccess, onError }) => {
  const [status, setStatus] = useState('Connecting to Notion...');
  const [detail, setDetail] = useState(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    console.log('[OAuthCallback] URL params:', Object.fromEntries(params));

    if (error) {
      setStatus('Authorization denied.');
      setDetail(`Notion returned error: ${error}`);
      setIsError(true);
      onError(error);
      return;
    }

    if (!code) {
      setStatus('Invalid callback — no code received.');
      setDetail(`Full URL: ${window.location.href}`);
      setIsError(true);
      onError('No authorization code in callback URL');
      return;
    }

    // Remove code from URL immediately so React Strict Mode's double-invoke doesn't fire a second exchange
    window.history.replaceState({}, document.title, '/oauth/callback');

    const redirectUri = `${window.location.origin}/oauth/callback`;
    console.log('[OAuthCallback] Exchanging code, redirectUri:', redirectUri);

    exchangeNotionCode(code, redirectUri)
      .then(async (data) => {
        console.log('[OAuthCallback] Token exchange success:', data);
        await storage.set(storage.NOTION_TOKEN, data.access_token);
        if (data.workspace_name) {
          await storage.set(storage.NOTION_WORKSPACE, data.workspace_name);
        }
        setStatus(`Connected to ${data.workspace_name || 'Notion'}!`);
        onSuccess(data);
      })
      .catch((err) => {
        console.error('[OAuthCallback] Token exchange failed:', err);
        setStatus('Failed to connect to Notion.');
        setDetail(err.message);
        setIsError(true);
        onError(err.message);
      });
  }, []);

  const icon = isError ? '❌' : status.startsWith('Connected') ? '✅' : '⏳';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0f4ff, #faf0ff)',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ textAlign: 'center', padding: '40px', maxWidth: '560px', width: '100%' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>{icon}</div>
        <p style={{ fontSize: '18px', color: '#4a4a6a', fontWeight: 500, marginBottom: '12px' }}>{status}</p>
        {detail && (
          <pre style={{
            background: '#fff0f0',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '13px',
            color: '#991b1b',
            textAlign: 'left',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}>{detail}</pre>
        )}
        {isError && (
          <button
            onClick={() => window.location.replace('/')}
            style={{ marginTop: '20px', padding: '10px 24px', borderRadius: '8px', background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
          >
            Go back
          </button>
        )}
      </div>
    </div>
  );
};
