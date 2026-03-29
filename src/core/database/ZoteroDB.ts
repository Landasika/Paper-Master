/**
 * SQLite Database Layer for Paper-Master
 * Uses sql.js (SQLite in browser)
 */

import initSqlJs from 'sql.js';
// @ts-ignore - sql.js types
import type { Database, SqlJsStatic } from 'sql.js';

export class ZoteroDB {
  private db: Database | null = null;
  private SQL: SqlJsStatic | null = null;
  private initialized: boolean = false;
  private transactionInProgress: boolean = false;

  constructor() {
    this.init();
  }

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // 初始化 sql.js - 使用本地WASM文件
      this.SQL = await initSqlJs({
        locateFile: file => `/dist/${file}`
      });

      // 创建或加载数据库
      const savedData = localStorage.getItem('zotero_web_db');
      if (savedData) {
        // 从localStorage加载现有数据库
        const uint8Array = new Uint8Array(JSON.parse(savedData));
        this.db = new this.SQL.Database(uint8Array);
        console.log('[ZoteroDB] 已加载现有数据库');
      } else {
        // 创建新数据库
        this.db = new this.SQL.Database();
        await this.createSchema();
        console.log('[ZoteroDB] 已创建新数据库');
      }

      this.initialized = true;
    } catch (error) {
      console.error('[ZoteroDB] 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 创建数据库Schema
   * 参考桌面版 schema.js
   */
  private async createSchema(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // 创建版本表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS version (
        schema TEXT PRIMARY KEY,
        version INTEGER
      )
    `);

    // 创建items表 (参考桌面版item结构)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS items (
        itemID INTEGER PRIMARY KEY,
        libraryID INTEGER NOT NULL,
        key TEXT NOT NULL UNIQUE,
        itemType TEXT NOT NULL,
        dateAdded TEXT NOT NULL,
        dateModified TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        synced BOOLEAN DEFAULT 0,
        title TEXT,
        abstractNote TEXT,
        date TEXT,
        year INTEGER,
        publisher TEXT,
        publicationTitle TEXT,
        volume TEXT,
        issue TEXT,
        pages TEXT,
        series TEXT,
        seriesTitle TEXT,
        seriesText TEXT,
        url TEXT,
        DOI TEXT,
        ISBN TEXT,
        ISSN TEXT,
        extra TEXT,
        deleted BOOLEAN DEFAULT 0
      )
    `);

    // 创建creators表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS creators (
        creatorID INTEGER PRIMARY KEY,
        itemID INTEGER NOT NULL,
        creatorType TEXT,
        firstName TEXT,
        lastName TEXT,
        orderIndex INTEGER,
        FOREIGN KEY (itemID) REFERENCES items(itemID) ON DELETE CASCADE
      )
    `);

    // 创建collections表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS collections (
        collectionID INTEGER PRIMARY KEY,
        libraryID INTEGER NOT NULL,
        key TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        parentCollectionID INTEGER,
        dateAdded TEXT NOT NULL,
        dateModified TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        synced BOOLEAN DEFAULT 0,
        deleted BOOLEAN DEFAULT 0,
        FOREIGN KEY (parentCollectionID) REFERENCES collections(collectionID)
      )
    `);

    // 创建collection_items表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS collection_items (
        collectionID INTEGER NOT NULL,
        itemID INTEGER NOT NULL,
        orderIndex INTEGER DEFAULT 0,
        PRIMARY KEY (collectionID, itemID),
        FOREIGN KEY (collectionID) REFERENCES collections(collectionID) ON DELETE CASCADE,
        FOREIGN KEY (itemID) REFERENCES items(itemID) ON DELETE CASCADE
      )
    `);

    // 创建tags表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS tags (
        tagID INTEGER PRIMARY KEY,
        libraryID INTEGER NOT NULL,
        name TEXT NOT NULL,
        type INTEGER DEFAULT 0,
        dateAdded TEXT NOT NULL,
        dateModified TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        synced BOOLEAN DEFAULT 0,
        deleted BOOLEAN DEFAULT 0
      )
    `);

    // 创建item_tags表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS item_tags (
        itemID INTEGER NOT NULL,
        tagID INTEGER NOT NULL,
        PRIMARY KEY (itemID, tagID),
        FOREIGN KEY (itemID) REFERENCES items(itemID) ON DELETE CASCADE,
        FOREIGN KEY (tagID) REFERENCES tags(tagID) ON DELETE CASCADE
      )
    `);

    // 创建attachments表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS attachments (
        attachmentID INTEGER PRIMARY KEY,
        itemID INTEGER NOT NULL,
        key TEXT NOT NULL UNIQUE,
        title TEXT,
        filename TEXT NOT NULL,
        contentType TEXT,
        size INTEGER,
        linkMode TEXT DEFAULT 'imported_file',
        localPath TEXT,
        remotePath TEXT,
        syncStatus TEXT DEFAULT 'local_only',
        dateAdded TEXT NOT NULL,
        dateModified TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        synced BOOLEAN DEFAULT 0,
        deleted BOOLEAN DEFAULT 0,
        FOREIGN KEY (itemID) REFERENCES items(itemID) ON DELETE CASCADE
      )
    `);

    // 设置初始版本
    this.db.run("INSERT OR REPLACE INTO version (schema, version) VALUES ('userdata', 1)");
    this.db.run("INSERT OR REPLACE INTO version (schema, version) VALUES ('compatibility', 1)");

    // 创建索引
    this.db.run('CREATE INDEX IF NOT EXISTS items_key ON items(key)');
    this.db.run('CREATE INDEX IF NOT EXISTS items_libraryID ON items(libraryID)');
    this.db.run('CREATE INDEX IF NOT EXISTS items_itemType ON items(itemType)');
    this.db.run('CREATE INDEX IF NOT EXISTS collections_key ON collections(key)');
    this.db.run('CREATE INDEX IF NOT EXISTS tags_name ON tags(name)');
  }

  /**
   * 执行查询
   */
  query(sql: string, params: any[] = []): any[] {
    this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const results: any[] = [];
    const stmt = this.db.prepare(sql);
    stmt.bind(params);

    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    return results;
  }

  /**
   * 执行更新操作
   */
  run(sql: string, params: any[] = []): { lastID: number; changes: number } {
    this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(sql, params);
    return {
      lastID: 0,
      changes: 1
    };
  }

  /**
   * 开始事务
   */
  async beginTransaction(): Promise<void> {
    if (this.transactionInProgress) {
      throw new Error('Transaction already in progress');
    }
    this.run('BEGIN TRANSACTION');
    this.transactionInProgress = true;
  }

  /**
   * 提交事务
   */
  async commitTransaction(): Promise<void> {
    if (!this.transactionInProgress) {
      throw new Error('No transaction in progress');
    }
    this.run('COMMIT');
    this.transactionInProgress = false;
    await this.save();
  }

  /**
   * 回滚事务
   */
  async rollbackTransaction(): Promise<void> {
    if (!this.transactionInProgress) {
      throw new Error('No transaction in progress');
    }
    this.run('ROLLBACK');
    this.transactionInProgress = false;
  }

  /**
   * 保存数据库到localStorage
   */
  async save(): Promise<void> {
    if (!this.db) return;

    try {
      const data = this.db.export();
      const json = JSON.stringify(Array.from(data));
      localStorage.setItem('zotero_web_db', json);
    } catch (error) {
      console.error('[ZoteroDB] 保存失败:', error);
    }
  }

  /**
   * 获取数据库版本
   */
  getSchemaVersion(schema: string): number {
    const result = this.query('SELECT version FROM version WHERE schema = ?', [schema]);
    return result.length > 0 ? result[0].version : 0;
  }

  /**
   * 检查是否已初始化
   */
  ensureInitialized(): void {
    if (!this.initialized || !this.db) {
      throw new Error('Database not initialized');
    }
  }

  /**
   * 关闭数据库
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.save();
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): { items: number; collections: number; tags: number; size: number } {
    const itemCount = this.query('SELECT COUNT(*) as count FROM items')[0].count;
    const collectionCount = this.query('SELECT COUNT(*) as count FROM collections')[0].count;
    const tagCount = this.query('SELECT COUNT(*) as count FROM tags')[0].count;

    const dataSize = localStorage.getItem('zotero_web_db')?.length || 0;

    return {
      items: itemCount,
      collections: collectionCount,
      tags: tagCount,
      size: dataSize
    };
  }
}

// 创建单例实例
const zoteroDB = new ZoteroDB();

export default zoteroDB;
