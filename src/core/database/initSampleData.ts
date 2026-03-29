/**
 * Initialize database with sample data for testing
 * 一次初始化示例数据用于测试
 */

import zoteroDB from './ZoteroDB';

export async function initSampleData(): Promise<void> {
  try {
    await zoteroDB.init();

    // 检查是否已有数据
    const existingItems = zoteroDB.query('SELECT COUNT(*) as count FROM items');
    if (existingItems[0].count > 0) {
      console.log('[SampleData] 数据已存在，跳过初始化');
      return;
    }

    console.log('[SampleData] 开始初始化示例数据...');

    // 简化的示例条目数据
    const sampleItems = [
      {
        itemType: 'book',
        title: 'The Pragmatic Programmer',
        abstractNote: 'A practical guide to programming that helps you write better code.',
        date: '1999-10-30',
        year: 1999,
        publisher: 'Addison-Wesley',
        publicationTitle: '',
        volume: '',
        issue: '',
        pages: '352',
        url: 'https://pragprog.com/titles/tpp20/',
        DOI: '10.201/isbn.9780201616224',
        ISBN: '978-0201616224',
        ISSN: '',
        extra: '',
        series: '',
        seriesTitle: '',
        seriesText: '',
        creators: [
          { creatorType: 'author', firstName: 'Andrew', lastName: 'Hunt' },
          { creatorType: 'author', firstName: 'David', lastName: 'Thomas' }
        ],
        tags: ['programming', 'software-development', 'best-practices']
      },
      {
        itemType: 'book',
        title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
        abstractNote: 'Even bad code can function. But if code isn\'t clean, it can bring a development organization to its knees.',
        date: '2008-08-01',
        year: 2008,
        publisher: 'Prentice Hall',
        publicationTitle: '',
        volume: '',
        issue: '',
        pages: '464',
        url: 'https://www.pearson.com/en-us/subject-catalog/p/clean-code/P200000003240',
        DOI: '10.201/isbn.9780136083238',
        ISBN: '978-0136083238',
        ISSN: '',
        extra: '',
        series: '',
        seriesTitle: '',
        seriesText: '',
        creators: [
          { creatorType: 'author', firstName: 'Robert C.', lastName: 'Martin' }
        ],
        tags: ['programming', 'clean-code', 'agile', 'software-architecture']
      },
      {
        itemType: 'journalArticle',
        title: 'Attention Is All You Need',
        abstractNote: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose a new simple network architecture, the Transformer.',
        date: '2017-06-12',
        year: 2017,
        publisher: '',
        publicationTitle: 'Advances in Neural Information Processing Systems',
        volume: '30',
        issue: '',
        pages: '5998-6008',
        url: 'https://arxiv.org/abs/1706.03762',
        DOI: '10.5555/3295222.3295349',
        ISBN: '',
        ISSN: '',
        extra: 'arXiv:1706.03762',
        series: '',
        seriesTitle: '',
        seriesText: '',
        creators: [
          { creatorType: 'author', firstName: 'Ashish', lastName: 'Vaswani' },
          { creatorType: 'author', firstName: 'Noam', lastName: 'Shazeer' },
          { creatorType: 'author', firstName: 'Niki', lastName: 'Parmar' }
        ],
        tags: ['machine-learning', 'deep-learning', 'transformers', 'NLP', 'AI']
      }
    ];

    // 插入示例数据
    for (const item of sampleItems) {
      const key = `${item.itemType.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      // 插入条目 - 确保所有字段都有值
      const result = zoteroDB.run(`
        INSERT INTO items (
          libraryID, key, itemType, dateAdded, dateModified, version, synced,
          title, abstractNote, date, year, publisher, publicationTitle,
          volume, issue, pages, series, seriesTitle, seriesText,
          url, DOI, ISBN, ISSN, extra, deleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        1, // libraryID
        key,
        item.itemType,
        now,
        now,
        1, // version
        0, // synced
        item.title || '',
        item.abstractNote || '',
        item.date || '',
        item.year || null,
        item.publisher || '',
        item.publicationTitle || '',
        item.volume || '',
        item.issue || '',
        item.pages || '',
        item.series || '',
        item.seriesTitle || '',
        item.seriesText || '',
        item.url || '',
        item.DOI || '',
        item.ISBN || '',
        item.ISSN || '',
        item.extra || '',
        0  // deleted
      ]);

      const itemID = result.lastID;

      // 插入创作者
      if (item.creators && item.creators.length > 0) {
        item.creators.forEach((creator: any, index: number) => {
          zoteroDB.run(`
            INSERT INTO creators (itemID, creatorType, firstName, lastName, orderIndex)
            VALUES (?, ?, ?, ?, ?)
          `, [
            itemID,
            creator.creatorType || 'author',
            creator.firstName || '',
            creator.lastName || '',
            index
          ]);
        });
      }

      // 插入标签
      if (item.tags && item.tags.length > 0) {
        for (const tagName of item.tags) {
          // 确保标签存在
          let tagResults = zoteroDB.query('SELECT tagID FROM tags WHERE name = ?', [tagName]);
          let tagID: number;

          if (tagResults.length === 0) {
            const tagResult = zoteroDB.run(`
              INSERT INTO tags (libraryID, name, type, dateAdded, dateModified, version, synced, deleted)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              1, // libraryID
              tagName,
              0, // type
              now,
              now,
              1, // version
              0, // synced
              0  // deleted
            ]);
            tagID = tagResult.lastID;
          } else {
            tagID = tagResults[0].tagID;
          }

          // 关联标签
          zoteroDB.run('INSERT OR IGNORE INTO item_tags (itemID, tagID) VALUES (?, ?)', [itemID, tagID]);
        }
      }
    }

    // 插入示例集合
    const sampleCollections = [
      { name: '机器学习', parent: null },
      { name: '深度学习', parent: '机器学习' },
      { name: '编程最佳实践', parent: null },
      { name: '软件架构', parent: '编程最佳实践' }
    ];

    let collectionID = 1;
    const collectionMap: Record<string, number> = {};

    for (const collection of sampleCollections) {
      const key = `COLLECTION_${Date.now()}_${collectionID}`;
      const now = new Date().toISOString();
      const parentCollectionID = collection.parent ? collectionMap[collection.parent] : null;

      const result = zoteroDB.run(`
        INSERT INTO collections (libraryID, key, name, parentCollectionID, dateAdded, dateModified, version, synced, deleted)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        1, // libraryID
        key,
        collection.name,
        parentCollectionID,
        now,
        now,
        1, // version
        0, // synced
        0  // deleted
      ]);

      collectionMap[collection.name] = result.lastID;
      collectionID++;
    }

    await zoteroDB.save();

    console.log('[SampleData] 示例数据初始化完成!');
    console.log(`[SampleData] 已插入 ${sampleItems.length} 个条目`);
    console.log(`[SampleData] 已插入 ${sampleCollections.length} 个集合`);

  } catch (error) {
    console.error('[SampleData] 初始化失败:', error);
    throw error;
  }
}

export default initSampleData;