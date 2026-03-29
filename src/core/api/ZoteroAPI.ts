/**
 * Zotero API Client
 * 实现与Zotero服务器的通信
 */

export interface ZoteroItem {
  key: string;
  version: number;
  itemType: string;
  title: string;
  creators: Array<{
    creatorType: string;
    firstName: string;
    lastName: string;
  }>;
  tags: Array<{ tag: string }>;
  date?: string;
  dateAdded?: string;
  dateModified?: string;
  [key: string]: any;
}

export interface ZoteroCollection {
  key: string;
  version: number;
  name: string;
  parentCollection: boolean | string;
  relations: Record<string, any>;
}

export interface SyncOptions {
  apiKey: string;
  userID?: string;
  groupID?: string;
  since?: number;
}

export interface SyncResult {
  successful: number;
  unchanged: number;
  failed: number;
}

export class ZoteroAPI {
  private baseURL = 'https://api.zotero.org';
  private apiKey: string;
  private userID?: string;
  private groupID?: string;

  constructor(apiKey: string, options: { userID?: string; groupID?: string } = {}) {
    this.apiKey = apiKey;
    this.userID = options.userID;
    this.groupID = options.groupID;
  }

  async getKeyInfo() {
    const response = await fetch(`${this.baseURL}/keys/${this.apiKey}`, {
      headers: { 'Zotero-API-Version': '3' }
    });

    if (!response.ok) {
      throw new Error(`API key验证失败: ${response.statusText}`);
    }

    const data = await response.json();
    this.userID = data.userID;
    return data;
  }

  async getItems(
    param1?: string | { limit?: number; start?: number; since?: number },
    param2?: string | { limit?: number; start?: number; since?: number },
    param3?: { limit?: number; start?: number; since?: number }
  ): Promise<ZoteroItem[]> {
    // 支持多种调用方式：
    // 1. getItems() - 使用已配置的userID/groupID
    // 2. getItems({ limit: 50 }) - 使用已配置的userID/groupID，带选项
    // 3. getItems('user', '123456', { limit: 50 }) - 动态指定库

    let libraryType: string | undefined;
    let libraryID: string | undefined;
    let options: { limit?: number; start?: number; since?: number } = {};

    // 参数解析逻辑
    if (typeof param1 === 'string') {
      libraryType = param1;
      if (typeof param2 === 'string') {
        libraryID = param2;
        options = param3 || {};
      } else if (param2 && typeof param2 === 'object') {
        options = param2;
      }
    } else if (param1 && typeof param1 === 'object') {
      options = param1;
    } else if (param2 && typeof param2 === 'object') {
      options = param2;
    } else if (param3) {
      options = param3;
    }

    let effectiveUserID = this.userID;
    let effectiveGroupID = this.groupID;

    if (libraryType && libraryID) {
      if (libraryType === 'user') {
        effectiveUserID = libraryID;
      } else if (libraryType === 'group') {
        effectiveGroupID = libraryID;
      }
    }

    if (!effectiveUserID && !effectiveGroupID) {
      throw new Error('需要userID或groupID');
    }

    const { limit = 100, start = 0, since } = options;
    const params = new URLSearchParams({
      limit: limit.toString(),
      start: start.toString(),
      format: 'json',
      include: 'data'
    });

    if (since) {
      params.set('since', since.toString());
    }

    // 构建URL
    let path: string;
    if (effectiveGroupID) {
      path = `/groups/${effectiveGroupID}/items`;
    } else {
      path = `/users/${effectiveUserID}/items`;
    }

    const url = `${this.baseURL}${path}?${params.toString()}`;
    const response = await this.makeRequest(url);

    if (!response.ok) {
      throw new Error(`获取条目失败: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getCollections(): Promise<ZoteroCollection[]> {
    const params = new URLSearchParams({
      format: 'json',
      include: 'data'
    });

    const url = this.buildURL('collections', params);
    const response = await this.makeRequest(url);

    if (!response.ok) {
      throw new Error(`获取集合失败: ${response.statusText}`);
    }

    return response.json();
  }

  async getTags(): Promise<Array<{ tag: string; type: number; count: number }>> {
    const params = new URLSearchParams({
      format: 'json'
    });

    const url = this.buildURL('tags', params);
    const response = await this.makeRequest(url);

    if (!response.ok) {
      throw new Error(`获取标签失败: ${response.statusText}`);
    }

    return response.json();
  }

  async getVersions(objectType: string, since: number): Promise<Record<string, number>> {
    const params = new URLSearchParams({
      format: 'versions',
      since: since.toString()
    });

    const url = this.buildURL(`${objectType}`, params);
    const response = await this.makeRequest(url);

    if (!response.ok) {
      throw new Error(`获取版本失败: ${response.statusText}`);
    }

    return response.json();
  }

  async downloadObjects(_objectType: string, _keys: string[]): Promise<any[]> {
    // TODO: Implement bulk download
    return [];
  }

  async createItem(item: Partial<ZoteroItem>): Promise<ZoteroItem> {
    const url = this.buildURL('items');
    const response = await this.makeRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([item])
    });

    if (!response.ok) {
      throw new Error(`创建条目失败: ${response.statusText}`);
    }

    const data = await response.json();
    return data.successful ? data.successful[0].data : {} as ZoteroItem;
  }

  async updateItem(item: ZoteroItem): Promise<ZoteroItem> {
    const url = this.buildURL(`items/${item.key}`);
    const response = await this.makeRequest(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(item)
    });

    if (!response.ok) {
      throw new Error(`更新条目失败: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  async deleteItem(key: string): Promise<void> {
    const url = this.buildURL(`items/${key}`);
    const response = await this.makeRequest(url, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`删除条目失败: ${response.statusText}`);
    }
  }

  private buildURL(endpoint: string, params?: URLSearchParams): string {
    let path: string;

    if (this.groupID) {
      path = `/groups/${this.groupID}/${endpoint}`;
    } else if (this.userID) {
      path = `/users/${this.userID}/${endpoint}`;
    } else {
      throw new Error('需要userID或groupID');
    }

    const queryString = params ? `?${params.toString()}` : '';
    return `${this.baseURL}${path}${queryString}`;
  }

  private async makeRequest(url: string, options: RequestInit = {}) {
    return fetch(url, {
      ...options,
      headers: {
        'Zotero-API-Key': this.apiKey,
        'Zotero-API-Version': '3',
        ...options.headers
      }
    });
  }
}

export default ZoteroAPI;
