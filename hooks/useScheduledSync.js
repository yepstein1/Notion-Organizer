import { useState, useEffect } from 'react';

export const useScheduledSync = (autoSyncEnabled, isConfigured, lastSync, scratchpadContent, onSync, onLog) => {
  const [nextScheduledSync, setNextScheduledSync] = useState(null);

  // Calculate next scheduled sync (6 PM today or tomorrow)
  useEffect(() => {
    const calculateNextSync = () => {
      const now = new Date();
      const today6PM = new Date();
      today6PM.setHours(18, 0, 0, 0);

      if (now < today6PM) {
        setNextScheduledSync(today6PM);
      } else {
        const tomorrow6PM = new Date();
        tomorrow6PM.setDate(tomorrow6PM.getDate() + 1);
        tomorrow6PM.setHours(18, 0, 0, 0);
        setNextScheduledSync(tomorrow6PM);
      }
    };

    calculateNextSync();
    const interval = setInterval(calculateNextSync, 60000); // Recalculate every minute

    return () => clearInterval(interval);
  }, [lastSync]);

  // Auto-sync scheduler
  useEffect(() => {
    if (!autoSyncEnabled || !isConfigured) return;

    const checkAndSync = async () => {
      const now = new Date();
      const today6PM = new Date();
      today6PM.setHours(18, 0, 0, 0);

      // If it's past 6 PM today and we haven't synced yet today
      if (now >= today6PM && (!lastSync || lastSync.toDateString() !== now.toDateString())) {
        if (scratchpadContent.trim()) {
          onLog('Starting scheduled 6 PM sync...', 'info');
          await onSync();
        } else {
          onLog('Skipped scheduled sync - no content to sync', 'info');
        }
      }
    };

    // Check every minute
    const interval = setInterval(checkAndSync, 60000);
    
    // Check immediately on load
    checkAndSync();

    return () => clearInterval(interval);
  }, [autoSyncEnabled, isConfigured, lastSync, scratchpadContent, onSync, onLog]);

  return { nextScheduledSync };
};
