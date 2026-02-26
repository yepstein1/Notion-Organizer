import React from 'react';
import { Sparkles, List, Hash, FileText, Link as LinkIcon } from 'lucide-react';

export const Sidebar = ({ activityLog }) => {
  return (
    <div className="space-y-6">
      {/* How It Works */}
      <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-indigo-200">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          How It Works
        </h3>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-indigo-600">1</span>
            </div>
            <p>Write notes throughout the day in the scratchpad</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-indigo-600">2</span>
            </div>
            <p>At 6 PM, AI automatically organizes and syncs</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-indigo-600">3</span>
            </div>
            <p>Or click "Sync Now" to organize immediately</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-indigo-600">4</span>
            </div>
            <p>Notion gets updated with structured pages</p>
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-indigo-200">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <List className="w-5 h-5 text-indigo-600" />
          Activity Log
        </h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {activityLog.length === 0 ? (
            <p className="text-sm text-gray-500">No activity yet</p>
          ) : (
            activityLog.slice().reverse().map((log, idx) => (
              <div key={idx} className="text-xs">
                <span className="text-gray-500 font-mono">{log.timestamp}</span>
                <p className={`mt-1 ${
                  log.type === 'success' ? 'text-green-700' :
                  log.type === 'error' ? 'text-red-700' :
                  'text-gray-700'
                }`}>
                  {log.message}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Features */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-indigo-200">
        <h3 className="font-bold text-gray-900 mb-3">✨ AI Features</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <Hash className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <span>Auto-tags by topic</span>
          </li>
          <li className="flex items-start gap-2">
            <List className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <span>Organizes into bullet lists</span>
          </li>
          <li className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <span>Groups under smart headings</span>
          </li>
          <li className="flex items-start gap-2">
            <LinkIcon className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <span>Links related topics</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
