import React, { useState, useEffect } from 'react';
import { SetupView } from './components/SetupView';
import { Header } from './components/Header';
import { Scratchpad } from './components/Scratchpad';
import { Sidebar } from './components/Sidebar';
import { loadConfig, saveConfig } from './utils/storage';
import { processNotesWithAI } from './utils/ai-service';
import { notionAPI } from './utils/notion-api';
import { useScheduledSync } from './hooks/useScheduledSync';

export default function NotionAIOrganizer() {
  const [currentView, setCurrentView] = useState('setup');
  const [notionToken, setNotionToken] = useState('');
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

  // Load config on mount
  useEffect(() => {
    const init = async () => {
      const config = await loadConfig();
      
      if (config.token && config.databaseId) {
        setNotionToken(config.token);
        setDatabaseId(config.databaseId);
        setIsConfigured(true);
        setCurrentView('scratchpad');
      }
      
      setActivityLog(config.activityLog);
      setLastSync(config.lastSync);
      setAutoSyncEnabled(config.autoSyncEnabled);
    };
    
    init();
  }, []);

  // Save config whenever it changes
  useEffect(() => {
    if (isConfigured) {
      saveConfig({
        token: notionToken,
        databaseId: databaseId,
        activityLog: activityLog,
        lastSync: lastSync,
        autoSyncEnabled: autoSyncEnabled
      });
    }
  }, [notionToken, databaseId, activityLog, lastSync, autoSyncEnabled, isConfigured]);

  // Add log entry
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setActivityLog(prev => [...prev, { timestamp, message, type }].slice(-20));
  };

  // Process and sync to Notion
  const processAndOrganize = async () => {
    if (!scratchpadContent.trim()) {
      addLog('No content to process', 'error');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Analyzing your notes...');
    addLog('Started processing scratchpad notes', 'info');

    try {
      // Step 1: Process with AI
      setProcessingStatus('AI is organizing your notes...');
      const structured = await processNotesWithAI(scratchpadContent);
      addLog('AI organized content into structured pages', 'success');

      // Step 2: Sync to Notion
      setProcessingStatus('Syncing to Notion...');
      
      for (const page of structured.pages) {
        const result = await notionAPI.createOrUpdatePage(notionToken, databaseId, page);
        addLog(`${result.action === 'created' ? 'Created' : 'Updated'} "${result.topic}" page`, 'success');
      }

      setLastSync(new Date());
      addLog(`Successfully synced ${structured.pages.length} page(s) to Notion`, 'success');
      
      // Clear scratchpad after successful sync
      setScratchpadContent('');
      setProcessingStatus('');
      
    } catch (error) {
      console.error('Processing error:', error);
      addLog(`Error: ${error.message}`, 'error');
      setProcessingStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  // Test Notion connection
  const testConnection = async () => {
    setIsProcessing(true);
    try {
      const success = await notionAPI.testConnection(notionToken, databaseId);
      
      if (success) {
        setIsConfigured(true);
        setCurrentView('scratchpad');
        addLog('Successfully connected to Notion!', 'success');
      } else {
        addLog('Failed to connect. Check your token and database ID.', 'error');
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
  if (currentView === 'setup' || !isConfigured) {
    return (
      <SetupView
        notionToken={notionToken}
        setNotionToken={setNotionToken}
        databaseId={databaseId}
        setDatabaseId={setDatabaseId}
        isProcessing={isProcessing}
        onConnect={testConnection}
      />
    );
  }

  // Main Scratchpad View
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-6xl mx-auto">
        <Header
          lastSync={lastSync}
          nextScheduledSync={nextScheduledSync}
          autoSyncEnabled={autoSyncEnabled}
          setAutoSyncEnabled={setAutoSyncEnabled}
          onSettingsClick={() => setCurrentView('setup')}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Scratchpad
              scratchpadContent={scratchpadContent}
              setScratchpadContent={setScratchpadContent}
              isProcessing={isProcessing}
              processingStatus={processingStatus}
              onSync={processAndOrganize}
            />
          </div>

          <Sidebar activityLog={activityLog} />
        </div>
      </div>
    </div>
  );
}
