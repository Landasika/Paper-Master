import { DataObject } from './DataObject';
import type { DataStore } from '../stores/DataStore';

/**
 * Zotero Collection class
 * Represents a collection in a library
 */
export class Collection extends DataObject {
  private _name: string;
  private _parentKey: string | null = null;
  private _relations: Record<string, any> = {};

  constructor(dataStore: DataStore) {
    super(dataStore);
    this._name = '';
  }

  get objectType(): string {
    return 'collection';
  }

  /**
   * Collection name
   */
  get name(): string {
    return this._name;
  }

  set name(value: string) {
    this._setField('name', value);
  }

  /**
   * Parent collection key
   */
  get parentKey(): string | null {
    return this._parentKey;
  }

  set parentKey(value: string | null) {
    if (this._parentKey !== value) {
      this._parentKey = value;
      this._changed['primaryData'] = true;
      this._changed['parentCollection'] = true;
    }
  }

  /**
   * Relations (RDF relationships)
   */
  get relations(): Record<string, any> {
    return { ...this._relations };
  }

  set relations(value: Record<string, any>) {
    this._relations = value;
    this._changed['relations'] = true;
  }

  addRelation(predicate: string, object: string): void {
    if (!this._relations[predicate]) {
      this._relations[predicate] = [];
    }
    if (!this._relations[predicate].includes(object)) {
      this._relations[predicate].push(object);
      this._changed['relations'] = true;
    }
  }

  removeRelation(predicate: string, object: string): void {
    if (this._relations[predicate]) {
      const index = this._relations[predicate].indexOf(object);
      if (index > -1) {
        this._relations[predicate].splice(index, 1);
        this._changed['relations'] = true;
      }
    }
  }

  /**
   * Check if collection has child collections
   */
  hasChildCollections(): boolean {
    // This would require querying the data store
    // For now, return false
    return false;
  }

  /**
   * Get child collections
   */
  getChildCollections(): Collection[] {
    // This would require querying the data store
    // For now, return empty array
    return [];
  }

  /**
   * Check if collection has child items
   */
  hasChildItems(): boolean {
    // This would require querying the data store
    // For now, return false
    return false;
  }

  /**
   * Get child items
   */
  getChildItems(): any[] {
    // This would require querying the data store
    // For now, return empty array
    return [];
  }

  /**
   * Add subclass-specific properties to JSON
   */
  protected addJSONProperties(json: any): void {
    json.name = this._name;
    json.parentCollection = this._parentKey || false;

    if (Object.keys(this._relations).length > 0) {
      json.relations = this._relations;
    }
  }

  /**
   * Load subclass-specific properties from JSON
   */
  protected loadJSONProperties(json: any): void {
    this._name = json.name || '';
    this._parentKey = json.parentCollection || null;
    this._relations = json.relations || {};

    this._loaded['primaryData'] = true;
    this._loaded['relations'] = true;
  }

  /**
   * Get collection hierarchy path
   */
  getHierarchyPath(): string[] {
    // This would require traversing parent collections
    // For now, return just this collection's name
    return [this._name];
  }

  /**
   * Clone collection
   */
  clone(): Collection {
    const cloned = new Collection(this.dataStore);
    cloned._name = this._name + ' (Copy)';
    cloned._parentKey = this._parentKey;
    cloned._relations = { ...this._relations };
    return cloned;
  }
}
