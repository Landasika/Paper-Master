/**
 * 在线元数据查询服务
 * 支持 Crossref、Semantic Scholar、Google Scholar 等API
 */

const https = require('https');

/**
 * 查询在线元数据
 * @param {string} title - 论文标题
 * @param {string} doi - DOI (可选)
 * @param {string} text - PDF文本内容，用于提取信息
 * @returns {Promise<Object>} 元数据对象
 */
async function queryOnlineMetadata(title, doi, text) {
  // 如果有DOI，优先使用DOI查询
  if (doi) {
    const metadata = await queryByDOI(doi);
    if (metadata) return metadata;
  }

  // 如果有标题，使用标题查询
  if (title && title.length > 5) {
    // 尝试多个API，按优先级顺序
    const apis = [
      queryCrossrefByTitle,
      querySemanticScholarByTitle,
    ];

    for (const api of apis) {
      try {
        const metadata = await api(title);
        if (metadata && metadata.title) {
          return metadata;
        }
      } catch (error) {
        console.log(`[MetadataAPI] ${api.name} 失败:`, error.message);
        continue;
      }
    }
  }

  // 如果在线查询都失败，尝试从PDF文本中提取更多信息
  if (text) {
    return extractMetadataFromText(text, title);
  }

  return {};
}

/**
 * 通过DOI查询Crossref
 */
async function queryByDOI(doi) {
  return new Promise((resolve, reject) => {
    const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const item = json.message;

          if (!item) {
            resolve(null);
            return;
          }

          resolve({
            title: item.title?.[0] || '',
            authors: item.author?.map(a => ({
              firstName: a.given || '',
              lastName: a.family || ''
            })) || [],
            doi: item.DOI || '',
            publicationTitle: item['container-title']?.[0] || '',
            volume: item.volume || '',
            issue: item.issue || '',
            pages: item.page || '',
            published: {
              dateParts: item.published?.['date-parts']?.[0] || []
            },
            type: item.type || '',
            publisher: item.publisher || ''
          });
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

/**
 * 通过标题查询Crossref
 */
async function queryCrossrefByTitle(title) {
  return new Promise((resolve, reject) => {
    const query = encodeURIComponent(title);
    const url = `https://api.crossref.org/works?query=${query}&rows=1&select=title,author,DOI,container-title,volume,issue,page,published,type,publisher`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const items = json.message?.items;

          if (!items || items.length === 0) {
            resolve(null);
            return;
          }

          const item = items[0];

          // 计算标题相似度，确保匹配
          const itemTitle = (item.title?.[0] || '').toLowerCase();
          const searchTitle = title.toLowerCase();
          const similarity = calculateSimilarity(itemTitle, searchTitle);

          if (similarity < 0.6) {
            console.log(`[MetadataAPI] Crossref 匹配度过低: ${similarity.toFixed(2)}`);
            resolve(null);
            return;
          }

          resolve({
            title: item.title?.[0] || '',
            authors: item.author?.map(a => ({
              firstName: a.given || '',
              lastName: a.family || ''
            })) || [],
            doi: item.DOI || '',
            publicationTitle: item['container-title']?.[0] || '',
            volume: item.volume || '',
            issue: item.issue || '',
            pages: item.page || '',
            published: {
              dateParts: item.published?.['date-parts']?.[0] || []
            },
            type: item.type || '',
            publisher: item.publisher || ''
          });
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

/**
 * 通过标题查询Semantic Scholar
 */
async function querySemanticScholarByTitle(title) {
  return new Promise((resolve, reject) => {
    const query = encodeURIComponent(title);
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${query}&fields=title,authors,year,venue,journal,doi,volume,issue,pages,publicationDate&type=article`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const items = json.data;

          if (!items || items.length === 0) {
            resolve(null);
            return;
          }

          const item = items[0];

          // 计算标题相似度
          const itemTitle = (item.title || '').toLowerCase();
          const searchTitle = title.toLowerCase();
          const similarity = calculateSimilarity(itemTitle, searchTitle);

          if (similarity < 0.6) {
            console.log(`[MetadataAPI] Semantic Scholar 匹配度过低: ${similarity.toFixed(2)}`);
            resolve(null);
            return;
          }

          resolve({
            title: item.title || '',
            authors: item.authors?.map(a => ({
              firstName: a.name?.split(' ')?.slice(0, -1)?.join(' ') || '',
              lastName: a.name?.split(' ')?.pop() || a.name || ''
            })) || [],
            doi: item.externalIds?.DOI || '',
            publicationTitle: item.venue || item.journal?.name || '',
            volume: item.volume || '',
            issue: item.issue || '',
            pages: item.pages || '',
            year: item.year?.toString() || '',
            type: 'journal-article',
            publisher: item.journal?.name || ''
          });
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

/**
 * 从PDF文本中提取更多元数据
 */
function extractMetadataFromText(text, fallbackTitle) {
  const metadata = {
    title: fallbackTitle || '',
    authors: [],
    publicationTitle: '',
    year: '',
    abstract: '',
    doi: '',
    keywords: []
  };

  const lines = text.split('\n').map(l => l.trim()).filter(l => l);

  // 提取DOI (格式: 10.xxx/xxxx)
  const doiMatch = text.match(/10\.\d{4,}\/[^\s\]""'<>]+/);
  if (doiMatch) {
    metadata.doi = doiMatch[0];
  }

  // 提取年份 (格式: 2020, 2024等)
  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    metadata.year = yearMatch[0];
  }

  // 提取摘要
  const abstractMatch = text.match(/(?:Abstract|摘要|ABSTRACT)\s*[:：]\s*([^\n]+)/i);
  if (abstractMatch) {
    metadata.abstract = abstractMatch[1];
  }

  // 提取关键词
  const keywordsMatch = text.match(/(?:Keywords|关键词|KEYWORDS)\s*[:：]\s*([^\n]+)/i);
  if (keywordsMatch) {
    metadata.keywords = keywordsMatch[1].split(/[,;，；]/).map(k => k.trim()).filter(k => k);
  }

  // 提取期刊/会议名 (常见格式)
  const journalPatterns = [
    /(?:Proceedings of|in)\s+([A-Z][^\d,]{10,})/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?:\s+Journal|,\s+Vol\.|\s+\d{4})/
  ];

  for (const pattern of journalPatterns) {
    const match = text.match(pattern);
    if (match) {
      metadata.publicationTitle = match[1].trim();
      break;
    }
  }

  // 提取作者 (更智能的解析)
  const authorPatterns = [
    // 多个英文名，逗号分隔
    /(?:[A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+,?\s*){2,}/,
    // 作者声明后的列表
    /(?:Authors?|作者)[\s:：]+\n*([^\n]+)/i
  ];

  for (const pattern of authorPatterns) {
    const match = text.match(pattern);
    if (match) {
      const authorText = match[0] || match[1];
      const authors = authorText.split(/,|&/).map(a => a.trim()).filter(a => a);

      metadata.authors = authors.map(author => {
        const parts = author.split(/\s+/);
        if (parts.length >= 2) {
          return {
            firstName: parts.slice(0, -1).join(' '),
            lastName: parts[parts.length - 1]
          };
        } else {
          return {
            firstName: '',
            lastName: author
          };
        }
      }).slice(0, 10); // 最多10个作者

      if (metadata.authors.length > 0) break;
    }
  }

  return metadata;
}

/**
 * 计算两个字符串的相似度 (使用简单的编辑距离算法)
 */
function calculateSimilarity(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // deletion
        matrix[i][j - 1] + 1,     // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const maxLen = Math.max(len1, len2);
  return 1 - matrix[len1][len2] / maxLen;
}

module.exports = {
  queryOnlineMetadata,
  queryByDOI,
  queryCrossrefByTitle,
  querySemanticScholarByTitle,
  extractMetadataFromText
};
