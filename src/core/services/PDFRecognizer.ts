/**
 * PDF元数据识别服务
 * 从PDF文件中提取标题、作者、DOI等元数据
 */

import * as pdfjsLib from 'pdfjs-dist';

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  DOI?: string;
  ISBN?: string;
  abstract?: string;
  pages?: number;
  creationDate?: Date;
  date?: string;
  publicationTitle?: string;
  volume?: string;
  issue?: string;
  itemType?: string;
  creators?: Array<{
    firstName?: string;
    lastName?: string;
    creatorType: string;
  }>;
}

export class PDFRecognizer {
  static async initialize(): Promise<void> {
    // 初始化PDF.js worker - 使用正确的路径
    const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url);
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.toString();
  }

  /**
   * 从PDF文件中提取元数据
   */
  static async extractMetadata(file: File): Promise<PDFMetadata> {
    try {
      await this.initialize();

      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // 加载PDF文档
      const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
      const pdf = await loadingTask.promise;

      // 获取文档元数据
      const metadata = await pdf.getMetadata().catch(() => null);

      const result: PDFMetadata = {
        title: (metadata?.info as any)?.Title || this.cleanFilename(file.name),
        author: (metadata?.info as any)?.Author,
        subject: (metadata?.info as any)?.Subject,
        keywords: (metadata?.info as any)?.Keywords?.split(',').map((k: string) => k.trim()).filter((k: string) => k),
        pages: pdf.numPages,
        itemType: 'document' // 默认为文档类型
      };

      // 尝试解析作者列表
      if (result.author) {
        result.creators = this.parseAuthors(result.author);
      }

      // 尝试从第一页提取更多信息
      try {
        const firstPage = await pdf.getPage(1);
        const textContent = await firstPage.getTextContent();
        const text = textContent.items.map((item: any) => item.str).join(' ');

        // 尝试从文本中提取DOI
        if (!result.DOI) {
          const doiMatch = text.match(/10\.\d{4,}\/[^\s]+/);
          if (doiMatch) {
            result.DOI = doiMatch[0];
            result.itemType = 'journalArticle'; // 有DOI很可能是期刊论文
          }
        }

        // 检测是否是学术论文
        const academicKeywords = ['abstract', 'introduction', 'references', 'conclusion', 'keywords'];
        const textLower = text.toLowerCase();
        if (academicKeywords.some(keyword => textLower.includes(keyword))) {
          result.itemType = 'journalArticle';
        }

        // 尝试提取摘要
        const abstractMatch = text.match(/Abstract[:\s]+(.*?)(?=\n\n|\nKeywords|\nIntroduction|$)/is);
        if (abstractMatch) {
          result.abstract = abstractMatch[1].trim().substring(0, 500);
        }
      } catch (pageError) {
        console.warn('[PDFRecognizer] 无法读取第一页内容:', pageError);
      }

      console.log('[PDFRecognizer] 成功提取元数据:', result);
      return result;
    } catch (error) {
      console.error('[PDFRecognizer] 提取元数据失败:', error);

      // 失败时返回基本信息
      const fallbackMetadata: PDFMetadata = {
        title: this.cleanFilename(file.name),
        itemType: 'document'
      };

      console.log('[PDFRecognizer] 使用文件名作为标题:', fallbackMetadata.title);
      return fallbackMetadata;
    }
  }

  /**
   * 清理文件名作为标题
   */
  private static cleanFilename(filename: string): string {
    return filename
      .replace(/\.[^/.]+$/, '') // 移除扩展名
      .replace(/[-_]/g, ' ')     // 替换-和_为空格
      .replace(/\s+/g, ' ')      // 合并多个空格
      .trim();
  }

  /**
   * 解析作者字符串
   */
  private static parseAuthors(authorString: string): Array<{
    firstName?: string;
    lastName?: string;
    creatorType: string;
  }> {
    const authors: Array<{
      firstName?: string;
      lastName?: string;
      creatorType: string;
    }> = [];

    // 尝试不同的分隔符
    const separators = [';', ',', ' and ', ' & '];
    const parts = [authorString];

    for (const sep of separators) {
      const split = authorString.split(sep);
      if (split.length > 1) {
        parts.length = 0;
        parts.push(...split);
        break;
      }
    }

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      // 尝试匹配 "Last, First" 或 "First Last" 格式
      const commaMatch = trimmed.match(/^([^,]+),\s*(.+)$/);
      if (commaMatch) {
        authors.push({
          firstName: commaMatch[2].trim(),
          lastName: commaMatch[1].trim(),
          creatorType: 'author'
        });
      } else {
        const spaceParts = trimmed.split(/\s+/);
        if (spaceParts.length >= 2) {
          authors.push({
            firstName: spaceParts.slice(0, -1).join(' '),
            lastName: spaceParts[spaceParts.length - 1],
            creatorType: 'author'
          });
        } else {
          authors.push({
            lastName: trimmed,
            creatorType: 'author'
          });
        }
      }
    }

    return authors;
  }

  /**
   * 通过DOI查询条目元数据
   */
  static async queryByDOI(DOI: string): Promise<Partial<any>> {
    try {
      // 使用CrossRef API查询DOI
      const response = await fetch(`https://api.crossref.org/works/${DOI}`);
      const data = await response.json();

      if (data.status === 'ok' && data.message) {
        const work = data.message;
        const creators = work.author?.map((author: any) => ({
          firstName: author.given,
          lastName: author.family,
          creatorType: author.sequence === 'first' ? 'author' : 'contributor'
        })) || [];

        return {
          title: work.title?.[0] || '',
          creators: creators,
          DOI: DOI,
          publicationTitle: work['container-title']?.[0] || '',
          volume: work.volume || '',
          issue: work.issue || '',
          pages: work.page || '',
          date: work.published?.['date-parts']?.[0]?.join('-') || '',
          itemType: 'journalArticle',
          abstract: work.abstract ? work.abstract.substring(0, 500) : ''
        };
      }
    } catch (error) {
      console.error('[PDFRecognizer] DOI查询失败:', error);
    }

    return {};
  }
}
