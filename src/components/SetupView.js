import React, { useState } from 'react';
import { Settings, ChevronDown, ChevronUp } from 'lucide-react';

const NOTION_CLIENT_ID = process.env.REACT_APP_NOTION_CLIENT_ID;

export const SetupView = ({
  databaseId,
  setDatabaseId,
  isProcessing,
  onConnect,
  notionToken,
  workspaceName,
  onDisconnect
}) => {
  const handleNotionOAuth = () => {
    const redirectUri = `${window.location.origin}/oauth/callback`;
    const params = new URLSearchParams({
      client_id: NOTION_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      owner: 'user'
    });
    window.location.href = `https://api.notion.com/v1/oauth/authorize?${params}`;
  };

  const isConnected = !!notionToken;
  const [showSetupGuide, setShowSetupGuide] = useState(!isConnected);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 flex items-center justify-center">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl p-8 border-2 border-indigo-200">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-indigo-100 rounded-xl">
            <Settings className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Connect Notion</h1>
            <p className="text-gray-500 text-sm">Authorize this app to sync to your workspace</p>
          </div>
        </div>

        {/* First-time setup guide */}
        <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowSetupGuide(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-sm font-semibold text-gray-600"
          >
            First-time setup guide
            {showSetupGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showSetupGuide && (
            <ol className="px-4 py-4 space-y-3 text-sm text-gray-700 list-none">
              <li className="flex gap-3">
                <span className="font-bold text-indigo-600 shrink-0">1.</span>
                <span>Go to <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-medium">notion.so/my-integrations</a> and click <strong>New integration</strong>. Set the type to <strong>Public</strong>.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-indigo-600 shrink-0">2.</span>
                <span>Under <strong>OAuth Domain &amp; URIs</strong>, add this redirect URI:<br />
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono break-all">{window.location.origin}/oauth/callback</code>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-indigo-600 shrink-0">3.</span>
                <span>Copy the <strong>Client ID</strong> and <strong>Client Secret</strong> from the <strong>Distribution</strong> tab and add them to your backend environment variables (<code className="bg-gray-100 px-1 rounded text-xs font-mono">NOTION_CLIENT_ID</code>, <code className="bg-gray-100 px-1 rounded text-xs font-mono">NOTION_CLIENT_SECRET</code>).</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-indigo-600 shrink-0">4.</span>
                <span>Click <strong>Connect with Notion</strong> below and authorize the integration.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-indigo-600 shrink-0">5.</span>
                <span>Open your Notion database, click <strong>···</strong> → <strong>Add connections</strong> → select your integration.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-indigo-600 shrink-0">6.</span>
                <span>Paste your database ID below. Find it in the database URL: notion.so/<strong className="text-indigo-600">[THIS_PART]</strong>?v=...</span>
              </li>
            </ol>
          )}
        </div>

        {/* Step 1 — Notion OAuth */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isConnected ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'}`}>
              {isConnected ? '✓' : '1'}
            </span>
            <span className="font-semibold text-gray-700">Connect your Notion workspace</span>
          </div>

          {isConnected ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium text-green-800">Connected{workspaceName ? ` to ${workspaceName}` : ''}</p>
                <p className="text-xs text-green-600 mt-0.5">Your Notion account is authorized</p>
              </div>
              <button
                onClick={onDisconnect}
                className="text-xs text-red-500 hover:text-red-700 font-medium underline"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={handleNotionOAuth}
              disabled={!NOTION_CLIENT_ID}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-black text-white rounded-xl hover:bg-gray-800 transition font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg width="20" height="20" viewBox="0 0 100 100" fill="none">
                <rect width="100" height="100" rx="12" fill="white" />
                <path d="M20 20h60v60H20z" fill="black" />
                <path d="M35 35h30v6H35zM35 50h20v6H35z" fill="white" />
              </svg>
              Connect with Notion
            </button>
          )}
          {!NOTION_CLIENT_ID && (
            <p className="text-xs text-red-500 mt-2">
              REACT_APP_NOTION_CLIENT_ID is not set. Add it to your .env file.
            </p>
          )}
        </div>

        {/* Step 2 — Database ID */}
        <div className={!isConnected ? 'opacity-40 pointer-events-none' : ''}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${databaseId ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'}`}>
              {databaseId ? '✓' : '2'}
            </span>
            <span className="font-semibold text-gray-700">Enter your database ID</span>
          </div>

          <input
            type="text"
            value={databaseId}
            onChange={(e) => setDatabaseId(e.target.value)}
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none text-gray-900 mb-1"
          />
          <p className="text-xs text-gray-400 mb-4">
            From your Notion database URL: notion.so/<strong>[THIS_PART]</strong>?v=...
          </p>

          <button
            onClick={onConnect}
            disabled={isProcessing || !databaseId || !isConnected}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Testing Connection...' : 'Test & Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
