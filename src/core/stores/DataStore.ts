import type { SyncResult, QueryOptions, Versions } from '../../types';

/**
 * Abstract data store class
 * Defines the contract for different storage implementations
 */
export abstract class DataStore {
  // Query operations
  async query<T>(_type: string, _params?: QueryOptions): Promise<T[]> {
    throw new Error('Method not implemented.');
  }

  async get<T>(_type: string, _id: string | number): Promise<T | null> {
    throw new Error('Method not implemented.');
  }

  // Write operations
  async save<T>(_type: string, _data: T | T[], _files?: File[]): Promise<T | T[]> {
    throw new Error('Method not implemented.');
  }

  async delete(_type: string, _id: string | number): Promise<void> {
    throw new Error('Method not implemented.');
  }

  // Sync operations
  async sync(_since?: number): Promise<SyncResult> {
    throw new Error('Method not implemented.');
  }

  async getVersions(_objectType: string, _since: number): Promise<Versions> {
    throw new Error('Method not implemented.');
  }

  // Initialization
  async initialize(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  isReady(): boolean {
    throw new Error('Method not implemented.');
  }
}
