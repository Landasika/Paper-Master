import { IndexedDBStore } from './IndexedDBStore';
import { APIClient } from './APIClient';
import { DataStore } from './DataStore';
import type { SyncResult, QueryOptions, Versions } from '../../types';

/**
 * Hybrid Store implementation
 * Combines local IndexedDB cache with remote API
 * - Reads from local cache first, falls back to API
 * - Writes to both cache and API
 * - Syncs changes in background
 */
export class HybridStore implements DataStore {
  private idb: IndexedDBStore;
  private api: APIClient;
  private ready = false;
  private syncInProgress = false;

  constructor(idb: IndexedDBStore, api: APIClient) {
    this.idb = idb;
    this.api = api;
  }

  async initialize(): Promise<void> {
    await Promise.all([
      this.idb.initialize(),
      this.api.initialize()
    ]);
    this.ready = true;
    console.log('[HybridStore] Initialized');
  }

  isReady(): boolean {
    return this.ready;
  }

  async query<T>(type: string, params?: QueryOptions): Promise<T[]> {
    this.ensureReady();

    try {
      // Try local cache first
      const local = await this.idb.query<T>(type, params);

      if (local && local.length > 0) {
        console.log(`[HybridStore] Found ${local.length} ${type}s in cache`);
        return local;
      }

      console.log(`[HybridStore] No ${type}s in cache, fetching from API`);

      // Fall back to API
      const remote = await this.api.query<T>(type, params);

      // Cache results
      if (remote && remote.length > 0) {
        await this.idb.save(type, remote);
      }

      return remote;
    } catch (error) {
      console.error(`[HybridStore] Query failed:`, error);

      // If API fails, try to return cached data
      const cached = await this.idb.query<T>(type, params);
      if (cached && cached.length > 0) {
        console.log(`[HybridStore] Returning cached data due to error`);
        return cached;
      }

      throw error;
    }
  }

  async get<T>(type: string, id: string | number): Promise<T | null> {
    this.ensureReady();

    try {
      // Try local cache first
      const local = await this.idb.get<T>(type, id);

      if (local) {
        console.log(`[HybridStore] Found ${type} ${id} in cache`);
        return local;
      }

      console.log(`[HybridStore] ${type} ${id} not in cache, fetching from API`);

      // Fall back to API
      const remote = await this.api.get<T>(type, id);

      // Cache result
      if (remote) {
        await this.idb.save(type, remote);
      }

      return remote;
    } catch (error) {
      console.error(`[HybridStore] Get failed:`, error);
      throw error;
    }
  }

  async save<T>(type: string, data: T | T[]): Promise<T | T[]> {
    this.ensureReady();

    try {
      // Save to API first (source of truth)
      const result = await this.api.save<T>(type, data);

      // Then update local cache
      await this.idb.save(type, result);

      console.log(`[HybridStore] Saved ${type}s to API and cache`);

      return result;
    } catch (error) {
      console.error(`[HybridStore] Save failed:`, error);

      // If API fails, still save to local cache for offline support
      // (will sync later when connection is restored)
      await this.idb.save(type, data);
      console.log(`[HybridStore] Saved ${type}s to cache only (offline mode)`);

      return data;
    }
  }

  async delete(type: string, id: string | number): Promise<void> {
    this.ensureReady();

    try {
      // Delete from API first
      await this.api.delete(type, id);

      // Then delete from local cache
      await this.idb.delete(type, id);

      console.log(`[HybridStore] Deleted ${type} ${id} from API and cache`);
    } catch (error) {
      console.error(`[HybridStore] Delete failed:`, error);

      // If API fails, still delete from local cache
      await this.idb.delete(type, id);
      console.log(`[HybridStore] Deleted ${type} ${id} from cache only`);
    }
  }

  async sync(since?: number): Promise<SyncResult> {
    this.ensureReady();

    if (this.syncInProgress) {
      console.log('[HybridStore] Sync already in progress, skipping');
      const lastSync = await this.idb.sync();
      return lastSync;
    }

    this.syncInProgress = true;

    try {
      console.log('[HybridStore] Starting sync...');

      // Get last sync version from local cache
      const lastSyncVersion = since || (await this.idb.getSyncState('lastSyncVersion')) || 0;

      // Fetch changes from API
      const result = await this.api.sync(lastSyncVersion);

      // Update local cache with new data
      if (result.items && result.items.length > 0) {
        await this.idb.save('item', result.items);
        console.log(`[HybridStore] Synced ${result.items.length} items`);
      }

      if (result.collections && result.collections.length > 0) {
        await this.idb.save('collection', result.collections);
        console.log(`[HybridStore] Synced ${result.collections.length} collections`);
      }

      if (result.tags && result.tags.length > 0) {
        await this.idb.save('tag', result.tags);
        console.log(`[HybridStore] Synced ${result.tags.length} tags`);
      }

      // Update sync state
      await this.idb.setSyncState('lastSyncVersion', result.libraryVersion);
      await this.idb.setSyncState('lastSyncTime', Date.now());

      console.log(`[HybridStore] Sync completed, library version: ${result.libraryVersion}`);

      return result;
    } catch (error) {
      console.error('[HybridStore] Sync failed:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  async getVersions(objectType: string, since: number): Promise<Versions> {
    this.ensureReady();

    try {
      return await this.api.getVersions(objectType, since);
    } catch (error) {
      console.error('[HybridStore] getVersions failed:', error);
      // Fall back to local versions
      return await this.idb.getVersions(objectType, since);
    }
  }

  private ensureReady(): void {
    if (!this.ready) {
      throw new Error('HybridStore is not initialized. Call initialize() first.');
    }
  }

  /**
   * Check if online by attempting to fetch from API
   */
  async isOnline(): Promise<boolean> {
    try {
      await this.api.getKeyInfo();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    lastSyncVersion: number;
    lastSyncTime: number;
    isOnline: boolean;
  }> {
    const lastSyncVersion = await this.idb.getSyncState('lastSyncVersion') || 0;
    const lastSyncTime = await this.idb.getSyncState('lastSyncTime') || 0;
    const isOnline = await this.isOnline();

    return {
      lastSyncVersion,
      lastSyncTime,
      isOnline
    };
  }
}
