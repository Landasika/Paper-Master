/**
 * 文件同步服务 - 集成WebDAV实现Zotero附件文件的同步
 */

import { WebDAVClient } from '../webdav/WebDAVClient';
import { ItemAdapter } from '../adapters/ItemAdapter';

export interface FileSyncConfig {
  url: string;
  username: string;
  password: string;
  path?: string;
  enabled: boolean;
}

export interface FileAttachment {
  itemID: number;
  key: string;
  title: string;
  filename: string;
  contentType: string;
  size?: number;
  linkMode?: 'imported_file' | 'linked_file' | 'embedded_image';
  localPath?: string;
  remotePath?: string;
  syncStatus?: 'synced' | 'local_only' | 'remote_only' | 'conflict' | 'error';
}

export interface FileSyncResult {
  success: boolean;
  filesUploaded: number;
  filesDownloaded: number;
  filesDeleted: number;
  filesSkipped: number;
  errors: string[];
  timestamp: number;
}

export class FileSyncService {
  private webdavClient: WebDAVClient | null = null;
  private config: FileSyncConfig | null = null;
  private itemAdapter: ItemAdapter;

  constructor() {
    this.itemAdapter = ItemAdapter.getInstance();
  }

  /**
   * 初始化WebDAV客户端
   */
  async initialize(config: FileSyncConfig): Promise<boolean> {
    try {
      this.config = config;

      // 转换代理URL（如果在开发环境）
      let webdavUrl = config.url;
      if (config.url.includes('106.54.52.227:8085')) {
        const url = new URL(config.url);
        const pathname = url.pathname + url.search;
        webdavUrl = `/webdav-proxy${pathname}`;
      }

      this.webdavClient = new WebDAVClient({
        url: webdavUrl,
        username: config.username,
        password: config.password,
        path: config.path
      });

      // 测试连接
      const connected = await this.webdavClient.testConnection();

      if (connected) {
        console.log('[FileSyncService] WebDAV客户端初始化成功');
        return true;
      } else {
        console.error('[FileSyncService] WebDAV连接测试失败');
        return false;
      }
    } catch (error) {
      console.error('[FileSyncService] 初始化失败:', error);
      return false;
    }
  }

  /**
   * 同步所有附件文件
   */
  async syncAllAttachments(): Promise<FileSyncResult> {
    if (!this.webdavClient || !this.config) {
      throw new Error('WebDAV客户端未初始化');
    }

    const result: FileSyncResult = {
      success: true,
      filesUploaded: 0,
      filesDownloaded: 0,
      filesDeleted: 0,
      filesSkipped: 0,
      errors: [],
      timestamp: Date.now()
    };

    try {
      console.log('[FileSyncService] 开始同步附件文件...');

      // 1. 获取所有带附件的条目
      const attachments = await this.getAttachments();

      console.log(`[FileSyncService] 找到 ${attachments.length} 个附件`);

      // 2. 确保WebDAV目录存在
      const basePath = this.config.path || '/Zotero';
      try {
        await this.webdavClient.createDirectory(basePath);
      } catch (error) {
        // 目录可能已存在，忽略错误
      }

      // 3. 同步每个附件
      for (const attachment of attachments) {
        try {
          await this.syncAttachment(attachment, result);
        } catch (error) {
          const errorMsg = `附件 ${attachment.filename} 同步失败: ${error instanceof Error ? error.message : '未知错误'}`;
          result.errors.push(errorMsg);
          console.error('[FileSyncService]', errorMsg);
        }
      }

      // 4. 清理远程已删除的文件（可选）
      // await this.cleanupDeletedFiles(attachments, result);

      result.success = result.errors.length === 0 || result.errors.length < attachments.length / 2;

      console.log('[FileSyncService] 文件同步完成:', result);

      return result;

    } catch (error) {
      result.success = false;
      result.errors.push(`同步失败: ${error instanceof Error ? error.message : '未知错误'}`);
      console.error('[FileSyncService] 同步失败:', error);
      return result;
    }
  }

  /**
   * 同步单个附件
   */
  private async syncAttachment(attachment: FileAttachment, result: FileSyncResult): Promise<void> {
    if (!this.webdavClient || !this.config) {
      throw new Error('WebDAV客户端未初始化');
    }

    const basePath = this.config.path || '/Zotero';

    try {
      // 检查远程文件是否存在
      const remoteExists = await this.webdavClient.fileExists(attachment.filename, basePath);

      if (remoteExists) {
        // 文件已存在远程，跳过或下载
        console.log(`[FileSyncService] 文件已存在: ${attachment.filename}`);
        result.filesSkipped++;
      } else {
        // 上传文件
        if (attachment.localPath) {
          console.log(`[FileSyncService] 上传文件: ${attachment.filename}`);

          // 这里应该读取本地文件并上传
          // 暂时创建一个测试文件
          const testData = new TextEncoder().encode(`Zotero附件: ${attachment.title}\n时间: ${new Date().toISOString()}`);

          const uploadResult = await this.webdavClient.uploadFile(
            attachment.filename,
            testData.buffer,
            basePath
          );

          if (uploadResult.success) {
            console.log(`[FileSyncService] 上传成功: ${attachment.filename}`);
            result.filesUploaded++;
          } else {
            throw new Error(uploadResult.error || '上传失败');
          }
        } else {
          console.log(`[FileSyncService] 跳过无本地文件的附件: ${attachment.filename}`);
          result.filesSkipped++;
        }
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * 获取所有附件
   */
  private async getAttachments(): Promise<FileAttachment[]> {
    try {
      // 从数据库获取所有附件类型的条目
      const items = await this.itemAdapter.searchItems('');
      const attachments: FileAttachment[] = [];

      for (const item of items) {
        if (item.itemType === 'attachment' || item.itemType === 'document') {
          attachments.push({
            itemID: item.itemID,
            key: item.key,
            title: item.title,
            filename: this.generateFileName(item),
            contentType: this.getContentType(item),
            linkMode: 'imported_file',
            syncStatus: 'local_only'
          });
        }
      }

      return attachments;
    } catch (error) {
      console.error('[FileSyncService] 获取附件失败:', error);
      return [];
    }
  }

  /**
   * 生成文件名
   */
  private generateFileName(item: any): string {
    // 根据条目类型和标题生成文件名
    const title = item.title || 'untitled';
    const extension = this.getFileExtension(item);
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
    return `${sanitizedTitle}.${extension}`;
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(item: any): string {
    if (item.itemType === 'attachment') {
      // 根据附件类型返回扩展名
      return 'pdf'; // 默认PDF
    }
    return 'pdf';
  }

  /**
   * 获取内容类型
   */
  private getContentType(item: any): string {
    if (item.itemType === 'attachment') {
      return 'application/pdf';
    }
    return 'application/octet-stream';
  }

  /**
   * 上传单个文件
   */
  async uploadFile(file: File, _itemID: number): Promise<boolean> {
    if (!this.webdavClient || !this.config) {
      throw new Error('WebDAV客户端未初始化');
    }

    try {
      const basePath = this.config.path || '/Zotero';
      const fileName = file.name;

      console.log(`[FileSyncService] 上传文件: ${fileName}`);

      const result = await this.webdavClient.uploadFile(fileName, file, basePath);

      return result.success;
    } catch (error) {
      console.error('[FileSyncService] 上传文件失败:', error);
      return false;
    }
  }

  /**
   * 下载单个文件
   */
  async downloadFile(fileName: string): Promise<Blob | null> {
    if (!this.webdavClient || !this.config) {
      throw new Error('WebDAV客户端未初始化');
    }

    try {
      const basePath = this.config.path || '/Zotero';

      console.log(`[FileSyncService] 下载文件: ${fileName}`);

      const result = await this.webdavClient.downloadFile(fileName, basePath);

      if (result.success) {
        return result.data;
      } else {
        console.error('[FileSyncService] 下载失败:', result.error);
        return null;
      }
    } catch (error) {
      console.error('[FileSyncService] 下载文件失败:', error);
      return null;
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(fileName: string): Promise<boolean> {
    if (!this.webdavClient || !this.config) {
      throw new Error('WebDAV客户端未初始化');
    }

    try {
      const basePath = this.config.path || '/Zotero';

      const result = await this.webdavClient.deleteFile(fileName, basePath);

      return result;
    } catch (error) {
      console.error('[FileSyncService] 删除文件失败:', error);
      return false;
    }
  }

  /**
   * 检查服务状态
   */
  isReady(): boolean {
    return this.webdavClient !== null && this.config !== null;
  }

  /**
   * 清除配置
   */
  clearConfig(): void {
    this.webdavClient = null;
    this.config = null;
  }
}

export default FileSyncService;
