/**
 * 简单的Zotero Web服务器 - sql.js 持久化版本（纯JS，跨Node版本）
 * 运行: node simple-server.cjs
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const pdfParse = require('pdf-parse');
const { queryOnlineMetadata } = require('./metadata-api.cjs');

const app = express();
const PORT = 3001;

let db;
let dbFilePath = path.join(__dirname, 'zotero-data.db');

// 辅助函数：从日期字符串提取年份
function parseYear(dateStr) {
  if (!dateStr) return '';
  const yearMatch = dateStr.match(/(19|20)\d{2}/);
  return yearMatch ? yearMatch[0] : '';
}

// 初始化数据库
async function initDatabase() {
  // 初始化 sql.js
  const SQL = await initSqlJs();

  // 如果数据库文件存在，加载它
  let loadFromFile = false;
  if (fs.existsSync(dbFilePath)) {
    const buffer = fs.readFileSync(dbFilePath);
    db = new SQL.Database(buffer);
    loadFromFile = true;
    console.log('[Server] 从文件加载数据库');
  } else {
    db = new SQL.Database();
    console.log('[Server] 创建新数据库');
  }

  // 创建表
  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      itemID INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE,
      data TEXT,
      version INTEGER DEFAULT 1,
      dateAdded TEXT,
      dateModified TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS collections (
      collectionID INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE,
      data TEXT,
      version INTEGER DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      tagID INTEGER PRIMARY KEY AUTOINCREMENT,
      tag TEXT UNIQUE,
      type INTEGER DEFAULT 0,
      count INTEGER DEFAULT 0
    )
  `);

  if (!loadFromFile) {
    // 初始化示例数据
    initSampleData();
  }

  console.log('[Server] sql.js 数据库已初始化');
}

// 保存数据库到文件
function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbFilePath, buffer);
}

// 初始化示例数据
function initSampleData() {
  const stmt = db.prepare('INSERT INTO items (key, data, version, dateAdded, dateModified) VALUES (?, ?, ?, ?, ?)');

  // 示例条目1 - The Pragmatic Programmer
  stmt.run([
    'SAMPLE1',
    JSON.stringify({
      itemID: 1,
      key: 'SAMPLE1',
      itemType: 'book',
      title: 'The Pragmatic Programmer',
      creators: [
        { creatorType: 'author', firstName: 'Andrew', lastName: 'Hunt' },
        { creatorType: 'author', firstName: 'David', lastName: 'Thomas' }
      ],
      abstractNote: 'Your journey to mastery in software development.',
      edition: '1st',
      publisher: 'Addison-Wesley',
      date: '1999',
      ISBN: '978-0201616224',
      dateAdded: '2024-01-01T00:00:00Z',
      dateModified: '2024-01-01T00:00:00Z',
      version: 1
    }),
    1,
    '2024-01-01T00:00:00Z',
    '2024-01-01T00:00:00Z'
  ]);

  // 示例条目2 - Deep Learning
  stmt.run([
    'SAMPLE2',
    JSON.stringify({
      itemID: 2,
      key: 'SAMPLE2',
      itemType: 'journalArticle',
      title: 'Deep Learning',
      creators: [
        { creatorType: 'author', firstName: 'Yann', lastName: 'LeCun' },
        { creatorType: 'author', firstName: 'Yoshua', lastName: 'Bengio' },
        { creatorType: 'author', firstName: 'Geoffrey', lastName: 'Hinton' }
      ],
      publicationTitle: 'Nature',
      volume: '521',
      issue: '7553',
      pages: '436-444',
      date: '2015',
      DOI: '10.1038/nature14539',
      dateAdded: '2024-01-02T00:00:00Z',
      dateModified: '2024-01-02T00:00:00Z',
      version: 1
    }),
    1,
    '2024-01-02T00:00:00Z',
    '2024-01-02T00:00:00Z'
  ]);
  stmt.free();

  const colStmt = db.prepare('INSERT INTO collections (key, data, version) VALUES (?, ?, ?)');

  // 示例集合1 - Programming
  colStmt.run([
    'COLLECTION1',
    JSON.stringify({
      collectionID: 1,
      key: 'COLLECTION1',
      name: 'Programming',
      parentCollection: false,
      version: 1
    }),
    1
  ]);

  // 示例集合2 - Machine Learning
  colStmt.run([
    'COLLECTION2',
    JSON.stringify({
      collectionID: 2,
      key: 'COLLECTION2',
      name: 'Machine Learning',
      parentCollection: false,
      version: 1
    }),
    1
  ]);
  colStmt.free();

  const tagStmt = db.prepare('INSERT INTO tags (tag, type, count) VALUES (?, ?, ?)');
  tagStmt.run(['programming', 0, 1]);
  tagStmt.run(['deep-learning', 0, 1]);
  tagStmt.run(['ai', 0, 1]);
  tagStmt.free();

  saveDatabase();
  console.log('[Server] 已初始化示例数据 (SAMPLE1, SAMPLE2)');
}

// 从数据库加载数据
function loadFromDatabase() {
  const itemsResult = db.exec('SELECT data FROM items');
  const collectionsResult = db.exec('SELECT data FROM collections');
  const tagsResult = db.exec('SELECT tag, type, count FROM tags');

  const items = itemsResult.length > 0 ? itemsResult[0].values.map(row => JSON.parse(row[0])) : [];
  const collections = collectionsResult.length > 0 ? collectionsResult[0].values.map(row => JSON.parse(row[0])) : [];
  const tags = tagsResult.length > 0 ? tagsResult[0].values.map(row => ({ tagID: 0, tag: row[0], type: row[1], count: row[2] })) : [];

  return { items, collections, tags };
}

// 确保上传目录存在
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).substring(2, 15);
    const ext = path.extname(file.originalname);
    cb(null, 'pdf-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['.pdf', '.ps'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 PDF 和 PS 文件'));
    }
  }
});

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(uploadDir));

// 启动服务器
async function startServer() {
  await initDatabase();

  // API 路由
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      message: '服务正常',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/stats', (req, res) => {
    const { items, collections, tags } = loadFromDatabase();
    res.json({
      data: {
        items: items.length,
        collections: collections.length,
        tags: tags.length
      }
    });
  });

  // 文件上传
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: '没有文件上传' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    console.log('[Server] 文件上传成功:', req.file.originalname, '→', fileUrl);

    // 如果是 PDF，尝试提取元数据
    let metadata = {};
    if (req.file.mimetype === 'application/pdf') {
      try {
        const pdfBuffer = fs.readFileSync(req.file.path);
        const pdfData = await pdfParse(pdfBuffer);

        // 提取基本信息
        metadata = {
          title: pdfData.info?.Title || '',
          author: pdfData.info?.Author || '',
          subject: pdfData.info?.Subject || '',
          creator: pdfData.info?.Creator || '',
          producer: pdfData.info?.Producer || '',
          creationDate: pdfData.info?.CreationDate || '',
          modificationDate: pdfData.info?.ModDate || '',
          pageCount: pdfData.numpages,
          text: pdfData.text?.substring(0, 8000) || '' // 前8000字符用于智能解析
        };

        // 如果PDF没有元数据，尝试从文本内容中智能解析
        if (!metadata.title && metadata.text) {
          const text = metadata.text;

          // 尝试提取标题（通常在第一页，字体较大）
          const lines = text.split('\n').filter(line => line.trim().length > 0);
          if (lines.length > 0) {
            // 第一行通常是标题
            const firstLine = lines[0].trim();
            if (firstLine.length > 5 && firstLine.length < 200 && !firstLine.includes('http')) {
              metadata.title = firstLine;
            }
          }
        }

        // 如果没有作者，尝试从文本中提取
        if (!metadata.author && metadata.text) {
          const text = metadata.text;

          // 常见格式：Author1, Author2, ... 或 Author1 and Author2
          const authorPatterns = [
            /(?:[A-Z][a-z]+ [A-Z][a-z]+,?\s*){2,10}/, // 多个英文名
            /(?:作者|Author|Authors?)[\s:：]+([^\n]+)/i,
          ];

          for (const pattern of authorPatterns) {
            const match = text.match(pattern);
            if (match) {
              metadata.author = match[1] || match[0];
              break;
            }
          }
        }

        console.log('[Server] PDF 元数据提取成功:', {
          title: metadata.title || '(从文件名)',
          author: metadata.author || '(无)',
          fromPDF: !!pdfData.info?.Title,
          textLength: metadata.text.length
        });
      } catch (error) {
        console.error('[Server] PDF 元数据提取失败:', error.message);
      }
    }

    // 尝试从在线API查询元数据（基于标题或DOI）
    if (metadata.title || metadata.doi) {
      try {
        console.log('[Server] 尝试在线查询元数据...');
        const onlineMetadata = await queryOnlineMetadata(metadata.title, metadata.doi, metadata.text);

        if (onlineMetadata && Object.keys(onlineMetadata).length > 0) {
          // 转换为Zotero格式的元数据
          const zoteroMetadata = {
            title: onlineMetadata.title || metadata.title,
            authors: onlineMetadata.authors || [],
            publicationTitle: onlineMetadata.publicationTitle || '',
            journal: onlineMetadata.publicationTitle || onlineMetadata.journal || '',
            volume: onlineMetadata.volume || '',
            issue: onlineMetadata.issue || '',
            pages: onlineMetadata.pages || '',
            year: onlineMetadata.year ||
                 (onlineMetadata.published?.dateParts?.[0] ? onlineMetadata.published.dateParts[0][0] : '') ||
                 parseYear(metadata.creationDate),
            doi: onlineMetadata.doi || metadata.doi || '',
            abstract: onlineMetadata.abstract || metadata.subject || '',
            type: onlineMetadata.type || 'journal-article',
            publisher: onlineMetadata.publisher || '',
            onlineMatch: true
          };

          // 合并元数据，优先使用在线数据
          metadata = { ...metadata, ...zoteroMetadata };
          console.log('[Server] ✅ 在线元数据查询成功:', {
            title: zoteroMetadata.title,
            authors: zoteroMetadata.authors.length,
            source: zoteroMetadata.onlineMatch ? 'online' : 'local'
          });
        }
      } catch (error) {
        console.log('[Server] ⚠️  在线查询失败，使用本地解析:', error.message);
      }
    }

    res.json({
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: fileUrl,
        mimeType: req.file.mimetype,
        metadata
      }
    });
  });

  // 删除文件
  app.delete('/api/upload/:filename', (req, res) => {
    const filename = req.params.filename;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: '无效的文件名' });
    }

    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('[Server] 文件删除成功:', filename);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: '文件不存在' });
    }
  });

  // 条目 API
  app.get('/api/items', (req, res) => {
    const { limit = 50, offset = 0, search } = req.query;
    let { items } = loadFromDatabase();

    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter(item =>
        item.title.toLowerCase().includes(searchLower) ||
        item.creators.some(c =>
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchLower)
        )
      );
    }

    const paginatedItems = items.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    res.json({ data: paginatedItems });
  });

  app.get('/api/items/:id', (req, res) => {
    const { items } = loadFromDatabase();
    const item = items.find(i => i.itemID == req.params.id || i.key === req.params.id);
    if (!item) {
      return res.status(404).json({ error: '条目不存在' });
    }
    res.json({ data: item });
  });

  app.post('/api/items', (req, res) => {
    const { items } = loadFromDatabase();
    const newItem = {
      itemID: items.length > 0 ? Math.max(...items.map(i => i.itemID)) + 1 : 1,
      key: `ITEM${Date.now()}`,
      ...req.body,
      dateAdded: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      version: 1
    };

    const stmt = db.prepare('INSERT INTO items (key, data, version, dateAdded, dateModified) VALUES (?, ?, ?, ?, ?)');
    stmt.run([newItem.key, JSON.stringify(newItem), newItem.version, newItem.dateAdded, newItem.dateModified]);
    stmt.free();

    saveDatabase();
    console.log('[Server] 创建条目:', newItem.title);
    res.json({ data: newItem });
  });

  app.put('/api/items/:id', (req, res) => {
    const { items } = loadFromDatabase();
    const index = items.findIndex(i => i.itemID == req.params.id || i.key === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: '条目不存在' });
    }

    items[index] = {
      ...items[index],
      ...req.body,
      dateModified: new Date().toISOString(),
      version: items[index].version + 1
    };

    const stmt = db.prepare('UPDATE items SET data = ?, version = ?, dateModified = ? WHERE key = ?');
    stmt.run([JSON.stringify(items[index]), items[index].version, items[index].dateModified, items[index].key]);
    stmt.free();

    saveDatabase();
    console.log('[Server] 更新条目:', items[index].title);
    res.json({ data: items[index] });
  });

  app.delete('/api/items/:id', (req, res) => {
    const { items } = loadFromDatabase();
    const index = items.findIndex(i => i.itemID == req.params.id || i.key === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: '条目不存在' });
    }

    const deletedItem = items[index];
    const stmt = db.prepare('DELETE FROM items WHERE key = ?');
    stmt.run([deletedItem.key]);
    stmt.free();

    saveDatabase();
    console.log('[Server] 删除条目:', deletedItem.title);
    res.json({ data: deletedItem });
  });

  // 集合 API
  app.get('/api/collections', (req, res) => {
    const { collections } = loadFromDatabase();
    res.json({ data: collections });
  });

  // 标签 API
  app.get('/api/tags', (req, res) => {
    const { tags } = loadFromDatabase();
    res.json({ data: tags });
  });

  // 同步 API
  app.get('/api/sync', (req, res) => {
    const { items, collections, tags } = loadFromDatabase();
    res.json({
      data: {
        libraryVersion: Date.now(),
        items: items,
        collections: collections,
        tags: tags,
        deletions: {}
      }
    });
  });

  // 错误处理
  app.use((req, res) => {
    res.status(404).json({ error: 'API端点不存在' });
  });

  app.use((err, req, res, next) => {
    console.error('[Server] 错误:', err);
    res.status(500).json({ error: '服务器错误', message: err.message });
  });

  app.listen(PORT, '::', () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║     🚀 Zotero Web 服务器启动成功 (sql.js 持久化)          ║
╠══════════════════════════════════════════════════════════════╣
║  服务器地址:  http://localhost:${PORT}                            ║
║  健康检查:    http://localhost:${PORT}/api/health               ║
║  数据统计:    http://localhost:${PORT}/api/stats                 ║
║  数据库:     ${dbFilePath.split('/').pop()} (持久化存储)              ║
║  数据库引擎:  sql.js (纯JS, 跨版本兼容)                        ║
║                                                                    ║
║  📚 可用API端点:                                                  ║
║    POST /api/upload        - 上传PDF文件                       ║
║    GET  /api/items         - 获取所有条目                     ║
║    POST /api/items         - 创建新条目                       ║
║    PUT  /api/items/:id     - 更新条目                         ║
║    DELETE /api/items/:id   - 删除条目                         ║
║                                                                    ║
║  🎯 Web应用地址:  http://localhost:8000                          ║
║                                                                    ║
║  按 Ctrl+C 停止服务器                                             ║
╚══════════════════════════════════════════════════════════════╝
    `);
  });
}

startServer().catch(err => {
  console.error('[Server] 启动失败:', err);
  process.exit(1);
});

module.exports = app;
