import React from 'react';
import { FileText, Loader, Send } from 'lucide-react';

export const Scratchpad = ({ 
  scratchpadContent, 
  setScratchpadContent, 
  isProcessing, 
  processingStatus, 
  onSync 
}) => {
  return (
    <div className="bg-white rounded-3xl shadow-2xl p-6 border-2 border-indigo-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-bold text-gray-900">Scratchpad</h2>
        </div>
        <div className="text-xs text-gray-500">
          {scratchpadContent.length} characters
        </div>
      </div>

      <textarea
        value={scratchpadContent}
        onChange={(e) => setScratchpadContent(e.target.value)}
        placeholder="Write your notes here... The AI will figure out how to organize them!

Example:
- Learned about React useEffect hook
- useEffect runs after render
- Can return cleanup function
- Dependencies array controls when it runs

Also learned TypeScript generics today
- Generic functions: function identity<T>(arg: T): T
- Makes code reusable with type safety"
        className="w-full h-96 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none text-gray-900 resize-none font-mono text-sm"
      />

      <div className="mt-4 space-y-3">
        {isProcessing && (
          <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl flex items-center gap-3">
            <Loader className="w-5 h-5 text-indigo-600 animate-spin" />
            <p className="text-indigo-800 font-medium">{processingStatus}</p>
          </div>
        )}

        <button
          onClick={onSync}
          disabled={isProcessing || !scratchpadContent.trim()}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Sync Now (Manual)
            </>
          )}
        </button>
      </div>
    </div>
  );
};
