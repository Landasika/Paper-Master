import type { Item, Collection, Tag, SyncResult, QueryOptions, Versions } from '../../types';

/**
 * 服务器端数据存储
 * 连接到自建的Node.js服务器，而不是Zotero官网API
 */
export class ServerStore {
  private baseURL: string;
  private ready = false;

  constructor(baseURL = 'http://localhost:3001') {
    this.baseURL = baseURL;
  }

  async initialize(): Promise<void> {
    try {
      // 检查服务器连接
      const response = await fetch(`${this.baseURL}/api/health`);
      if (response.ok) {
        this.ready = true;
        console.log('[ServerStore] 已连接到服务器');
      } else {
        throw new Error('服务器连接失败');
      }
    } catch (error) {
      console.error('[ServerStore] 初始化失败:', error);
      throw error;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseURL}/api${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  async query<T>(type: string, params?: QueryOptions): Promise<T[]> {
    this.ensureReady();

    switch (type) {
      case 'item':
        const items = await this.request<any>(`/items?limit=${params?.limit || 50}&offset=${params?.offset || 0}${params?.search ? `&search=${params.search}` : ''}`);
        return items as T[];
      case 'collection':
        const collections = await this.request<any>('/collections');
        return collections as T[];
      case 'tag':
        const tags = await this.request<any>('/tags');
        return tags as T[];
      default:
        throw new Error(`Unknown type: ${type}`);
    }
  }

  async get<T>(type: string, id: string | number): Promise<T | null> {
    this.ensureReady();

    switch (type) {
      case 'item':
        return await this.request<T>(`/items/${id}`);
      case 'collection':
        return await this.request<T>(`/collections/${id}`);
      default:
        throw new Error(`Unknown type: ${type}`);
    }
  }

  async save<T>(_type: string, data: T | T[], files?: File[]): Promise<T | T[]> {
    this.ensureReady();

    const dataArray = Array.isArray(data) ? data : [data];
    const results = [];

    for (const item of dataArray) {
      // 先上传文件（如果有）
      let itemWithAttachments = { ...item };

      if (files && files.length > 0) {
        const uploadPromises = files.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch(`${this.baseURL}/api/upload`, {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            throw new Error(`文件上传失败: ${response.statusText}`);
          }

          const result = await response.json();
          return result.data;
        });

        const uploadedFiles = await Promise.all(uploadPromises);

        // 将上传的文件信息添加到条目中
        const attachments = uploadedFiles.map((file: any) => ({
          key: `ATTACH_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          itemType: 'attachment',
          linkType: 'linked_file',
          title: file.originalName,
          url: `${this.baseURL}${file.url}`,
          filename: file.filename,
          size: file.size,
          mimeType: file.mimeType,
          dateAdded: new Date().toISOString()
        }));

        itemWithAttachments = {
          ...itemWithAttachments,
          attachments
        };
      }

      // 保存条目元数据
      let result;
      if ((item as any).key) {
        // 更新现有条目
        result = await this.request<T>(`/items/${(item as any).key}`, {
          method: 'PUT',
          body: JSON.stringify(itemWithAttachments)
        });
      } else {
        // 创建新条目
        result = await this.request<T>(`/items`, {
          method: 'POST',
          body: JSON.stringify(itemWithAttachments)
        });
      }
      results.push(result);
    }

    return (Array.isArray(data) ? results : results[0]) as T | T[];
  }

  async delete(type: string, id: string | number): Promise<void> {
    this.ensureReady();

    switch (type) {
      case 'item':
        await this.request<void>(`/items/${id}`, { method: 'DELETE' });
        break;
      case 'collection':
        await this.request<void>(`/collections/${id}`, { method: 'DELETE' });
        break;
      default:
        throw new Error(`Unknown type: ${type}`);
    }
  }

  async sync(_since?: number): Promise<SyncResult> {
    this.ensureReady();

    const [items, collections, tags] = await Promise.all([
      this.request<Item[]>('/items'),
      this.request<Collection[]>('/collections'),
      this.request<Tag[]>('/tags')
    ]);

    return {
      libraryVersion: Date.now(),
      items,
      collections,
      tags,
      deletions: {}
    };
  }

  async getVersions(_objectType: string, _since: number): Promise<Versions> {
    this.ensureReady();
    // 服务器端版本管理
    return {
      libraryVersion: _since,
      versions: {}
    };
  }

  private ensureReady(): void {
    if (!this.ready) {
      throw new Error('ServerStore is not initialized. Call initialize() first.');
    }
  }

  /**
   * 获取统计信息
   */
  async getStats() {
    this.ensureReady();
    return await this.request<any>('/stats');
  }

  /**
   * 导出数据
   */
  async exportData() {
    this.ensureReady();
    return await this.request<any>('/export');
  }

  /**
   * 导入数据
   */
  async importData(data: any) {
    this.ensureReady();
    return await this.request<any>('/import', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}
