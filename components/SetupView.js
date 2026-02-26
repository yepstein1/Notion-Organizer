import React from 'react';
import { Settings, HelpCircle } from 'lucide-react';

export const SetupView = ({ 
  notionToken, 
  setNotionToken, 
  databaseId, 
  setDatabaseId, 
  isProcessing, 
  onConnect 
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 flex items-center justify-center">
      <div className="max-w-3xl w-full bg-white rounded-3xl shadow-2xl p-8 border-2 border-indigo-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-100 rounded-xl">
            <Settings className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Setup Notion Integration</h1>
            <p className="text-gray-600">Connect your Notion workspace</p>
          </div>
        </div>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">How to Get Your Notion API Token</h3>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>Go to <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="underline font-medium">notion.so/my-integrations</a></li>
                <li>Click "New integration"</li>
                <li>Name it "AI Organizer" and select your workspace</li>
                <li>Click "Submit" and copy the "Internal Integration Token"</li>
                <li>Go to your Notion database → click "..." → "Add connections" → Select "AI Organizer"</li>
                <li>Copy your database URL (the part after notion.so/ and before the ?)</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notion API Token
            </label>
            <input
              type="password"
              value={notionToken}
              onChange={(e) => setNotionToken(e.target.value)}
              placeholder="secret_xxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Database ID
            </label>
            <input
              type="text"
              value={databaseId}
              onChange={(e) => setDatabaseId(e.target.value)}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none text-gray-900"
            />
            <p className="text-xs text-gray-500 mt-2">
              From your Notion database URL: notion.so/[THIS_PART]?v=...
            </p>
          </div>

          <button
            onClick={onConnect}
            disabled={isProcessing || !notionToken || !databaseId}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Testing Connection...' : 'Connect to Notion'}
          </button>
        </div>
      </div>
    </div>
  );
};
