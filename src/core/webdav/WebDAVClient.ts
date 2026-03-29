/**
 * WebDAV Client for Paper-Master
 * WebDAV file synchronization support
 * Supports Nextcloud, ownCloud and other WebDAV servers
 */

interface WebDAVConfig {
  url: string;           // WebDAV服务器URL
  username: string;      // 用户名
  password: string;      // 密码
  path?: string;         // WebDAV路径（可选）
}

interface WebDAVFile {
  href: string;
  lastModified: string;
  contentLength?: number;
  contentType?: string;
  etag?: string;
}

interface UploadResult {
  success: boolean;
  path: string;
  etag?: string;
  error?: string;
}

interface DownloadResult {
  success: boolean;
  data: Blob;
  etag?: string;
  error?: string;
}

export class WebDAVClient {
  private config: WebDAVConfig;
  private basicAuthHeader: string;

  constructor(config: WebDAVConfig) {
    this.config = config;

    // 创建Basic Auth头
    this.basicAuthHeader = 'Basic ' + btoa(config.username + ':' + config.password);
  }

  /**
   * 测试WebDAV连接
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request('PROPFIND', this.config.url, {
        headers: {
          'Depth': '0'
        }
      });
      return true;
    } catch (error) {
      console.error('WebDAV连接测试失败:', error);
      return false;
    }
  }

  /**
   * 列出目录中的文件
   */
  async listFiles(path?: string): Promise<WebDAVFile[]> {
    const url = path ? this.joinPath(this.config.url, path) : this.config.url;

    const body = `<?xml version="1.0" encoding="utf-8" ?>
      <D:propfind xmlns:D="DAV:">
        <D:prop>
          <D:displayname/>
          <D:getcontentlength/>
          <D:getcontenttype/>
          <D:resourcetype/>
          <D:getlastmodified/>
          <D:etag/>
        </D:prop>
      </D:propfind>`;

    try {
      const response = await this.request('PROPFIND', url, {
        headers: {
          'Depth': '1',
          'Content-Type': 'text/xml; charset=utf-8'
        },
        body: body
      });

      // 解析WebDAV XML响应
      return this.parseWebDAVXML(response);
    } catch (error) {
      console.error('列出文件失败:', error);
      throw error;
    }
  }

  /**
   * 上传文件
   */
  async uploadFile(fileName: string, data: ArrayBuffer | Blob, path?: string): Promise<UploadResult> {
    try {
      const fullPath = this.joinPath(this.config.url, path || '', fileName);

      const response = await this.request('PUT', fullPath, {
        headers: {
          'Content-Type': 'application/octet-stream'
        },
        body: data,
        responseType: 'text'
      });

      // 获取ETag
      const etag = response.headers?.get('ETag') || undefined;

      return {
        success: true,
        path: fullPath,
        etag: etag
      };
    } catch (error) {
      console.error('上传文件失败:', error);
      return {
        success: false,
        path: fileName,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 下载文件
   */
  async downloadFile(fileName: string, path?: string): Promise<DownloadResult> {
    try {
      const fullPath = this.joinPath(this.config.url, path || '', fileName);

      const response = await this.request('GET', fullPath, {
        responseType: 'blob'
      });

      const etag = response.headers?.get('ETag') || undefined;

      return {
        success: true,
        data: response.data as Blob,
        etag: etag
      };
    } catch (error) {
      console.error('下载文件失败:', error);
      return {
        success: false,
        data: new Blob(),
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(fileName: string, path?: string): Promise<boolean> {
    try {
      const fullPath = this.joinPath(this.config.url, path || '', fileName);

      await this.request('DELETE', fullPath);

      return true;
    } catch (error) {
      console.error('删除文件失败:', error);
      return false;
    }
  }

  /**
   * 创建目录
   */
  async createDirectory(path: string): Promise<boolean> {
    try {
      const fullPath = this.joinPath(this.config.url, path);

      await this.request('MKCOL', fullPath);

      return true;
    } catch (error) {
      console.error('创建目录失败:', error);
      return false;
    }
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(fileName: string, path?: string): Promise<boolean> {
    try {
      const fullPath = this.joinPath(this.config.url, path || '', fileName);

      await this.request('HEAD', fullPath);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(fileName: string, path?: string): Promise<WebDAVFile | null> {
    try {
      const fullPath = this.joinPath(this.config.url, path || '', fileName);

      const response = await this.request('PROPFIND', fullPath, {
        headers: {
          'Depth': '0',
          'Content-Type': 'text/xml; charset=utf-8'
        },
        body: `<?xml version="1.0" encoding="utf-8" ?>
          <D:propfind xmlns:D="DAV:">
            <D:prop>
              <D:displayname/>
              <D:getcontentlength/>
              <D:getcontenttype/>
              <D:resourcetype/>
              <D:getlastmodified/>
              <D:etag/>
            </D:prop>
          </D:propfind>`
      });

      const files = this.parseWebDAVXML(response);
      return files.length > 0 ? files[0] : null;
    } catch (error) {
      console.error('获取文件信息失败:', error);
      return null;
    }
  }

  /**
   * 核心请求方法
   */
  private async request(
    method: string,
    url: string,
    options: {
      headers?: Record<string, string>;
      body?: any;
      responseType?: 'arraybuffer' | 'blob' | 'text' | 'json';
    } = {}
  ): Promise<any> {
    const { headers = {}, body, responseType = 'text' } = options;

    const response = await fetch(url, {
      method: method,
      headers: {
        'Authorization': this.basicAuthHeader,
        ...headers
      },
      body: body
    });

    if (!response.ok) {
      throw new Error(`WebDAV ${method} 请求失败: ${response.status} ${response.statusText}`);
    }

    // 根据responseType返回相应类型的数据
    switch (responseType) {
      case 'arraybuffer':
        return await response.arrayBuffer();
      case 'blob':
        return await response.blob();
      case 'json':
        return await response.json();
      default:
        return {
          data: await response.text(),
          headers: response.headers,
          status: response.status
        };
    }
  }

  /**
   * 解析WebDAV XML响应
   */
  private parseWebDAVXML(response: any): WebDAVFile[] {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response.data, 'text/xml');
    const responses = xmlDoc.getElementsByTagNameNS('*', 'response');

    const files: WebDAVFile[] = [];

    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      const href = response.getElementsByTagNameNS('*', 'href')[0]?.textContent;

      // 跳过父目录
      if (!href || href.endsWith('/')) {
        continue;
      }

      const lastModified = response.getElementsByTagNameNS('*', 'getlastmodified')[0]?.textContent || '';
      const contentLength = response.getElementsByTagNameNS('*', 'getcontentlength')[0]?.textContent;
      const contentType = response.getElementsByTagNameNS('*', 'getcontenttype')[0]?.textContent;
      const etag = response.getElementsByTagNameNS('*', 'etag')[0]?.textContent;

      files.push({
        href: href,
        lastModified: lastModified,
        contentLength: contentLength ? parseInt(contentLength) : undefined,
        contentType: contentType,
        etag: etag
      });
    }

    return files;
  }

  /**
   * 连接路径
   */
  private joinPath(...parts: string[]): string {
    const firstPart = parts[0];

    // 处理相对路径（代理路径）
    if (firstPart.startsWith('/')) {
      let path = firstPart;
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i].trim();
        if (part) {
          path = path.replace(/\/$/, '') + '/' + part.replace(/^\//, '');
        }
      }
      return path;
    }

    // 处理完整URL
    const url = new URL(firstPart);
    let pathname = url.pathname;

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i].trim();
      if (part) {
        pathname = pathname.replace(/\/$/, '') + '/' + part.replace(/^\//, '');
      }
    }

    url.pathname = pathname;
    return url.toString();
  }

  /**
   * 清除缓存的凭证
   */
  clearCredentials(): void {
    this.basicAuthHeader = '';
  }
}

export default WebDAVClient;
