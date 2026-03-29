import Dexie from 'dexie';
import { DataStore } from './DataStore';
import type { Item, Collection, Tag, SyncResult, QueryOptions, Versions } from '../../types';

/**
 * IndexedDB implementation of DataStore
 * Provides local caching and offline support
 */
export class IndexedDBStore implements DataStore {
  private db: Dexie;
  // @ts-ignore - Dexie tables don't need explicit typing
  private itemsTable: any;
  // @ts-ignore
  private collectionsTable: any;
  // @ts-ignore
  private tagsTable: any;
  // @ts-ignore
  private syncStateTable: any;
  private ready = false;

  constructor(dbName = 'ZoteroWebDB') {
    this.db = new Dexie(dbName);

    // Define database schema
    this.db.version(1).stores({
      items: 'key, version, itemType, dateAdded, dateModified, libraryID',
      collections: 'key, version, name, parentCollection',
      tags: 'tag, type, count',
      syncState: 'key'
    });

    // Get table references
    this.itemsTable = this.db.table('items');
    this.collectionsTable = this.db.table('collections');
    this.tagsTable = this.db.table('tags');
    this.syncStateTable = this.db.table('syncState');
  }

  async initialize(): Promise<void> {
    await this.db.open();
    this.ready = true;
    console.log('[IndexedDBStore] Database initialized');
  }

  isReady(): boolean {
    return this.ready;
  }

  async query<T>(type: string, _params?: QueryOptions): Promise<T[]> {
    this.ensureReady();

    switch (type) {
      case 'item':
        return (await this.itemsTable.toArray()) as T[];
      case 'collection':
        return (await this.collectionsTable.toArray()) as T[];
      case 'tag':
        return (await this.tagsTable.toArray()) as T[];
      default:
        throw new Error(`Unknown type: ${type}`);
    }
  }

  async get<T>(type: string, id: string | number): Promise<T | null> {
    this.ensureReady();

    switch (type) {
      case 'item':
        return (await this.itemsTable.get(id)) as T || null;
      case 'collection':
        return (await this.collectionsTable.get(id)) as T || null;
      case 'tag':
        return (await this.tagsTable.get(id)) as T || null;
      default:
        throw new Error(`Unknown type: ${type}`);
    }
  }

  async save<T>(type: string, data: T | T[]): Promise<T | T[]> {
    this.ensureReady();

    const dataArray = Array.isArray(data) ? data : [data];

    switch (type) {
      case 'item':
        await this.itemsTable.bulkPut(dataArray as Item[]);
        break;
      case 'collection':
        await this.collectionsTable.bulkPut(dataArray as Collection[]);
        break;
      case 'tag':
        await this.tagsTable.bulkPut(dataArray as Tag[]);
        break;
      default:
        throw new Error(`Unknown type: ${type}`);
    }

    return data;
  }

  async delete(type: string, id: string | number): Promise<void> {
    this.ensureReady();

    switch (type) {
      case 'item':
        await this.itemsTable.delete(id as string);
        break;
      case 'collection':
        await this.collectionsTable.delete(id as string);
        break;
      case 'tag':
        await this.tagsTable.delete(id as string);
        break;
      default:
        throw new Error(`Unknown type: ${type}`);
    }
  }

  async sync(since?: number): Promise<SyncResult> {
    this.ensureReady();

    const lastSyncVersion = since || (await this.getSyncState('lastSyncVersion')) || 0;

    return {
      libraryVersion: lastSyncVersion,
      items: await this.itemsTable.toArray(),
      collections: await this.collectionsTable.toArray(),
      tags: await this.tagsTable.toArray(),
      deletions: {}
    };
  }

  async getVersions(objectType: string, since: number): Promise<Versions> {
    this.ensureReady();

    const versions: Record<string, number> = {};

    switch (objectType) {
      case 'item':
        const items = await this.itemsTable.toArray();
        items.forEach((item: any) => {
          if (item.version > since) {
            versions[item.key] = item.version;
          }
        });
        break;
      case 'collection':
        const collections = await this.collectionsTable.toArray();
        collections.forEach((collection: any) => {
          if (collection.version > since) {
            versions[collection.key] = collection.version;
          }
        });
        break;
    }

    return {
      libraryVersion: since,
      versions
    };
  }

  private ensureReady(): void {
    if (!this.ready) {
      throw new Error('IndexedDBStore is not initialized. Call initialize() first.');
    }
  }

  async getSyncState(key: string): Promise<number> {
    const state = await this.syncStateTable.get(key);
    return state?.value || 0;
  }

  async setSyncState(key: string, value: any): Promise<void> {
    await this.syncStateTable.put({ key, value });
  }

  async clear(): Promise<void> {
    this.ensureReady();
    await this.itemsTable.clear();
    await this.collectionsTable.clear();
    await this.tagsTable.clear();
    await this.syncStateTable.clear();
  }
}
