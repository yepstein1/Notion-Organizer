import React from 'react';
import { Trash2, Sparkles } from 'lucide-react';

export function StylesView({ styleEntries, onDelete, onBack, theme }) {
  return (
    <div style={{ minHeight: '100vh', background: theme?.bg || '#f8fafc', padding: '32px 24px' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <button
            onClick={onBack}
            style={{
              background: 'none', border: '1px solid #e5e7eb', borderRadius: '8px',
              padding: '6px 12px', fontSize: '13px', color: '#6b7280', cursor: 'pointer'
            }}
          >
            ← Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles style={{ width: '18px', height: '18px', color: '#6366f1' }} />
            <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#1f2937', margin: 0 }}>
              Style Preferences
            </h1>
          </div>
          <span style={{
            fontSize: '11px', fontWeight: 600, color: '#6366f1',
            background: '#eef2ff', borderRadius: '99px', padding: '2px 8px'
          }}>
            {styleEntries.length} active
          </span>
        </div>

        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px', lineHeight: '1.6' }}>
          All of these style preferences are sent to the AI on every sync. Remove ones that are outdated or conflicting.
        </p>

        {/* Entry list */}
        {styleEntries.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb',
            padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '13px'
          }}>
            No style preferences saved yet. Add one from the scratchpad.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {styleEntries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  background: '#fff', borderRadius: '14px',
                  border: '1px solid #e0e7ff', padding: '16px 18px',
                  display: 'flex', gap: '14px', alignItems: 'flex-start'
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6', margin: 0 }}>
                    {entry.text}
                  </p>
                  <p style={{ fontSize: '11px', color: '#9ca3af', margin: '6px 0 0 0' }}>
                    Added {new Date(entry.addedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={() => onDelete(entry.id)}
                  title="Remove this style"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#d1d5db', padding: '2px', borderRadius: '6px',
                    display: 'flex', alignItems: 'center', flexShrink: 0
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}
                >
                  <Trash2 style={{ width: '15px', height: '15px' }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
