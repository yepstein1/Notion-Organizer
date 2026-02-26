// Storage utility functions for managing persistent data

export const storage = {
  async get(key) {
    try {
      const result = await window.storage.get(key);
      return result ? result.value : null;
    } catch (error) {
      console.error(`Error getting ${key}:`, error);
      return null;
    }
  },

  async set(key, value) {
    try {
      await window.storage.set(key, value);
      return true;
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      return false;
    }
  },

  // Config keys
  NOTION_TOKEN: 'notion-api-token',
  NOTION_DATABASE_ID: 'notion-database-id',
  ACTIVITY_LOG: 'notion-activity-log',
  LAST_SYNC: 'notion-last-sync',
  AUTO_SYNC_ENABLED: 'notion-auto-sync-enabled'
};

export const loadConfig = async () => {
  const token = await storage.get(storage.NOTION_TOKEN);
  const databaseId = await storage.get(storage.NOTION_DATABASE_ID);
  const activityLog = await storage.get(storage.ACTIVITY_LOG);
  const lastSync = await storage.get(storage.LAST_SYNC);
  const autoSyncEnabled = await storage.get(storage.AUTO_SYNC_ENABLED);

  return {
    token,
    databaseId,
    activityLog: activityLog ? JSON.parse(activityLog) : [],
    lastSync: lastSync ? new Date(lastSync) : null,
    autoSyncEnabled: autoSyncEnabled === 'true'
  };
};

export const saveConfig = async (config) => {
  await storage.set(storage.NOTION_TOKEN, config.token);
  await storage.set(storage.NOTION_DATABASE_ID, config.databaseId);
  await storage.set(storage.ACTIVITY_LOG, JSON.stringify(config.activityLog));
  if (config.lastSync) {
    await storage.set(storage.LAST_SYNC, config.lastSync.toISOString());
  }
  await storage.set(storage.AUTO_SYNC_ENABLED, String(config.autoSyncEnabled));
};
