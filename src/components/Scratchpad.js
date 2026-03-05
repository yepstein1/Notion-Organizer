import React, { useRef } from 'react';
import {
  Loader,
  Send,
  Bold,
  Italic,
  Type,
  List,
  ListChecks,
  Quote,
  Code,
  Eraser,
  RefreshCw
} from 'lucide-react';

export const Scratchpad = ({
  scratchpadContent,
  setScratchpadContent,
  isProcessing,
  processingStatus,
  onSync,
  canRefine = false,
  onRefine,
  syncErrors = [],
  styleExample = { rawNotes: '', organizedOutput: '' },
  setStyleExample,
  showStylePanel = false,
  setShowStylePanel
}) => {
  const textareaRef = useRef(null);

  const applyWrap = (prefix, suffix, placeholder) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = scratchpadContent.slice(start, end) || placeholder;
    const nextValue =
      scratchpadContent.slice(0, start) +
      prefix +
      selected +
      suffix +
      scratchpadContent.slice(end);

    setScratchpadContent(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursorStart = start + prefix.length;
      const cursorEnd = cursorStart + selected.length;
      textarea.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  const applyLinePrefix = (prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = scratchpadContent;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEndRaw = value.indexOf('\n', end);
    const lineEnd = lineEndRaw === -1 ? value.length : lineEndRaw;
    const block = value.slice(lineStart, lineEnd);
    const updatedBlock = block
      .split('\n')
      .map((line) => `${prefix}${line}`)
      .join('\n');
    const nextValue = value.slice(0, lineStart) + updatedBlock + value.slice(lineEnd);

    setScratchpadContent(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(lineStart, lineStart + updatedBlock.length);
    });
  };

  const clearScratchpad = () => {
    setScratchpadContent('');
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '20px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 8px 32px rgba(102,126,234,0.15)' }}>
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1f2937', margin: 0 }}>Scratchpad</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setShowStylePanel && setShowStylePanel(v => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: '#6b7280',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: '6px'
            }}
          >
            {(styleExample.rawNotes || styleExample.organizedOutput) && (
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366f1', display: 'inline-block' }} />
            )}
            My Style Example {showStylePanel ? '▴' : '▾'}
          </button>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>
            {scratchpadContent.length} characters
          </div>
        </div>
      </div>

      {showStylePanel && (
        <div style={{
          marginTop: '10px',
          padding: '14px',
          borderRadius: '14px',
          border: '1px solid #e0e7ff',
          background: '#f8f9ff'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#4f46e5' }}>
              Teach the AI your organization style
            </div>
            {(styleExample.rawNotes || styleExample.organizedOutput) && (
              <button
                type="button"
                onClick={() => setStyleExample && setStyleExample({ rawNotes: '', organizedOutput: '' })}
                style={{ fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
              >
                Clear all
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Example raw notes
                </label>
                {styleExample.rawNotes && (
                  <button
                    type="button"
                    onClick={() => setStyleExample && setStyleExample(s => ({ ...s, rawNotes: '' }))}
                    style={{ fontSize: '11px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
                  >
                    clear
                  </button>
                )}
              </div>
              <textarea
                value={styleExample.rawNotes}
                onChange={(e) => setStyleExample && setStyleExample(s => ({ ...s, rawNotes: e.target.value }))}
                placeholder="Paste some rough notes as they'd come from you..."
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #c7d2fe',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  color: '#374151',
                  background: '#fff',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  How you'd organize them
                </label>
                {styleExample.organizedOutput && (
                  <button
                    type="button"
                    onClick={() => setStyleExample && setStyleExample(s => ({ ...s, organizedOutput: '' }))}
                    style={{ fontSize: '11px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
                  >
                    clear
                  </button>
                )}
              </div>
              <textarea
                value={styleExample.organizedOutput}
                onChange={(e) => setStyleExample && setStyleExample(s => ({ ...s, organizedOutput: e.target.value }))}
                placeholder="Show the headings and bullets you'd want in Notion..."
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #c7d2fe',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  color: '#374151',
                  background: '#fff',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
          {(() => {
            const hasRaw = !!styleExample.rawNotes.trim();
            const hasOrg = !!styleExample.organizedOutput.trim();
            const bothFilled = hasRaw && hasOrg;
            const oneFilled = hasRaw || hasOrg;
            const color = bothFilled ? '#16a34a' : oneFilled ? '#d97706' : '#9ca3af';
            const bg = bothFilled ? '#f0fdf4' : oneFilled ? '#fffbeb' : '#f3f4f6';
            const label = bothFilled ? '✓ Autosaved' : oneFilled ? 'Incomplete — fill both fields' : 'Autosaved';
            return (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color,
                  background: bg,
                  border: `1px solid ${color}33`,
                  borderRadius: '99px',
                  padding: '2px 10px',
                  transition: 'all 0.3s ease'
                }}>
                  {label}
                </span>
              </div>
            );
          })()}
        </div>
      )}

      <div
        style={{
          marginTop: '12px',
          position: 'relative',
          borderRadius: '16px',
          border: '1px solid rgba(102,126,234,0.15)',
          backgroundColor: 'rgba(255,255,255,0.9)',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            right: '12px',
            zIndex: 10,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '12px',
            border: '1px solid #e0e7ff',
            backgroundColor: 'rgba(255,255,255,0.95)',
            padding: '6px 8px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', padding: '0 8px' }}>Format</span>
          <button
            type="button"
            onClick={() => applyWrap('**', '**', 'bold')}
            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid transparent', background: 'transparent', color: '#374151', cursor: 'pointer' }}
            aria-label="Bold"
          >
            <Bold style={{ width: '16px', height: '16px' }} />
          </button>
          <button
            type="button"
            onClick={() => applyWrap('_', '_', 'italic')}
            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid transparent', background: 'transparent', color: '#374151', cursor: 'pointer' }}
            aria-label="Italic"
          >
            <Italic style={{ width: '16px', height: '16px' }} />
          </button>
          <button
            type="button"
            onClick={() => applyLinePrefix('# ')}
            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid transparent', background: 'transparent', color: '#374151', cursor: 'pointer' }}
            aria-label="Heading"
          >
            <Type style={{ width: '16px', height: '16px' }} />
          </button>
          <button
            type="button"
            onClick={() => applyLinePrefix('- ')}
            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid transparent', background: 'transparent', color: '#374151', cursor: 'pointer' }}
            aria-label="Bulleted list"
          >
            <List style={{ width: '16px', height: '16px' }} />
          </button>
          <button
            type="button"
            onClick={() => applyLinePrefix('- [ ] ')}
            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid transparent', background: 'transparent', color: '#374151', cursor: 'pointer' }}
            aria-label="Checklist"
          >
            <ListChecks style={{ width: '16px', height: '16px' }} />
          </button>
          <button
            type="button"
            onClick={() => applyLinePrefix('> ')}
            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid transparent', background: 'transparent', color: '#374151', cursor: 'pointer' }}
            aria-label="Quote"
          >
            <Quote style={{ width: '16px', height: '16px' }} />
          </button>
          <button
            type="button"
            onClick={() => applyWrap('`', '`', 'code')}
            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid transparent', background: 'transparent', color: '#374151', cursor: 'pointer' }}
            aria-label="Inline code"
          >
            <Code style={{ width: '16px', height: '16px' }} />
          </button>
          <button
            type="button"
            onClick={() => applyWrap('```\n', '\n```', 'code block')}
            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid transparent', background: 'transparent', color: '#374151', cursor: 'pointer' }}
            aria-label="Code block"
          >
            <Code style={{ width: '16px', height: '16px' }} />
          </button>
          <button
            type="button"
            onClick={clearScratchpad}
            title="Clear scratchpad"
            style={{ marginLeft: 'auto', padding: '6px 10px', borderRadius: '8px', border: '1px solid transparent', background: 'transparent', color: '#e11d48', cursor: 'pointer' }}
            aria-label="Clear"
          >
            <Eraser style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        <textarea
          ref={textareaRef}
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
          style={{
            width: '100%',
            minHeight: '60vh',
            height: '60vh',
            padding: '60px 20px 16px 20px',
            borderRadius: '16px',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontSize: '14px',
            lineHeight: '1.6',
            color: '#111827',
            background: 'transparent'
          }}
        />
      </div>

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

        {canRefine && !isProcessing && (
          <button
            onClick={onRefine}
            disabled={isProcessing}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition font-semibold text-base flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refine Organization (AI suggests improvements)
          </button>
        )}

        {syncErrors.length > 0 && !isProcessing && (
          <div style={{
            padding: '12px 16px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            color: '#991b1b'
          }}>
            <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>
              Some pages failed to sync:
            </div>
            {syncErrors.map((err, i) => (
              <div key={i} style={{ fontSize: '12px', marginTop: '2px' }}>
                <strong>"{err.topic}"</strong>: {err.error}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
