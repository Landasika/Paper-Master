import { DataObject } from './DataObject';
import type { DataStore } from '../stores/DataStore';

/**
 * Zotero Item class
 * Represents a single item (book, article, etc.) in a library
 */
export class Item extends DataObject {
  private _itemType: string;
  private _title: string;
  private _creators: any[] = [];
  private _fields: Record<string, string> = {};
  private _tags: string[] = [];
  private _collections: string[] = [];
  private _parentKey: string | null = null;
  private _note: string = '';

  constructor(dataStore: DataStore) {
    super(dataStore);
    this._itemType = '';
    this._title = '';
  }

  get objectType(): string {
    return 'item';
  }

  /**
   * Item type (book, article, journal, etc.)
   */
  get itemType(): string {
    return this._itemType;
  }

  set itemType(value: string) {
    this._setField('itemType', value);
  }

  /**
   * Item title
   */
  get title(): string {
    return this._title;
  }

  set title(value: string) {
    this._setField('title', value);
  }

  /**
   * Creators (authors, editors, etc.)
   */
  get creators(): any[] {
    this._requireData('creators');
    return this._creators;
  }

  set creators(value: any[]) {
    this._creators = value;
    this._changed['creators'] = true;
  }

  /**
   * Fields (publisher, year, pages, etc.)
   */
  getFields(): Record<string, string> {
    this._requireData('fields');
    return { ...this._fields };
  }

  getField(field: string): string {
    this._requireData('fields');
    return this._fields[field] || '';
  }

  setField(field: string, value: string): void {
    this._requireData('fields');
    if (this._fields[field] !== value) {
      this._previousData[field] = this._fields[field];
      this._fields[field] = value;
      this._changedData[field] = true;
      this._changed['fields'] = true;
    }
  }

  /**
   * Tags
   */
  get tags(): string[] {
    this._requireData('tags');
    return this._tags;
  }

  set tags(value: string[]) {
    this._tags = value;
    this._changed['tags'] = true;
  }

  addTag(tag: string): void {
    if (!this._tags.includes(tag)) {
      this._tags.push(tag);
      this._changed['tags'] = true;
    }
  }

  removeTag(tag: string): void {
    const index = this._tags.indexOf(tag);
    if (index > -1) {
      this._tags.splice(index, 1);
      this._changed['tags'] = true;
    }
  }

  /**
   * Collections this item belongs to
   */
  get collections(): string[] {
    return this._collections;
  }

  set collections(value: string[]) {
    this._collections = value;
    this._changed['collections'] = true;
  }

  addToCollection(collectionKey: string): void {
    if (!this._collections.includes(collectionKey)) {
      this._collections.push(collectionKey);
      this._changed['collections'] = true;
    }
  }

  removeFromCollection(collectionKey: string): void {
    const index = this._collections.indexOf(collectionKey);
    if (index > -1) {
      this._collections.splice(index, 1);
      this._changed['collections'] = true;
    }
  }

  /**
   * Parent item (for notes, attachments)
   */
  get parentKey(): string | null {
    return this._parentKey;
  }

  set parentKey(value: string | null) {
    this._parentKey = value;
    this._changed['primaryData'] = true;
  }

  /**
   * Note content
   */
  get note(): string {
    return this._note;
  }

  set note(value: string) {
    if (this._note !== value) {
      this._note = value;
      this._changed['note'] = true;
    }
  }

  /**
   * Add subclass-specific properties to JSON
   */
  protected addJSONProperties(json: any): void {
    json.itemType = this._itemType;
    json.title = this._title;

    if (this._creators.length > 0) {
      json.creators = this._creators;
    }

    if (Object.keys(this._fields).length > 0) {
      Object.assign(json, this._fields);
    }

    if (this._tags.length > 0) {
      json.tags = this._tags.map(tag => ({ tag }));
    }

    if (this._collections.length > 0) {
      json.collections = this._collections;
    }

    if (this._parentKey) {
      json.parentItem = this._parentKey;
    }

    if (this._note) {
      json.note = this._note;
    }
  }

  /**
   * Load subclass-specific properties from JSON
   */
  protected loadJSONProperties(json: any): void {
    this._itemType = json.itemType || json.data?.itemType || '';
    this._title = json.title || json.data?.title || '';
    this._creators = json.creators || [];
    this._tags = (json.tags || []).map((t: any) => typeof t === 'string' ? t : t.tag);
    this._collections = json.collections || [];
    this._parentKey = json.parentItem || null;
    this._note = json.note || '';

    // Load fields
    if (json.data) {
      for (const [key, value] of Object.entries(json.data)) {
        if (!['itemType', 'title'].includes(key)) {
          this._fields[key] = value as string;
        }
      }
    }

    this._loaded['creators'] = true;
    this._loaded['fields'] = true;
    this._loaded['tags'] = true;
    this._loaded['collections'] = true;
  }

  /**
   * Check if item is a note
   */
  isNote(): boolean {
    return this._itemType === 'note';
  }

  /**
   * Check if item is an attachment
   */
  isAttachment(): boolean {
    return this._itemType === 'attachment';
  }

  /**
   * Check if item is top-level (not a note or attachment)
   */
  isTopLevelItem(): boolean {
    return !this.isNote() && !this.isAttachment();
  }

  /**
   * Get display title
   */
  getDisplayTitle(): string {
    if (this._title) {
      return this._title;
    }

    if (this.isNote()) {
      const noteText = this._note.replace(/<[^>]+>/g, '').trim();
      return noteText.substring(0, 100) || 'Untitled Note';
    }

    if (this.isAttachment()) {
      return 'Attachment';
    }

    return 'Untitled';
  }
}
