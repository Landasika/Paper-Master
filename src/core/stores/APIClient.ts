import { ZoteroAPI } from '../api/ZoteroAPI';
import { DataStore } from './DataStore';
import type { SyncResult, QueryOptions, Versions } from '../../types';

/**
 * API Client implementation of DataStore
 * Fetches data directly from Zotero API without caching
 */
export class APIClient implements DataStore {
  private api: ZoteroAPI;
  private ready = false;

  constructor(apiKey: string, options?: { userID?: string; groupID?: string }) {
    this.api = new ZoteroAPI(apiKey, options);
  }

  async initialize(): Promise<void> {
    // Verify API key
    await this.api.getKeyInfo();
    this.ready = true;
    console.log('[APIClient] Initialized');
  }

  isReady(): boolean {
    return this.ready;
  }

  async getKeyInfo() {
    return await this.api.getKeyInfo();
  }

  async query<T>(type: string, params?: QueryOptions): Promise<T[]> {
    this.ensureReady();

    switch (type) {
      case 'item':
        return (await this.api.getItems(params)) as T[];
      case 'collection':
        return (await this.api.getCollections()) as T[];
      case 'tag':
        return (await this.api.getTags()) as T[];
      default:
        throw new Error(`Unknown type: ${type}`);
    }
  }

  async get<T>(_type: string, _id: string | number): Promise<T | null> {
    this.ensureReady();
    // TODO: Implement get by ID
    return null;
  }

  async save<T>(_type: string, data: T | T[]): Promise<T | T[]> {
    this.ensureReady();

    const dataArray = Array.isArray(data) ? data : [data];

    if (_type === 'item') {
      if ((dataArray[0] as any).key) {
        // Update existing items
        for (const item of dataArray) {
          await this.api.updateItem(item as any);
        }
      } else {
        // Create new items
        const results = await Promise.all(
          dataArray.map(item => this.api.createItem(item as any))
        );
        return (Array.isArray(data) ? results : results[0]) as T | T[];
      }
    }

    return data;
  }

  async delete(_type: string, id: string | number): Promise<void> {
    this.ensureReady();

    if (_type === 'item') {
      await this.api.deleteItem(id.toString());
    }
  }

  async sync(since?: number): Promise<SyncResult> {
    this.ensureReady();

    const sinceVersion = since || 0;

    const [items, collections, tags] = await Promise.all([
      this.api.getItems({ since: sinceVersion }),
      this.api.getCollections(),
      this.api.getTags()
    ]);

    return {
      libraryVersion: Date.now(),
      items: items as any[],
      collections: collections as any[],
      tags: tags as any[],
      deletions: {}
    };
  }

  async getVersions(objectType: string, since: number): Promise<Versions> {
    this.ensureReady();

    const versions = await this.api.getVersions(objectType, since);
    return {
      libraryVersion: Date.now(),
      versions
    };
  }

  private ensureReady(): void {
    if (!this.ready) {
      throw new Error('APIClient is not initialized. Call initialize() first.');
    }
  }
}
