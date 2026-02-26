import React from 'react';
import { CheckCircle, Clock } from 'lucide-react';

export const Header = ({
  lastSync,
  nextScheduledSync,
  autoSyncEnabled,
  setAutoSyncEnabled,
  theme
}) => {
  const textColor = theme?.textOnBg || 'rgba(255,255,255,0.85)';
  const toggleActive = theme?.toggleActive || '#86efac';

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px', marginBottom: '12px', padding: '4px 0' }}>
      {lastSync && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: textColor, fontWeight: 500 }}>
          <CheckCircle style={{ width: '14px', height: '14px', color: toggleActive }} />
          Last synced: {lastSync.toLocaleTimeString()}
        </div>
      )}

      {nextScheduledSync && autoSyncEnabled && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: textColor, fontWeight: 500 }}>
          <Clock style={{ width: '14px', height: '14px' }} />
          Next: {nextScheduledSync.toLocaleTimeString()}
        </div>
      )}

      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
        <span style={{ fontSize: '12px', color: textColor, fontWeight: 500 }}>Auto-sync 6 PM</span>
        <div
          onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
          style={{
            width: '40px',
            height: '22px',
            borderRadius: '11px',
            backgroundColor: autoSyncEnabled ? toggleActive : 'rgba(128,128,128,0.3)',
            position: 'relative',
            transition: 'background-color 0.2s',
            cursor: 'pointer',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          <div
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              backgroundColor: '#fff',
              position: 'absolute',
              top: '2px',
              left: autoSyncEnabled ? '20px' : '2px',
              transition: 'left 0.2s',
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
            }}
          />
        </div>
      </label>
    </div>
  );
};
