// Storage utility functions for managing persistent data

export const storage = {
  async get(key) {
    try {
      if (window.storage && typeof window.storage.get === 'function') {
        const result = await window.storage.get(key);
        return result ? result.value : null;
      }

      return window.localStorage.getItem(key);
    } catch (error) {
      console.error(`Error getting ${key}:`, error);
      return null;
    }
  },

  async set(key, value) {
    try {
      if (window.storage && typeof window.storage.set === 'function') {
        await window.storage.set(key, value);
        return true;
      }

      window.localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      return false;
    }
  },

  // Config keys
  NOTION_DATABASE_ID: 'notion-database-id',
  NOTION_TOKEN: 'notion-oauth-token',
  NOTION_WORKSPACE: 'notion-workspace-name',
  ACTIVITY_LOG: 'notion-activity-log',
  LAST_SYNC: 'notion-last-sync',
  AUTO_SYNC_ENABLED: 'notion-auto-sync-enabled',
  STYLE_EXAMPLE: 'notion-style-example'
};

export const loadConfig = async () => {
  const databaseId = await storage.get(storage.NOTION_DATABASE_ID);
  const activityLog = await storage.get(storage.ACTIVITY_LOG);
  const lastSync = await storage.get(storage.LAST_SYNC);
  const autoSyncEnabled = await storage.get(storage.AUTO_SYNC_ENABLED);
  const styleExample = await storage.get(storage.STYLE_EXAMPLE);

  return {
    databaseId,
    activityLog: activityLog ? JSON.parse(activityLog) : [],
    lastSync: lastSync ? new Date(lastSync) : null,
    autoSyncEnabled: autoSyncEnabled === 'true',
    styleExample: styleExample ? JSON.parse(styleExample) : { rawNotes: '', organizedOutput: '' }
  };
};

export const saveConfig = async (config) => {
  await storage.set(storage.NOTION_DATABASE_ID, config.databaseId);
  await storage.set(storage.ACTIVITY_LOG, JSON.stringify(config.activityLog));
  if (config.lastSync) {
    await storage.set(storage.LAST_SYNC, config.lastSync.toISOString());
  }
  await storage.set(storage.AUTO_SYNC_ENABLED, String(config.autoSyncEnabled));
  if (config.styleExample !== undefined) {
    await storage.set(storage.STYLE_EXAMPLE, JSON.stringify(config.styleExample));
  }
};
