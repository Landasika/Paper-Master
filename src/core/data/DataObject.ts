import type { DataStore } from '../stores/DataStore';

/**
 * Base class for all Zotero data objects
 * Ported from desktop version with XPCOM dependencies removed
 */
export abstract class DataObject {
  [key: string]: any;  // Index signature to allow dynamic property access
  protected _id: string;
  protected _key: string;
  protected _libraryID: number;
  protected _dateAdded: string;
  protected _dateModified: string;
  protected _version: number;
  protected _synced: boolean;
  protected _loaded: Record<string, boolean> = {};
  protected _changed: Record<string, boolean> = {};
  protected _changedData: Record<string, any> = {};
  protected _previousData: Record<string, any> = {};

  // Reference to data store for persistence
  protected dataStore: DataStore;

  constructor(dataStore: DataStore) {
    this.dataStore = dataStore;
    this._id = '';
    this._key = '';
    this._libraryID = 0;
    this._dateAdded = '';
    this._dateModified = '';
    this._version = 0;
    this._synced = true;
  }

  /**
   * Object ID
   */
  get id(): string {
    return this._id;
  }

  set id(value: string) {
    this._setIdentifier('id', value);
  }

  /**
   * Object key (unique identifier)
   */
  get key(): string {
    return this._key;
  }

  set key(value: string) {
    this._setIdentifier('key', value);
  }

  /**
   * Library ID
   */
  get libraryID(): number {
    return this._libraryID;
  }

  set libraryID(value: number) {
    this._setIdentifier('libraryID', value);
  }

  /**
   * Date added
   */
  get dateAdded(): string {
    return this._dateAdded;
  }

  set dateAdded(value: string) {
    this._setField('dateAdded', value);
  }

  /**
   * Date modified
   */
  get dateModified(): string {
    return this._dateModified;
  }

  set dateModified(value: string) {
    this._setField('dateModified', value);
  }

  /**
   * Version number for sync
   */
  get version(): number {
    return this._version;
  }

  set version(value: number) {
    this._version = value;
  }

  /**
   * Sync status
   */
  get synced(): boolean {
    return this._synced;
  }

  set synced(value: boolean) {
    this._synced = value;
  }

  /**
   * Check if object has changed
   */
  hasChanged(): boolean {
    const changed = Object.keys(this._changed).filter(
      dataType => this._changed[dataType]
    ).concat(Object.keys(this._changedData));
    return changed.length > 0;
  }

  /**
   * Get changed data
   */
  getChangedData(): Record<string, any> {
    return { ...this._changedData };
  }

  /**
   * Clear changed state
   */
  clearChanged(): void {
    this._changed = {};
    this._changedData = {};
    this._previousData = {};
  }

  /**
   * Save object to data store
   */
  async save(): Promise<void> {
    await this.dataStore.save(this.objectType, this);
    this.clearChanged();
    this._synced = true;
  }

  /**
   * Delete object from data store
   */
  async erase(): Promise<void> {
    await this.dataStore.delete(this.objectType, this.id);
  }

  /**
   * Convert to JSON
   */
  toJSON(): any {
    const json: any = {
      key: this._key,
      version: this._version,
      dateAdded: this._dateAdded,
      dateModified: this._dateModified
    };

    // Add subclass-specific properties
    this.addJSONProperties(json);

    return json;
  }

  /**
   * Load from JSON
   */
  fromJSON(json: any): void {
    this._key = json.key;
    this._version = json.version;
    this._dateAdded = json.dateAdded;
    this._dateModified = json.dateModified;

    // Load subclass-specific properties
    this.loadJSONProperties(json);

    this._loaded['primaryData'] = true;
  }

  /**
   * Get object type (to be implemented by subclasses)
   */
  abstract get objectType(): string;

  /**
   * Add subclass-specific properties to JSON
   */
  protected addJSONProperties(_json: any): void {
    // Override in subclasses
  }

  /**
   * Load subclass-specific properties from JSON
   */
  protected loadJSONProperties(_json: any): void {
    // Override in subclasses
  }

  /**
   * Set identifier field
   */
  protected _setIdentifier(field: string, value: any): void {
    if (this[field] === value) return;

    const oldValue = this[field];
    this[field] = value;

    if (oldValue) {
      this._previousData[field] = oldValue;
    }
  }

  /**
   * Set data field
   */
  protected _setField(field: string, value: any, options: { dontMarkAsChanged?: boolean } = {}): void {
    if (this[field] === value) return;

    const oldValue = this[field];
    this[field] = value;

    if (!options.dontMarkAsChanged) {
      this._changedData[field] = true;
      this._changed['primaryData'] = true;

      if (oldValue !== undefined) {
        this._previousData[field] = oldValue;
      }
    }
  }

  /**
   * Require data to be loaded
   */
  protected _requireData(dataType: string): void {
    if (!this._loaded[dataType]) {
      throw new Error(`${dataType} not loaded for object ${this._key}`);
    }
  }
}
