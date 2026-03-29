/**
 * 简单的Zotero Web服务器
 * 用于测试自定义服务器同步功能
 * 运行: node simple-server.js
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 内存数据存储 (可以用真实数据库替换)
let items = [
  {
    itemID: 1,
    key: 'ITEM1',
    itemType: 'book',
    title: 'JavaScript高级程序设计',
    creators: [
      { creatorType: 'author', firstName: 'Nicholas', lastName: 'Zakas' }
    ],
    tags: ['编程', 'JavaScript'],
    date: '2020',
    publisher: '人民邮电出版社',
    abstractNote: '本书深入探讨了JavaScript语言的核心概念',
    dateAdded: '2024-01-01T00:00:00Z',
    dateModified: '2024-01-01T00:00:00Z',
    version: 1
  },
  {
    itemID: 2,
    key: 'ITEM2',
    itemType: 'journalArticle',
    title: 'React框架设计原理',
    creators: [
      { creatorType: 'author', firstName: 'Dan', lastName: 'Abramov' }
    ],
    tags: ['React', '前端'],
    date: '2023',
    publicationTitle: 'React Blog',
    abstractNote: '深入分析React的设计理念和实现细节',
    dateAdded: '2024-01-02T00:00:00Z',
    dateModified: '2024-01-02T00:00:00Z',
    version: 1
  }
];

let collections = [
  {
    collectionID: 1,
    key: 'COLLECTION1',
    name: '编程书籍',
    parentCollection: false,
    version: 1
  },
  {
    collectionID: 2,
    key: 'COLLECTION2',
    name: '前端技术',
    parentCollection: false,
    version: 1
  }
];

let tags = [
  { tagID: 1, tag: '编程', type: 0, count: 2 },
  { tagID: 2, tag: 'JavaScript', type: 0, count: 1 },
  { tagID: 3, tag: 'React', type: 0, count: 1 },
  { tagID: 4, tag: '前端', type: 0, count: 1 }
];

let nextItemID = 3;
let nextCollectionID = 3;
let nextTagID = 5;

// API路由

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: '服务正常',
    timestamp: new Date().toISOString()
  });
});

// 获取统计信息
app.get('/api/stats', (req, res) => {
  res.json({
    data: {
      items: items.length,
      collections: collections.length,
      tags: tags.length
    }
  });
});

// === 条目API ===

// 获取所有条目
app.get('/api/items', (req, res) => {
  const { limit = 50, offset = 0, search } = req.query;

  let filteredItems = items;

  if (search) {
    const searchLower = search.toLowerCase();
    filteredItems = items.filter(item =>
      item.title.toLowerCase().includes(searchLower) ||
      item.creators.some(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchLower)
      )
    );
  }

  const paginatedItems = filteredItems.slice(
    parseInt(offset),
    parseInt(offset) + parseInt(limit)
  );

  res.json({ data: paginatedItems });
});

// 获取单个条目
app.get('/api/items/:id', (req, res) => {
  const item = items.find(i => i.itemID == req.params.id || i.key === req.params.id);

  if (!item) {
    return res.status(404).json({ error: '条目不存在' });
  }

  res.json({ data: item });
});

// 创建条目
app.post('/api/items', (req, res) => {
  const newItem = {
    itemID: nextItemID++,
    key: `ITEM${Date.now()}`,
    ...req.body,
    dateAdded: new Date().toISOString(),
    dateModified: new Date().toISOString(),
    version: 1
  };

  items.push(newItem);

  console.log('[Server] 创建条目:', newItem.title);
  res.json({ data: newItem });
});

// 更新条目
app.put('/api/items/:id', (req, res) => {
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

  console.log('[Server] 更新条目:', items[index].title);
  res.json({ data: items[index] });
});

// 删除条目
app.delete('/api/items/:id', (req, res) => {
  const index = items.findIndex(i => i.itemID == req.params.id || i.key === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: '条目不存在' });
  }

  const deletedItem = items.splice(index, 1)[0];
  console.log('[Server] 删除条目:', deletedItem.title);

  res.json({ data: deletedItem });
});

// === 集合API ===

// 获取所有集合
app.get('/api/collections', (req, res) => {
  res.json({ data: collections });
});

// 创建集合
app.post('/api/collections', (req, res) => {
  const newCollection = {
    collectionID: nextCollectionID++,
    key: `COLLECTION${Date.now()}`,
    ...req.body,
    version: 1
  };

  collections.push(newCollection);
  console.log('[Server] 创建集合:', newCollection.name);

  res.json({ data: newCollection });
});

// 更新集合
app.put('/api/collections/:id', (req, res) => {
  const index = collections.findIndex(c => c.collectionID == req.params.id || c.key === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: '集合不存在' });
  }

  collections[index] = {
    ...collections[index],
    ...req.body,
    version: collections[index].version + 1
  };

  console.log('[Server] 更新集合:', collections[index].name);
  res.json({ data: collections[index] });
});

// 删除集合
app.delete('/api/collections/:id', (req, res) => {
  const index = collections.findIndex(c => c.collectionID == req.params.id || c.key === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: '集合不存在' });
  }

  const deletedCollection = collections.splice(index, 1)[0];
  console.log('[Server] 删除集合:', deletedCollection.name);

  res.json({ data: deletedCollection });
});

// === 标签API ===

// 获取所有标签
app.get('/api/tags', (req, res) => {
  res.json({ data: tags });
});

// 创建标签
app.post('/api/tags', (req, res) => {
  const existingTag = tags.find(t => t.tag === req.body.tag);

  if (existingTag) {
    // 更新现有标签计数
    existingTag.count++;
    return res.json({ data: existingTag });
  }

  const newTag = {
    tagID: nextTagID++,
    tag: req.body.tag,
    type: 0,
    count: 1
  };

  tags.push(newTag);
  console.log('[Server] 创建标签:', newTag.tag);

  res.json({ data: newTag });
});

// 删除标签
app.delete('/api/tags/:id', (req, res) => {
  const index = tags.findIndex(t => t.tagID == req.params.id || t.tag === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: '标签不存在' });
  }

  const deletedTag = tags.splice(index, 1)[0];
  console.log('[Server] 删除标签:', deletedTag.tag);

  res.json({ data: deletedTag });
});

// === 同步API ===

// 完整同步
app.get('/api/sync', (req, res) => {
  console.log('[Server] 执行完整同步');

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

// 导出数据
app.get('/api/export', (req, res) => {
  res.json({
    data: {
      items,
      collections,
      tags,
      exportDate: new Date().toISOString()
    }
  });
});

// 导入数据
app.post('/api/import', (req, res) => {
  const { items: newItems, collections: newCollections, tags: newTags } = req.body;

  if (newItems) {
    items = [...items, ...newItems.map(item => ({
      ...item,
      itemID: nextItemID++,
      dateAdded: new Date().toISOString()
    }))];
  }

  if (newCollections) {
    collections = [...collections, ...newCollections.map(col => ({
      ...col,
      collectionID: nextCollectionID++,
      version: 1
    }))];
  }

  if (newTags) {
    tags = [...tags, ...newTags.map(tag => ({
      ...tag,
      tagID: nextTagID++,
      count: 1
    }))];
  }

  console.log('[Server] 数据导入完成');
  res.json({
    data: {
      success: true,
      itemsCount: items.length,
      collectionsCount: collections.length,
      tagsCount: tags.length
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

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           🚀 Zotero Web 服务器启动成功                      ║
╠══════════════════════════════════════════════════════════════╣
║  服务器地址:  http://localhost:${PORT}                            ║
║  健康检查:    http://localhost:${PORT}/api/health               ║
║  数据统计:    http://localhost:${PORT}/api/stats                 ║
║                                                                    ║
║  📚 可用API端点:                                                  ║
║    GET  /api/items          - 获取所有条目                       ║
║    POST /api/items          - 创建新条目                         ║
║    PUT  /api/items/:id      - 更新条目                           ║
║    DELETE /api/items/:id    - 删除条目                           ║
║    GET  /api/collections    - 获取所有集合                       ║
║    GET  /api/tags           - 获取所有标签                       ║
║    GET  /api/sync           - 执行完整同步                       ║
║                                                                    ║
║  🎯 Web应用地址:  http://localhost:8000                          ║
║                                                                    ║
║  按 Ctrl+C 停止服务器                                             ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;