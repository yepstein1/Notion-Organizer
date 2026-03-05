import React, { useState } from 'react';
import { Loader, X, ChevronDown, ChevronRight, Send } from 'lucide-react';

export const PreviewModal = ({
  previewData,
  isProcessing,
  onRefine,
  onConfirm,
  onCancel
}) => {
  const [expandedPages, setExpandedPages] = useState({});
  const [feedback, setFeedback] = useState('');

  const { pages = [], organizationMethod, organizationReason } = previewData || {};

  const togglePage = (idx) => {
    setExpandedPages(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleRefine = () => {
    if (!feedback.trim() || isProcessing) return;
    onRefine(feedback, pages);
    setFeedback('');
  };

  const methodLabel = {
    'official-docs': 'Official Docs',
    'textbook': 'Textbook',
    'fallback': 'General',
    'unknown': 'Auto'
  }[organizationMethod] || organizationMethod || 'Auto';

  const methodColor = {
    'official-docs': { bg: '#ede9fe', text: '#5b21b6' },
    'textbook': { bg: '#dbeafe', text: '#1e40af' },
    'fallback': { bg: '#fef3c7', text: '#92400e' }
  }[organizationMethod] || { bg: '#f1f5f9', text: '#475569' };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 200,
      background: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '20px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#1f2937' }}>
            Preview Organization
          </h2>
          <button
            onClick={onCancel}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px', borderRadius: '8px', display: 'flex' }}
            aria-label="Close"
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Organization info bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 24px',
          background: '#f8fafc',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <span style={{
            padding: '2px 10px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 700,
            background: methodColor.bg,
            color: methodColor.text,
            letterSpacing: '0.03em'
          }}>
            {methodLabel}
          </span>
          {organizationReason && (
            <span style={{ fontSize: '12px', color: '#6b7280' }}>{organizationReason}</span>
          )}
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {/* Pages list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {pages.map((page, idx) => {
              const isOpen = expandedPages[idx] !== false; // default open
              const bulletCount = (page.sections || []).reduce((sum, s) => sum + (s.bullets || []).length, 0);
              return (
                <div key={idx} style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  overflow: 'hidden'
                }}>
                  <button
                    type="button"
                    onClick={() => togglePage(idx)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 16px',
                      background: isOpen ? '#f8fafc' : '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    {isOpen
                      ? <ChevronDown style={{ width: '14px', height: '14px', color: '#9ca3af', flexShrink: 0 }} />
                      : <ChevronRight style={{ width: '14px', height: '14px', color: '#9ca3af', flexShrink: 0 }} />
                    }
                    <span style={{ fontWeight: 600, fontSize: '14px', color: '#111827', flex: 1 }}>
                      {page.topic}
                    </span>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                      {(page.sections || []).length} section{(page.sections || []).length !== 1 ? 's' : ''} · {bulletCount} bullet{bulletCount !== 1 ? 's' : ''}
                    </span>
                  </button>

                  {isOpen && (
                    <div style={{ padding: '4px 16px 14px 38px', borderTop: '1px solid #f1f5f9' }}>
                      {(page.tags || []).length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px', marginTop: '8px' }}>
                          {page.tags.map((tag, ti) => (
                            <span key={ti} style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '10px', background: '#ede9fe', color: '#6d28d9', fontWeight: 500 }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {(page.sections || []).map((section, si) => (
                        <div key={si} style={{ marginTop: '10px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                            {section.heading}
                          </div>
                          <ul style={{ margin: 0, paddingLeft: '16px' }}>
                            {(section.bullets || []).slice(0, 5).map((bullet, bi) => {
                              const text = typeof bullet === 'object' ? bullet.text : bullet;
                              return (
                                <li key={bi} style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.6' }}>
                                  {text}
                                  {typeof bullet === 'object' && bullet.children && bullet.children.length > 0 && (
                                    <ul style={{ margin: 0, paddingLeft: '14px' }}>
                                      {bullet.children.map((child, ci) => (
                                        <li key={ci} style={{ fontSize: '11px', color: '#9ca3af' }}>{child}</li>
                                      ))}
                                    </ul>
                                  )}
                                </li>
                              );
                            })}
                            {(section.bullets || []).length > 5 && (
                              <li style={{ fontSize: '11px', color: '#9ca3af', listStyle: 'none' }}>
                                +{(section.bullets || []).length - 5} more...
                              </li>
                            )}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Feedback section */}
          <div style={{
            padding: '14px',
            borderRadius: '12px',
            border: '1px solid #e0e7ff',
            background: '#f8f9ff'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#4f46e5', marginBottom: '8px' }}>
              What would you like to change?
            </div>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="e.g. Keep all hooks in one section, use shorter bullet text..."
              disabled={isProcessing}
              style={{
                width: '100%',
                minHeight: '70px',
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
            <button
              type="button"
              onClick={handleRefine}
              disabled={isProcessing || !feedback.trim()}
              style={{
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                borderRadius: '8px',
                border: 'none',
                background: feedback.trim() && !isProcessing ? '#6366f1' : '#e0e7ff',
                color: feedback.trim() && !isProcessing ? '#fff' : '#a5b4fc',
                fontSize: '12px',
                fontWeight: 600,
                cursor: feedback.trim() && !isProcessing ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s'
              }}
            >
              {isProcessing ? <Loader style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite' }} /> : <Send style={{ width: '12px', height: '12px' }} />}
              Refine
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          padding: '16px 24px',
          borderTop: '1px solid #f1f5f9',
          background: '#fff'
        }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '9px 20px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: '#fff',
              color: '#374151',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 20px',
              borderRadius: '10px',
              border: 'none',
              background: isProcessing ? '#c7d2fe' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isProcessing ? 'not-allowed' : 'pointer'
            }}
          >
            {isProcessing && <Loader style={{ width: '13px', height: '13px', animation: 'spin 1s linear infinite' }} />}
            Confirm & Sync to Notion →
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
