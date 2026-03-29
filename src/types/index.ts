// Core data types for Paper-Master

export interface Item {
  key: string;
  version: number;
  itemType: string;
  dateAdded: string;
  dateModified: string;
  [key: string]: any;
}

export interface Collection {
  key: string;
  version: number;
  name: string;
  parentCollection: boolean | string;
  relations: Record<string, any>;
}

export interface Tag {
  tag: string;
  type: number;
  count?: number;
}

export interface Library {
  id: number;
  type: 'user' | 'group';
  name: string;
}

export interface SyncResult {
  libraryVersion: number;
  items: Item[];
  collections: Collection[];
  tags: Tag[];
  deletions: Record<string, string[]>;
}

export interface QueryOptions {
  since?: number;
  limit?: number;
  start?: number;
  offset?: number;
  search?: string;
  include?: string[];
}

export interface Versions {
  libraryVersion: number;
  versions: Record<string, number>;
}

export interface UserInfo {
  userID: number;
  username: string;
  displayName: string;
  type: 'user' | 'group';
  access: Record<string, any>;
}
