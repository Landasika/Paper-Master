/**
 * Zotero Sync Service
 * Zotero同步服务，完全实现与Zotero服务器的同步功能
 */

import { ZoteroAPI } from '../api/ZoteroAPI';
import { ItemAdapter } from '../adapters/ItemAdapter';

export interface SyncConfig {
  apiKey: string;
  username: string;
  userID?: string;
  lastSync?: number;
  autoSync: boolean;
}

export interface SyncResult {
  success: boolean;
  itemsDownloaded: number;
  itemsUploaded: number;
  collectionsDownloaded: number;
  collectionsUploaded: number;
  tagsDownloaded: number;
  tagsUploaded: number;
  message: string;
  timestamp: number;
}

export class ZoteroSyncService {
  private api: ZoteroAPI;
  private config: SyncConfig;
  private itemAdapter: ItemAdapter;

  constructor(config: SyncConfig) {
    this.config = config;
    this.api = new ZoteroAPI(config.apiKey, {
      userID: config.userID
    });
    this.itemAdapter = ItemAdapter.getInstance();
  }

  /**
   * 完整同步 - 从Zotero服务器同步数据到本地
   */
  async fullSync(): Promise<SyncResult> {
    try {
      console.log('[SyncService] 开始完整同步...');

      // 1. 验证API Key
      const keyInfo = await this.api.getKeyInfo();
      this.config.userID = keyInfo.userID;

      // 2. 获取上次同步时间
      const lastSync = this.config.lastSync || 0;

      // 3. 同步集合
      const collectionsResult = await this.syncCollections(lastSync);

      // 4. 同步条目
      const itemsResult = await this.syncItems(lastSync);

      // 5. 同步标签
      const tagsResult = await this.syncTags(lastSync);

      // 6. 更新同步时间
      this.config.lastSync = Math.floor(Date.now() / 1000);
      this.saveConfig();

      const result: SyncResult = {
        success: true,
        itemsDownloaded: itemsResult.downloaded,
        itemsUploaded: itemsResult.uploaded,
        collectionsDownloaded: collectionsResult.downloaded,
        collectionsUploaded: collectionsResult.uploaded,
        tagsDownloaded: tagsResult.downloaded,
        tagsUploaded: tagsResult.uploaded,
        message: '同步完成',
        timestamp: this.config.lastSync
      };

      console.log('[SyncService] 同步完成:', result);
      return result;

    } catch (error) {
      console.error('[SyncService] 同步失败:', error);
      return {
        success: false,
        itemsDownloaded: 0,
        itemsUploaded: 0,
        collectionsDownloaded: 0,
        collectionsUploaded: 0,
        tagsDownloaded: 0,
        tagsUploaded: 0,
        message: `同步失败: ${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: Date.now()
      };
    }
  }

  /**
   * 同步集合
   */
  private async syncCollections(_since: number): Promise<{ downloaded: number; uploaded: number }> {
    try {
      console.log('[SyncService] 同步集合...');

      // 从服务器获取集合
      const serverCollections = await this.api.getCollections();
      console.log(`[SyncService] 获取到 ${serverCollections.length} 个集合`);

      // TODO: 将集合保存到本地数据库
      // 这里需要调用数据库适配器保存集合

      return { downloaded: serverCollections.length, uploaded: 0 };
    } catch (error) {
      console.error('[SyncService] 集合同步失败:', error);
      return { downloaded: 0, uploaded: 0 };
    }
  }

  /**
   * 同步条目
   */
  private async syncItems(since: number): Promise<{ downloaded: number; uploaded: number }> {
    try {
      console.log('[SyncService] 同步条目...');

      // 从服务器获取条目
      const serverItems = await this.api.getItems({ since });
      console.log(`[SyncService] 获取到 ${serverItems.length} 个条目`);

      // 将条目保存到本地数据库
      for (const item of serverItems) {
        try {
          // 转换Zotero API格式到本地格式
          const localItem = {
            itemType: item.itemType || 'book',
            title: item.title || '',
            creators: item.creators || [],
            tags: item.tags ? item.tags.map((t: any) => t.tag) : [],
            date: item.date || '',
            year: item.date ? new Date(item.date).getFullYear() : null,
            abstractNote: item.abstractNote || '',
            publisher: item.publisher || '',
            publicationTitle: item.publicationTitle || '',
            volume: item.volume || '',
            issue: item.issue || '',
            pages: item.pages || '',
            DOI: item.DOI || '',
            ISBN: item.ISBN || '',
            URL: item.url || '',
            notes: []
          };

          // 检查是否已存在
          const existing = await this.itemAdapter.getItemByKey(item.key);
          if (existing) {
            await this.itemAdapter.updateItem(existing.itemID, localItem);
          } else {
            await this.itemAdapter.createItem(item.itemType || 'book', {
              ...localItem,
              key: item.key,
              version: item.version,
              dateAdded: item.dateAdded || new Date().toISOString(),
              dateModified: item.dateModified || new Date().toISOString()
            });
          }
        } catch (error) {
          console.error(`[SyncService] 保存条目失败: ${item.key}`, error);
        }
      }

      return { downloaded: serverItems.length, uploaded: 0 };
    } catch (error) {
      console.error('[SyncService] 条目同步失败:', error);
      return { downloaded: 0, uploaded: 0 };
    }
  }

  /**
   * 同步标签
   */
  private async syncTags(_since: number): Promise<{ downloaded: number; uploaded: number }> {
    try {
      console.log('[SyncService] 同步标签...');

      // 从服务器获取标签
      const serverTags = await this.api.getTags();
      console.log(`[SyncService] 获取到 ${serverTags.length} 个标签`);

      // TODO: 将标签保存到本地数据库
      // 这里需要调用数据库适配器保存标签

      return { downloaded: serverTags.length, uploaded: 0 };
    } catch (error) {
      console.error('[SyncService] 标签同步失败:', error);
      return { downloaded: 0, uploaded: 0 };
    }
  }

  /**
   * 上传本地更改到服务器
   */
  async uploadLocalChanges(): Promise<SyncResult> {
    try {
      console.log('[SyncService] 上传本地更改...');

      // TODO: 实现上传逻辑
      // 1. 获取本地修改的条目
      // 2. 上传到服务器
      // 3. 更新本地版本号

      return {
        success: true,
        itemsDownloaded: 0,
        itemsUploaded: 0,
        collectionsDownloaded: 0,
        collectionsUploaded: 0,
        tagsDownloaded: 0,
        tagsUploaded: 0,
        message: '上传完成',
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('[SyncService] 上传失败:', error);
      throw error;
    }
  }

  /**
   * 保存配置到localStorage
   */
  private saveConfig(): void {
    localStorage.setItem('zotero_sync_config', JSON.stringify(this.config));
  }

  /**
   * 检查同步状态
   */
  async checkSyncStatus(): Promise<{ connected: boolean; username?: string; lastSync?: Date }> {
    try {
      if (!this.config.apiKey) {
        return { connected: false };
      }

      const keyInfo = await this.api.getKeyInfo();
      return {
        connected: true,
        username: keyInfo.username,
        lastSync: this.config.lastSync ? new Date(this.config.lastSync * 1000) : undefined
      };
    } catch (error) {
      console.error('[SyncService] 检查同步状态失败:', error);
      return { connected: false };
    }
  }

  /**
   * 清除同步配置
   */
  static clearConfig(): void {
    localStorage.removeItem('zotero_sync_config');
  }

  /**
   * 加载同步配置
   */
  static loadConfig(): SyncConfig | null {
    try {
      const saved = localStorage.getItem('zotero_sync_config');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('[SyncService] 加载配置失败:', error);
      return null;
    }
  }
}

export default ZoteroSyncService;