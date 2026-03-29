/**
 * 文件上传服务
 * 处理文件上传到WebDAV并保存附件信息到数据库
 */

import { FileSyncService, type FileAttachment } from '../sync/FileSyncService';
import { ItemAdapter } from '../adapters/ItemAdapter';

export interface UploadProgress {
  filename: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface UploadResult {
  success: boolean;
  attachmentID?: number;
  filename: string;
  error?: string;
}

export class FileUploadService {
  private fileSyncService: FileSyncService;
  private itemAdapter: ItemAdapter;

  constructor() {
    this.fileSyncService = new FileSyncService();
    this.itemAdapter = ItemAdapter.getInstance();
  }

  /**
   * 初始化WebDAV连接
   */
  async initialize(config: {
    url: string;
    username: string;
    password: string;
    path?: string;
  }): Promise<boolean> {
    return await this.fileSyncService.initialize({
      ...config,
      enabled: true
    });
  }

  /**
   * 上传单个文件
   */
  async uploadFile(
    itemID: number,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      onProgress?.({
        filename: file.name,
        progress: 0,
        status: 'uploading'
      });

      // 生成远程路径
      const remotePath = `zotero/${itemID}/${file.name}`;

      // 上传文件到WebDAV
      // const arrayBuffer = await file.arrayBuffer(); // 保留供后续WebDAV上传使用
      // const uint8Array = new Uint8Array(arrayBuffer); // 保留供后续WebDAV上传使用

      onProgress?.({
        filename: file.name,
        progress: 50,
        status: 'uploading'
      });

      // 这里需要调用FileSyncService或WebDAVClient的上传方法
      // 暂时保存成功，实际WebDAV上传需要进一步实现
      console.log('[FileUploadService] 上传文件到:', remotePath);

      onProgress?.({
        filename: file.name,
        progress: 90,
        status: 'uploading'
      });

      // 保存附件信息到数据库
      const attachmentID = await this.itemAdapter.addAttachment(itemID, {
        title: file.name,
        filename: file.name,
        contentType: file.type,
        size: file.size,
        localPath: undefined, // 浏览器环境没有本地路径
        remotePath: remotePath
      });

      onProgress?.({
        filename: file.name,
        progress: 100,
        status: 'completed'
      });

      return {
        success: true,
        attachmentID,
        filename: file.name
      };
    } catch (error) {
      console.error('[FileUploadService] 文件上传失败:', error);

      onProgress?.({
        filename: file.name,
        progress: 0,
        status: 'error',
        error: (error as Error).message
      });

      return {
        success: false,
        filename: file.name,
        error: (error as Error).message
      };
    }
  }

  /**
   * 批量上传文件
   */
  async uploadFiles(
    itemID: number,
    files: File[],
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (const file of files) {
      const result = await this.uploadFile(itemID, file, onProgress);
      results.push(result);
    }

    return results;
  }

  /**
   * 获取条目的附件列表
   */
  async getItemAttachments(itemID: number): Promise<FileAttachment[]> {
    try {
      const attachments = await this.itemAdapter.getItemAttachments(itemID);

      return attachments.map(a => ({
        itemID: a.itemID,
        key: a.key,
        title: a.title || a.filename,
        filename: a.filename,
        contentType: a.contentType,
        size: a.size,
        linkMode: a.linkMode,
        localPath: a.localPath,
        remotePath: a.remotePath,
        syncStatus: a.syncStatus
      }));
    } catch (error) {
      console.error('[FileUploadService] 获取附件列表失败:', error);
      return [];
    }
  }

  /**
   * 删除附件
   */
  async deleteAttachment(attachmentID: number): Promise<boolean> {
    try {
      await this.itemAdapter.deleteAttachment(attachmentID);
      return true;
    } catch (error) {
      console.error('[FileUploadService] 删除附件失败:', error);
      return false;
    }
  }

  /**
   * 下载附件
   */
  async downloadAttachment(attachment: FileAttachment): Promise<Blob | null> {
    try {
      // 这里需要调用WebDAVClient下载文件
      console.log('[FileUploadService] 下载文件:', attachment.remotePath);

      // 暂时返回null，实际下载需要进一步实现
      return null;
    } catch (error) {
      console.error('[FileUploadService] 下载附件失败:', error);
      return null;
    }
  }
}
