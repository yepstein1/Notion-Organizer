import React from 'react';
import { Sparkles, Settings, CheckCircle, Clock } from 'lucide-react';

export const Header = ({ 
  lastSync, 
  nextScheduledSync, 
  autoSyncEnabled, 
  setAutoSyncEnabled, 
  onSettingsClick 
}) => {
  return (
    <div className="bg-white rounded-3xl shadow-2xl p-6 mb-6 border-2 border-indigo-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Notion Organizer</h1>
            <p className="text-gray-600">Smart scratchpad → Organized knowledge base</p>
          </div>
        </div>
        <button
          onClick={onSettingsClick}
          className="p-3 hover:bg-gray-100 rounded-xl transition"
        >
          <Settings className="w-6 h-6 text-gray-600" />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {lastSync && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Last synced: {lastSync.toLocaleTimeString()}
            </div>
          )}
          
          {nextScheduledSync && autoSyncEnabled && (
            <div className="flex items-center gap-2 text-sm text-indigo-600">
              <Clock className="w-4 h-4" />
              Next auto-sync: {nextScheduledSync.toLocaleTimeString()}
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoSyncEnabled}
            onChange={(e) => setAutoSyncEnabled(e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded"
          />
          <span className="text-sm text-gray-700">Auto-sync at 6 PM</span>
        </label>
      </div>
    </div>
  );
};
