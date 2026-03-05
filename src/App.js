import React, { useState, useEffect } from 'react';
import TestHarness from './TestHarness';
import { SetupView } from './components/SetupView';
import { StylesView } from './components/StylesView';
import { Header } from './components/Header';
import { Scratchpad } from './components/Scratchpad';
import { Sidebar } from './components/Sidebar';
import { loadConfig, saveConfig } from './utils/storage';
import { syncNotesWithBackend, testNotionConnection, undoLastSync } from './utils/ai-service';
import { useScheduledSync } from './hooks/useScheduledSync';

export default function NotionAIOrganizer() {
  // Simple hash-based routing for test harness
  if (window.location.hash === '#/test-harness') {
    return <TestHarness />;
  }
  const [currentView, setCurrentView] = useState('setup');
  const [databaseId, setDatabaseId] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);

  // Scratchpad
  const [scratchpadContent, setScratchpadContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  // Activity log
  const [activityLog, setActivityLog] = useState([]);

  // Fallback notification
  const [fallbackNotice, setFallbackNotice] = useState(null);

  // Refine option for agentic loop
  const [canRefine, setCanRefine] = useState(false);
  const [refineIterations, setRefineIterations] = useState(0);

  // Sync errors for partial failure display
  const [syncErrors, setSyncErrors] = useState([]);

  // Undo last sync
  const [lastSyncUndo, setLastSyncUndo] = useState(null);

  // Style preferences — accumulated list
  const [styleEntries, setStyleEntries] = useState([]);
  const [showStylePanel, setShowStylePanel] = useState(false);


  // Theme
  const [theme, setTheme] = useState('minimal');

  // Notion tab reference for "refresh" behavior
  const notionTabRef = React.useRef(null);

  const themes = {
    purple: {
      name: 'Purple Gradient',
      bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      accent: '#667eea',
      accentGradient: 'linear-gradient(135deg, #667eea, #764ba2)',
      textOnBg: 'rgba(255,255,255,0.9)',
      toggleActive: '#86efac'
    },
    ocean: {
      name: 'Ocean Blue',
      bg: 'linear-gradient(135deg, #0077b6 0%, #00b4d8 50%, #90e0ef 100%)',
      accent: '#0077b6',
      accentGradient: 'linear-gradient(135deg, #0077b6, #00b4d8)',
      textOnBg: 'rgba(255,255,255,0.9)',
      toggleActive: '#90e0ef'
    },
    sunset: {
      name: 'Sunset Warm',
      bg: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #f472b6 100%)',
      accent: '#f97316',
      accentGradient: 'linear-gradient(135deg, #f97316, #ec4899)',
      textOnBg: 'rgba(255,255,255,0.95)',
      toggleActive: '#fcd34d'
    },
    forest: {
      name: 'Forest Green',
      bg: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #6ee7b7 100%)',
      accent: '#059669',
      accentGradient: 'linear-gradient(135deg, #059669, #10b981)',
      textOnBg: 'rgba(255,255,255,0.9)',
      toggleActive: '#a7f3d0'
    },
    midnight: {
      name: 'Midnight Dark',
      bg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
      accent: '#a78bfa',
      accentGradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
      textOnBg: 'rgba(255,255,255,0.9)',
      toggleActive: '#c4b5fd'
    },
    minimal: {
      name: 'Clean Minimal',
      bg: '#f8fafc',
      accent: '#64748b',
      accentGradient: '#475569',
      textOnBg: '#334155',
      toggleActive: '#22c55e'
    }
  };

  const currentTheme = themes[theme];

  // Load config on mount
  useEffect(() => {
    const init = async () => {
      const config = await loadConfig();

      if (config.databaseId) {
        setDatabaseId(config.databaseId);
        setIsConfigured(true);
        setCurrentView('scratchpad');
      }

      setActivityLog(config.activityLog);
      setLastSync(config.lastSync);
      setAutoSyncEnabled(config.autoSyncEnabled);
      if (config.styleEntries) {
        setStyleEntries(config.styleEntries);
      } else if (config.styleExample) {
        // migrate old single-entry shape to array
        const ex = config.styleExample;
        const text = ex.description || [ex.rawNotes, ex.organizedOutput].filter(Boolean).join('\n\n');
        if (text.trim()) {
          setStyleEntries([{ id: Date.now(), text, addedAt: Date.now() }]);
        }
      }
    };

    init();
  }, []);

  // Save config whenever it changes
  useEffect(() => {
    if (isConfigured) {
      saveConfig({
        databaseId: databaseId,
        activityLog: activityLog,
        lastSync: lastSync,
        autoSyncEnabled: autoSyncEnabled,
        styleEntries: styleEntries
      });
    }
  }, [databaseId, activityLog, lastSync, autoSyncEnabled, isConfigured, styleEntries]);

  // Add log entry
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setActivityLog(prev => [...prev, { timestamp, message, type }].slice(-20));
  };

  // Process and sync notes directly to Notion
  const processAndOrganize = async () => {
    if (!scratchpadContent.trim()) {
      addLog('No content to process', 'error');
      return;
    }

    setIsProcessing(true);
    setCanRefine(false);
    setSyncErrors([]);
    setProcessingStatus('Organizing & syncing to Notion...');
    addLog('Started processing scratchpad notes', 'info');

    try {
      const activeStyleExample = styleEntries.length > 0 ? { description: styleEntries.map(e => e.text).join('\n') } : null;
      const syncResult = await syncNotesWithBackend(scratchpadContent, databaseId, {
        skipSync: false,
        styleExample: activeStyleExample
      });

      setCanRefine(syncResult.canRefineMore || false);
      setRefineIterations(syncResult.reviewIterations || 0);
      addLog(`AI organized content (method: ${syncResult.organizationMethod || 'unknown'}, ${syncResult.reviewIterations || 1} iteration${(syncResult.reviewIterations || 1) > 1 ? 's' : ''})`, 'success');

      if (syncResult.organizationMethod === 'fallback') {
        setFallbackNotice({ reason: syncResult.organizationReason || 'No standard documentation structure found for this topic.' });
        setTimeout(() => setFallbackNotice(null), 8000);
      }

      for (const result of syncResult.results || []) {
        if (result.action === 'created') {
          addLog(`Created new "${result.topic}" page`, 'success');
        } else {
          const parts = [];
          if (result.bulletsAdded > 0) parts.push(`${result.bulletsAdded} bullet${result.bulletsAdded !== 1 ? 's' : ''} added`);
          if (result.sectionsCreated > 0) parts.push(`${result.sectionsCreated} new section${result.sectionsCreated !== 1 ? 's' : ''}`);
          if (result.sectionsMerged > 0) parts.push(`merged into ${result.sectionsMerged} section${result.sectionsMerged !== 1 ? 's' : ''}`);
          const detail = parts.length > 0 ? ` (${parts.join(', ')})` : ' (no new content)';
          addLog(`Updated "${result.topic}"${detail}`, 'success');
        }
      }

      if (syncResult.errors && syncResult.errors.length > 0) {
        setSyncErrors(syncResult.errors);
        for (const error of syncResult.errors) {
          addLog(`Failed to sync "${error.topic}": ${error.error}`, 'error');
        }
      }

      setLastSync(new Date());
      setLastSyncUndo((syncResult.results || []).map(r => ({
        action: r.action,
        topic: r.topic,
        pageId: r.pageId,
        backup: r.backup || null
      })));
      addLog(`Successfully synced ${syncResult.pagesCount || 0} page(s) to Notion`, 'success');

      const notionDbUrl = `https://notion.so/${databaseId.replace(/-/g, '')}?refresh=${Date.now()}`;
      if (notionTabRef.current && !notionTabRef.current.closed) notionTabRef.current.close();
      notionTabRef.current = window.open(notionDbUrl, '_blank');

      setProcessingStatus('');

    } catch (error) {
      console.error('Sync error:', error);
      addLog(`Error: ${error.message}`, 'error');
      setProcessingStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle refine request (run additional review iterations)
  const handleRefine = () => {
    processAndOrganize();
  };

  // Test Notion connection
  const testConnection = async () => {
    setIsProcessing(true);
    try {
      const success = await testNotionConnection(databaseId);

      if (success) {
        setIsConfigured(true);
        setCurrentView('scratchpad');
        addLog('Successfully connected to Notion!', 'success');
        // Explicitly save config immediately to ensure persistence
        await saveConfig({
          databaseId: databaseId,
          activityLog: activityLog,
          lastSync: lastSync,
          autoSyncEnabled: autoSyncEnabled
        });
      } else {
        addLog('Failed to connect. Check your database ID and backend credentials.', 'error');
      }
    } catch (error) {
      addLog(`Connection error: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Use scheduled sync hook
  const { nextScheduledSync } = useScheduledSync(
    autoSyncEnabled,
    isConfigured,
    lastSync,
    scratchpadContent,
    processAndOrganize,
    addLog
  );

  // Setup View
  const handleUndo = async () => {
    if (!lastSyncUndo) return;
    setIsProcessing(true);
    setProcessingStatus('Undoing last sync...');
    try {
      await undoLastSync(lastSyncUndo);
      setLastSyncUndo(null);
      addLog('Last sync undone successfully', 'info');
    } catch (error) {
      addLog(`Undo failed: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleAddStyleEntry = (text) => {
    setStyleEntries(prev => [...prev, { id: Date.now(), text, addedAt: Date.now() }]);
  };

  const handleDeleteStyleEntry = (id) => {
    setStyleEntries(prev => prev.filter(e => e.id !== id));
  };

  if (currentView === 'styles') {
    return (
      <StylesView
        styleEntries={styleEntries}
        onDelete={handleDeleteStyleEntry}
        onBack={() => setCurrentView('scratchpad')}
        theme={currentTheme}
      />
    );
  }

  if (currentView === 'setup' || !isConfigured) {
    return (
      <SetupView
        databaseId={databaseId}
        setDatabaseId={setDatabaseId}
        isProcessing={isProcessing}
        onConnect={testConnection}
      />
    );
  }

  // Main Scratchpad View
  return (
    <div style={{ minHeight: '100vh', background: currentTheme.bg }}>
      {/* Fallback organization notice */}
      {fallbackNotice && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
          border: '1px solid #f59e0b',
          borderRadius: '12px',
          padding: '16px 24px',
          boxShadow: '0 8px 24px rgba(245, 158, 11, 0.3)',
          maxWidth: '500px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px'
        }}>
          <span style={{ fontSize: '20px' }}>💡</span>
          <div>
            <div style={{ fontWeight: 600, color: '#92400e', marginBottom: '4px' }}>
              Using general organization
            </div>
            <div style={{ fontSize: '13px', color: '#a16207' }}>
              {fallbackNotice.reason}
            </div>
          </div>
          <button
            onClick={() => setFallbackNotice(null)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#92400e',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '0 4px'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Top bar with settings button */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 20px rgba(0,0,0,0.05)' }}>
        <div style={{ width: '120px' }} />
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: currentTheme.accent, margin: 0 }}>AI Notion Organizer</h1>
        <button
          onClick={() => setCurrentView('setup')}
          style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: currentTheme.accent, cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
        >
          Change database
        </button>
      </div>

      <div className="max-w-6xl mx-auto" style={{ paddingTop: '52px', padding: '52px 20px 20px 20px' }}>
        <Header
          lastSync={lastSync}
          nextScheduledSync={nextScheduledSync}
          autoSyncEnabled={autoSyncEnabled}
          setAutoSyncEnabled={setAutoSyncEnabled}
          theme={currentTheme}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Scratchpad
              scratchpadContent={scratchpadContent}
              setScratchpadContent={setScratchpadContent}
              isProcessing={isProcessing}
              processingStatus={processingStatus}
              onSync={() => processAndOrganize(0)}
              canRefine={canRefine}
              onRefine={handleRefine}
              syncErrors={syncErrors}
              onUndo={lastSyncUndo ? handleUndo : null}
              styleEntries={styleEntries}
              onAddStyleEntry={handleAddStyleEntry}
              onOpenStyles={() => setCurrentView('styles')}
              showStylePanel={showStylePanel}
              setShowStylePanel={setShowStylePanel}
            />
          </div>

          <Sidebar activityLog={activityLog} />
        </div>
      </div>

    </div>
  );
}
