import { useState, useEffect, useCallback, useRef } from 'react';
import { ServerStore } from '../core/stores';
import { HybridStore } from '../core/stores/HybridStore';
import type { DataStore } from '../core/stores/DataStore';

/**
 * React Hook to manage DataStore instance
 * 使用自建服务器存储，而不是IndexedDB或Zotero官网API
 */
export function useDataStore(serverURL?: string): DataStore | null {
  const storeRef = useRef<DataStore | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function initializeStore() {
      if (storeRef.current) {
        return; // Already initialized
      }

      try {
        // 创建服务器存储
        const serverStore = new ServerStore(serverURL || 'http://localhost:3001');
        await serverStore.initialize();

        storeRef.current = serverStore;
        console.log('[useDataStore] 已连接到服务器');
        setReady(true);
      } catch (error) {
        console.error('[useDataStore] 服务器连接失败:', error);
        // 可以在这里添加重试逻辑或显示错误信息
      }
    }

    initializeStore();
  }, [serverURL]);

  return ready ? storeRef.current : null;
}

/**
 * React Hook to access Zotero data
 */
export function useZoteroData(dataStore: DataStore | null) {
  const [data, setData] = useState<{
    items: any[];
    collections: any[];
    tags: any[];
  }>({
    items: [],
    collections: [],
    tags: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    if (!dataStore) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [items, collections, tags] = await Promise.all([
        dataStore.query('item'),
        dataStore.query('collection'),
        dataStore.query('tag')
      ]);

      setData({ items, collections, tags });
    } catch (err) {
      console.error('[useZoteroData] Failed to load data:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [dataStore]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    ...data,
    loading,
    error,
    reload: loadData
  };
}

/**
 * React Hook for sync functionality
 */
export function useSync(dataStore: DataStore | null) {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number>(0);
  const [syncStatus, setSyncStatus] = useState<{
    lastSyncVersion: number;
    lastSyncTime: number;
    isOnline: boolean;
  } | null>(null);

  const sync = useCallback(async () => {
    if (!dataStore || syncing) {
      return;
    }

    setSyncing(true);

    try {
      const result = await dataStore.sync(lastSync);
      setLastSync(result.libraryVersion);

      if (dataStore instanceof HybridStore) {
        const status = await dataStore.getSyncStatus();
        setSyncStatus(status);
      }
    } catch (error) {
      console.error('[useSync] Sync failed:', error);
      throw error;
    } finally {
      setSyncing(false);
    }
  }, [dataStore, syncing, lastSync]);

  const checkStatus = useCallback(async () => {
    if (dataStore && 'getSyncStatus' in dataStore) {
      const status = await (dataStore as any).getSyncStatus();
      setSyncStatus(status);
      setLastSync(status.lastSyncVersion);
    }
  }, [dataStore]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    sync,
    syncing,
    lastSync,
    syncStatus,
    checkStatus
  };
}
