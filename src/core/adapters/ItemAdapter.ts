/**
 * Zotero Desktop Item Adapter
 * 让桌面版业务逻辑在Web环境中运行
 */

import zoteroDB from '../database/ZoteroDB';

export class ItemAdapter {
  private static instance: ItemAdapter;
  private cache: Map<number, any> = new Map();

  private constructor() {}

  static getInstance(): ItemAdapter {
    if (!ItemAdapter.instance) {
      ItemAdapter.instance = new ItemAdapter();
    }
    return ItemAdapter.instance;
  }

  /**
   * 创建新条目
   */
  async createItem(itemType: string, fields: any = {}): Promise<any> {
    try {
      await zoteroDB.init();

      const key = this.generateKey(itemType);
      const now = new Date().toISOString();

      const result = zoteroDB.run(`
        INSERT INTO items (
          libraryID, key, itemType, dateAdded, dateModified, version,
          title, abstractNote, date, year, publisher, publicationTitle,
          volume, issue, pages, url, DOI, ISBN, ISSN, extra
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        1, // libraryID
        key,
        itemType,
        now,
        now,
        1, // version
        fields.title || '',
        fields.abstractNote || '',
        fields.date || '',
        fields.year || null,
        fields.publisher || '',
        fields.publicationTitle || '',
        fields.volume || '',
        fields.issue || '',
        fields.pages || '',
        fields.url || '',
        fields.DOI || '',
        fields.ISBN || '',
        fields.ISSN || '',
        fields.extra || ''
      ]);

      const itemID = result.lastID;

      // 处理创作者
      if (fields.creators && Array.isArray(fields.creators)) {
        await this.updateCreators(itemID, fields.creators);
      }

      // 处理标签
      if (fields.tags && Array.isArray(fields.tags)) {
        await this.updateTags(itemID, fields.tags);
      }

      // 直接构造返回对象，避免额外的数据库查询
      const item = {
        itemID: itemID,
        key: key,
        itemType: itemType,
        title: fields.title || '',
        abstractNote: fields.abstractNote || '',
        date: fields.date || '',
        year: fields.year || null,
        publisher: fields.publisher || '',
        publicationTitle: fields.publicationTitle || '',
        volume: fields.volume || '',
        issue: fields.issue || '',
        pages: fields.pages || '',
        url: fields.url || '',
        DOI: fields.DOI || '',
        ISBN: fields.ISBN || '',
        ISSN: fields.ISSN || '',
        creators: fields.creators || [],
        tags: fields.tags || []
      };

      // 缓存数据
      this.cache.set(itemID, item);

      return item;
    } catch (error) {
      console.error('[ItemAdapter] 创建条目失败:', error);
      throw error;
    }
  }

  /**
   * 获取条目
   */
  async getItem(itemID: number): Promise<any> {
    try {
      // 先检查缓存
      if (this.cache.has(itemID)) {
        return this.cache.get(itemID);
      }

      await zoteroDB.init();

      const results = zoteroDB.query('SELECT * FROM items WHERE itemID = ?', [itemID]);
      if (results.length === 0) {
        throw new Error('Item not found');
      }

      const item = results[0];

      // 加载创作者
      const creators = zoteroDB.query(
        'SELECT * FROM creators WHERE itemID = ? ORDER BY orderIndex',
        [itemID]
      );

      // 加载标签
      const tags = zoteroDB.query(`
        SELECT t.name FROM tags t
        JOIN item_tags it ON t.tagID = it.tagID
        WHERE it.itemID = ?
      `, [itemID]);

      const itemData = {
        ...item,
        creators: creators.map(c => ({
          creatorType: c.creatorType,
          firstName: c.firstName || '',
          lastName: c.lastName || ''
        })),
        tags: tags.map(t => t.name),
        itemType: this.getItemTypeLabel(item.itemType)
      };

      // 缓存数据
      this.cache.set(itemID, itemData);

      return itemData;
    } catch (error) {
      console.error('[ItemAdapter] 获取条目失败:', error);
      throw error;
    }
  }

  /**
   * 通过key获取条目（用于同步）
   */
  async getItemByKey(key: string): Promise<any> {
    try {
      await zoteroDB.init();

      const results = zoteroDB.query('SELECT * FROM items WHERE key = ?', [key]);
      if (results.length === 0) {
        return null;
      }

      const item = results[0];
      return this.getItem(item.itemID);
    } catch (error) {
      console.error('[ItemAdapter] getItemByKey failed:', error);
      return null;
    }
  }

  /**
   * 获取所有条目
   */
  async getAllItems(limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      await zoteroDB.init();

      const items = zoteroDB.query('SELECT * FROM items ORDER BY dateAdded DESC LIMIT ? OFFSET ?', [limit, offset]);

      const itemsData = await Promise.all(
        items.map(item => this.getItem(item.itemID))
      );

      return itemsData;
    } catch (error) {
      console.error('[ItemAdapter] 获取条目列表失败:', error);
      throw error;
    }
  }

  /**
   * 更新条目
   */
  async updateItem(itemID: number, fields: any): Promise<void> {
    try {
      await zoteroDB.init();

      const updates: string[] = [];
      const values: any[] = [];

      Object.entries(fields).forEach(([key, value]) => {
        if (key === 'creators' || key === 'tags') return; // 特殊处理
        updates.push(`${key} = ?`);
        values.push(value);
      });

      if (updates.length === 0) return;

      values.push(new Date().toISOString()); // dateModified
      updates.push('dateModified = ?');

      values.push(itemID);

      zoteroDB.run(`UPDATE items SET ${updates.join(', ')} WHERE itemID = ?`, values);

      // 清除缓存
      this.cache.delete(itemID);

      // 处理创作者
      if (fields.creators) {
        await this.updateCreators(itemID, fields.creators);
      }

      // 处理标签
      if (fields.tags) {
        await this.updateTags(itemID, fields.tags);
      }

    } catch (error) {
      console.error('[ItemAdapter] 更新条目失败:', error);
      throw error;
    }
  }

  /**
   * 删除条目
   */
  async deleteItem(itemID: number): Promise<void> {
    try {
      await zoteroDB.init();
      zoteroDB.run('DELETE FROM items WHERE itemID = ?', [itemID]);
      this.cache.delete(itemID);
    } catch (error) {
      console.error('[ItemAdapter] 删除条目失败:', error);
      throw error;
    }
  }

  /**
   * 更新创作者
   */
  private async updateCreators(itemID: number, creators: any[]): Promise<void> {
    // 删除旧创作者
    zoteroDB.run('DELETE FROM creators WHERE itemID = ?', [itemID]);

    // 插入新创作者
    creators.forEach((creator, index) => {
      zoteroDB.run(`
        INSERT INTO creators (itemID, creatorType, firstName, lastName, orderIndex)
        VALUES (?, ?, ?, ?, ?)
      `, [itemID, creator.creatorType, creator.firstName, creator.lastName, index]);
    });
  }

  /**
   * 更新标签
   */
  private async updateTags(itemID: number, tags: string[]): Promise<void> {
    // 删除旧标签关联
    zoteroDB.run('DELETE FROM item_tags WHERE itemID = ?', [itemID]);

    // 添加新标签
    for (const tagName of tags) {
      // 确保标签存在
      let tagResults = zoteroDB.query('SELECT tagID FROM tags WHERE name = ?', [tagName]);
      let tagID: number;

      if (tagResults.length === 0) {
        const now = new Date().toISOString();
        const result = zoteroDB.run(`
          INSERT INTO tags (libraryID, name, dateAdded, dateModified)
          VALUES (?, ?, ?, ?)
        `, [1, tagName, now, now]);
        tagID = result.lastID;
      } else {
        tagID = tagResults[0].tagID;
      }

      // 关联标签
      zoteroDB.run('INSERT OR IGNORE INTO item_tags (itemID, tagID) VALUES (?, ?)', [itemID, tagID]);
    }
  }

  /**
   * 搜索条目
   */
  async searchItems(searchTerm: string, limit: number = 50): Promise<any[]> {
    try {
      await zoteroDB.init();

      const pattern = `%${searchTerm}%`;
      const items = zoteroDB.query(`
        SELECT DISTINCT i.* FROM items i
        LEFT JOIN creators c ON i.itemID = c.itemID
        WHERE i.title LIKE ? OR i.abstractNote LIKE ? OR c.lastName LIKE ?
        ORDER BY i.dateAdded DESC LIMIT ?
      `, [pattern, pattern, pattern, limit]);

      const itemsData = await Promise.all(
        items.map(item => this.getItem(item.itemID))
      );

      return itemsData;
    } catch (error) {
      console.error('[ItemAdapter] 搜索失败:', error);
      throw error;
    }
  }

  /**
   * 获取条目类型标签
   */
  private getItemTypeLabel(itemType: string): string {
    const labels: Record<string, string> = {
      'book': 'Book',
      'journalArticle': 'Journal Article',
      'magazineArticle': 'Magazine Article',
      'newspaperArticle': 'Newspaper Article',
      'thesis': 'Thesis',
      'conferencePaper': 'Conference Paper',
      'webpage': 'Web Page'
    };
    return labels[itemType] || itemType;
  }

  /**
   * 生成唯一key
   */
  private generateKey(itemType: string): string {
    return `${itemType.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取统计信息
   */
  getStats(): { items: number; cacheSize: number } {
    return {
      items: this.cache.size,
      cacheSize: this.cache.size
    };
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 添加附件到条目
   */
  async addAttachment(itemID: number, attachment: {
    title: string;
    filename: string;
    contentType: string;
    size: number;
    localPath?: string;
    remotePath?: string;
  }): Promise<number> {
    try {
      await zoteroDB.init();

      const key = this.generateKey('attachment');
      const now = new Date().toISOString();

      const result = zoteroDB.run(`
        INSERT INTO attachments (
          itemID, key, title, filename, contentType, size,
          localPath, remotePath, dateAdded, dateModified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        itemID,
        key,
        attachment.title,
        attachment.filename,
        attachment.contentType,
        attachment.size,
        attachment.localPath || null,
        attachment.remotePath || null,
        now,
        now
      ]);

      console.log('[ItemAdapter] 附件添加成功:', attachment.filename);
      return result.lastID;
    } catch (error) {
      console.error('[ItemAdapter] 添加附件失败:', error);
      throw error;
    }
  }

  /**
   * 获取条目的附件列表
   */
  async getItemAttachments(itemID: number): Promise<any[]> {
    try {
      await zoteroDB.init();

      const attachments = zoteroDB.query(`
        SELECT * FROM attachments WHERE itemID = ? AND deleted = 0
        ORDER BY dateAdded DESC
      `, [itemID]);

      return attachments;
    } catch (error) {
      console.error('[ItemAdapter] 获取附件列表失败:', error);
      throw error;
    }
  }

  /**
   * 删除附件
   */
  async deleteAttachment(attachmentID: number): Promise<void> {
    try {
      await zoteroDB.init();

      // 标记为已删除，而不是真正删除
      zoteroDB.run(`
        UPDATE attachments SET deleted = 1, dateModified = ?
        WHERE attachmentID = ?
      `, [new Date().toISOString(), attachmentID]);

      console.log('[ItemAdapter] 附件删除成功:', attachmentID);
    } catch (error) {
      console.error('[ItemAdapter] 删除附件失败:', error);
      throw error;
    }
  }

  /**
   * 更新附件同步状态
   */
  async updateAttachmentSyncStatus(
    attachmentID: number,
    syncStatus: 'synced' | 'local_only' | 'remote_only' | 'conflict' | 'error'
  ): Promise<void> {
    try {
      await zoteroDB.init();

      zoteroDB.run(`
        UPDATE attachments SET syncStatus = ?, dateModified = ?
        WHERE attachmentID = ?
      `, [syncStatus, new Date().toISOString(), attachmentID]);
    } catch (error) {
      console.error('[ItemAdapter] 更新附件同步状态失败:', error);
      throw error;
    }
  }
}

export default ItemAdapter;
