/**
 * Zotero Item - 基于桌面版设计
 * 参考: /root/coder/zotero/chrome/content/zotero/xpcom/data/item.js
 */

import zoteroDB from '../database/ZoteroDB';

export interface Creator {
  creatorType: string;
  firstName: string;
  lastName: string;
}

export interface Note {
  note: string;
  title?: string;
}

export class ZoteroItem {
  // 主键
  private _itemID: number | null = null;
  private _libraryID: number = 1;
  private _key: string = '';

  // 基础属性
  private _itemType: string = 'book';
  private _dateAdded: string = '';
  private _dateModified: string = '';
  private _version: number = 0;
  private _synced: boolean = false;
  private _deleted: boolean = false;

  // 条目字段
  private _title: string = '';
  private _abstractNote: string = '';
  private _date: string = '';
  private _year: number | null = null;
  private _publisher: string = '';
  private _publicationTitle: string = '';
  private _volume: string = '';
  private _issue: string = '';
  private _pages: string = '';
  // @ts-ignore - Reserved for future use
  private _series: string = '';
  // @ts-ignore - Reserved for future use
  private _seriesTitle: string = '';
  private _url: string = '';
  private _DOI: string = '';
  private _ISBN: string = '';
  private _ISSN: string = '';
  private _extra: string = '';

  // 创作者
  private _creators: Creator[] = [];

  // 标签
  private _tags: string[] = [];

  // 笔记
  private _notes: Note[] = [];

  // 附件
  // @ts-ignore - Reserved for future use
  private _attachments: any[] = [];

  // 加载状态
  private _loaded: { primaryData: boolean; creatorData: boolean } = {
    primaryData: false,
    creatorData: false
  };

  constructor(itemTypeOrID?: string | number) {
    if (typeof itemTypeOrID === 'string') {
      this._itemType = itemTypeOrID;
      this._key = this._generateKey();
      this._dateAdded = new Date().toISOString();
      this._dateModified = this._dateAdded;
    } else if (typeof itemTypeOrID === 'number') {
      this._itemID = itemTypeOrID;
    }
  }

  // ========== 属性访问器 ==========

  get itemID(): number | null { return this._itemID; }
  get libraryID(): number { return this._libraryID; }
  get key(): string { return this._key; }
  get itemType(): string { return this._itemType; }
  get dateAdded(): string { return this._dateAdded; }
  get dateModified(): string { return this._dateModified; }
  get version(): number { return this._version; }
  get synced(): boolean { return this._synced; }
  get deleted(): boolean { return this._deleted; }

  get title(): string { return this._title; }
  get abstractNote(): string { return this._abstractNote; }
  get creators(): Creator[] { return this._creators; }
  get tags(): string[] { return this._tags; }
  get notes(): Note[] { return this._notes; }

  set itemType(value: string) { this._setField('itemType', value); }
  set title(value: string) { this._setField('title', value); }
  set abstractNote(value: string) { this._setField('abstractNote', value); }
  set date(value: string) { this._setField('date', value); }
  set year(value: number | null) { this._setField('year', value); }
  set publisher(value: string) { this._setField('publisher', value); }
  set publicationTitle(value: string) { this._setField('publicationTitle', value); }
  set volume(value: string) { this._setField('volume', value); }
  set issue(value: string) { this._setField('issue', value); }
  set pages(value: string) { this._setField('pages', value); }
  set url(value: string) { this._setField('url', value); }
  set DOI(value: string) { this._setField('DOI', value); }
  set ISBN(value: string) { this._setField('ISBN', value); }
  set ISSN(value: string) { this._setField('ISSN', value); }
  set extra(value: string) { this._setField('extra', value); }

  get libraryKey(): string {
    return `${this._libraryID}/${this._key}`;
  }

  // ========== 数据操作 ==========

  /**
   * 设置字段值
   */
  private _setField(field: string, value: any): void {
    const fieldName = `_${field}` as keyof ZoteroItem;
    if (this[fieldName] === value) return;

    (this as any)[fieldName] = value;
    this._dateModified = new Date().toISOString();
  }

  /**
   * 添加创作者
   */
  addCreator(creator: Creator): void {
    this._creators.push(creator);
    this._dateModified = new Date().toISOString();
  }

  /**
   * 移除创作者
   */
  removeCreator(index: number): void {
    this._creators.splice(index, 1);
    this._dateModified = new Date().toISOString();
  }

  /**
   * 设置创作者列表
   */
  setCreators(creators: Creator[]): void {
    this._creators = creators;
    this._dateModified = new Date().toISOString();
  }

  /**
   * 添加标签
   */
  addTag(tag: string): void {
    if (!this._tags.includes(tag)) {
      this._tags.push(tag);
      this._dateModified = new Date().toISOString();
    }
  }

  /**
   * 移除标签
   */
  removeTag(tag: string): void {
    const index = this._tags.indexOf(tag);
    if (index > -1) {
      this._tags.splice(index, 1);
      this._dateModified = new Date().toISOString();
    }
  }

  /**
   * 设置标签列表
   */
  setTags(tags: string[]): void {
    this._tags = tags;
    this._dateModified = new Date().toISOString();
  }

  /**
   * 添加笔记
   */
  addNote(note: Note): void {
    this._notes.push(note);
    this._dateModified = new Date().toISOString();
  }

  // ========== 数据库操作 ==========

  /**
   * 保存到数据库
   */
  async save(): Promise<void> {
    try {
      await zoteroDB.init();

      if (this._itemID) {
        // 更新现有条目
        await this._update();
      } else {
        // 创建新条目
        await this._insert();
      }

      // 保存创作者
      await this._saveCreators();

      // 保存标签
      await this._saveTags();

      this._synced = true;
    } catch (error) {
      console.error('[ZoteroItem] 保存失败:', error);
      throw error;
    }
  }

  /**
   * 从数据库加载
   */
  async load(itemID: number): Promise<void> {
    try {
      await zoteroDB.init();

      const results = zoteroDB.query(
        'SELECT * FROM items WHERE itemID = ?',
        [itemID]
      );

      if (results.length === 0) {
        throw new Error('Item not found');
      }

      const row = results[0];
      this._itemID = row.itemID;
      this._libraryID = row.libraryID;
      this._key = row.key;
      this._itemType = row.itemType;
      this._dateAdded = row.dateAdded;
      this._dateModified = row.dateModified;
      this._version = row.version;
      this._synced = !!row.synced;
      this._deleted = !!row.deleted;

      // 加载字段
      this._title = row.title || '';
      this._abstractNote = row.abstractNote || '';
      this._date = row.date || '';
      this._year = row.year;
      this._publisher = row.publisher || '';
      this._publicationTitle = row.publicationTitle || '';
      this._volume = row.volume || '';
      this._issue = row.issue || '';
      this._pages = row.pages || '';
      this._url = row.url || '';
      this._DOI = row.DOI || '';
      this._ISBN = row.ISBN || '';
      this._ISSN = row.ISSN || '';
      this._extra = row.extra || '';

      // 加载创作者
      await this._loadCreators();

      // 加载标签
      await this._loadTags();

      this._loaded.primaryData = true;
    } catch (error) {
      console.error('[ZoteroItem] 加载失败:', error);
      throw error;
    }
  }

  /**
   * 删除条目
   */
  async erase(): Promise<void> {
    if (!this._itemID) return;

    try {
      await zoteroDB.init();
      zoteroDB.run('DELETE FROM items WHERE itemID = ?', [this._itemID]);
      this._deleted = true;
    } catch (error) {
      console.error('[ZoteroItem] 删除失败:', error);
      throw error;
    }
  }

  // ========== 私有方法 ==========

  private async _insert(): Promise<void> {
    const result = zoteroDB.run(`
      INSERT INTO items (
        libraryID, key, itemType, dateAdded, dateModified, version,
        title, abstractNote, date, year, publisher, publicationTitle,
        volume, issue, pages, url, DOI, ISBN, ISSN, extra
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      this._libraryID,
      this._key,
      this._itemType,
      this._dateAdded,
      this._dateModified,
      this._version,
      this._title,
      this._abstractNote,
      this._date,
      this._year,
      this._publisher,
      this._publicationTitle,
      this._volume,
      this._issue,
      this._pages,
      this._url,
      this._DOI,
      this._ISBN,
      this._ISSN,
      this._extra
    ]);

    this._itemID = result.lastID;
  }

  private async _update(): Promise<void> {
    zoteroDB.run(`
      UPDATE items SET
        dateModified = ?, version = ?, title = ?, abstractNote = ?,
        date = ?, year = ?, publisher = ?, publicationTitle = ?,
        volume = ?, issue = ?, pages = ?, url = ?,
        DOI = ?, ISBN = ?, ISSN = ?, extra = ?
      WHERE itemID = ?
    `, [
      this._dateModified,
      this._version,
      this._title,
      this._abstractNote,
      this._date,
      this._year,
      this._publisher,
      this._publicationTitle,
      this._volume,
      this._issue,
      this._pages,
      this._url,
      this._DOI,
      this._ISBN,
      this._ISSN,
      this._extra,
      this._itemID
    ]);
  }

  private async _saveCreators(): Promise<void> {
    if (!this._itemID) return;

    // 删除旧创作者
    zoteroDB.run('DELETE FROM creators WHERE itemID = ?', [this._itemID]);

    // 插入新创作者
    this._creators.forEach((creator, index) => {
      zoteroDB.run(`
        INSERT INTO creators (itemID, creatorType, firstName, lastName, orderIndex)
        VALUES (?, ?, ?, ?, ?)
      `, [this._itemID, creator.creatorType, creator.firstName, creator.lastName, index]);
    });
  }

  private async _loadCreators(): Promise<void> {
    if (!this._itemID) return;

    const results = zoteroDB.query(
      'SELECT * FROM creators WHERE itemID = ? ORDER BY orderIndex',
      [this._itemID]
    );

    this._creators = results.map(row => ({
      creatorType: row.creatorType,
      firstName: row.firstName || '',
      lastName: row.lastName || ''
    }));
  }

  private async _saveTags(): Promise<void> {
    if (!this._itemID) return;

    // 删除旧标签关联
    zoteroDB.run('DELETE FROM item_tags WHERE itemID = ?', [this._itemID]);

    // 插入新标签
    for (const tagName of this._tags) {
      // 确保标签存在
      let tagResults = zoteroDB.query('SELECT tagID FROM tags WHERE name = ?', [tagName]);
      let tagID: number;

      if (tagResults.length === 0) {
        // 创建新标签
        const result = zoteroDB.run(`
          INSERT INTO tags (libraryID, name, dateAdded, dateModified)
          VALUES (?, ?, ?, ?)
        `, [this._libraryID, tagName, this._dateAdded, this._dateModified]);
        tagID = result.lastID;
      } else {
        tagID = tagResults[0].tagID;
      }

      // 关联标签
      zoteroDB.run('INSERT OR IGNORE INTO item_tags (itemID, tagID) VALUES (?, ?)', [this._itemID, tagID]);
    }
  }

  private async _loadTags(): Promise<void> {
    if (!this._itemID) return;

    const results = zoteroDB.query(`
      SELECT t.name FROM tags t
      JOIN item_tags it ON t.tagID = it.tagID
      WHERE it.itemID = ?
    `, [this._itemID]);

    this._tags = results.map(row => row.name);
  }

  private _generateKey(): string {
    return `${this._itemType.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ========== JSON序列化 ==========

  toJSON(): any {
    return {
      itemType: this._itemType,
      title: this._title,
      creators: this._creators,
      date: this._date,
      publisher: this._publisher,
      publicationTitle: this._publicationTitle,
      DOI: this._DOI,
      ISBN: this._ISBN,
      tags: this._tags,
      abstractNote: this._abstractNote
    };
  }
}

export default ZoteroItem;
