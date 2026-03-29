/**
 * Sample data for Paper-Master
 */

import { ZoteroItem } from '../data/ZoteroItem';

export async function seedDatabase() {
  try {
    const zoteroDB = await import('./ZoteroDB');
    await zoteroDB.default.init();

    console.log('🌱 正在添加示例数据...');

    // 创建示例书籍
    const book1 = new ZoteroItem('book');
    book1.title = 'The Pragmatic Programmer';
    book1.abstractNote = 'Your journey to mastery in software development.';
    book1.date = '1999-10-30';
    book1.publisher = 'Addison-Wesley';
    book1.ISBN = '978-0201616224';
    book1.setCreators([
      {
        creatorType: 'author',
        firstName: 'Andrew',
        lastName: 'Hunt'
      },
      {
        creatorType: 'author',
        firstName: 'David',
        lastName: 'Thomas'
      }
    ]);
    book1.setTags(['programming', 'development', 'best-practices']);

    await book1.save();

    // 创建示例期刊文章
    const article1 = new ZoteroItem('journalArticle');
    article1.title = 'Deep Learning';
    article1.abstractNote = 'Overview of deep learning techniques and applications in AI.';
    article1.date = '2015-05-28';
    article1.publicationTitle = 'Nature';
    article1.volume = '521';
    article1.issue = '7553';
    article1.pages = '436-444';
    article1.DOI = '10.1038/nature14539';
    article1.setCreators([
      {
        creatorType: 'author',
        firstName: 'Yann',
        lastName: 'LeCun'
      },
      {
        creatorType: 'author',
        firstName: 'Yoshua',
        lastName: 'Bengio'
      },
      {
        creatorType: 'author',
        firstName: 'Geoffrey',
        lastName: 'Hinton'
      }
    ]);
    article1.setTags(['deep-learning', 'AI', 'neural-networks', 'machine-learning']);

    await article1.save();

    // 创建示例网页
    const webpage1 = new ZoteroItem('webpage');
    webpage1.title = 'Zotero官网';
    webpage1.abstractNote = 'Zotero is a free, easy-to-use tool to help you collect, organize, cite, and share research.';
    webpage1.url = 'https://www.zotero.org/';
    webpage1.date = '2024-03-29';
    webpage1.setTags(['research', 'tools', 'academic']);

    await webpage1.save();

    console.log('✅ 示例数据添加完成！');

    // 显示统计信息
    const stats = zoteroDB.default.getStats();
    console.log('📊 数据库统计:', stats);

  } catch (error) {
    console.error('❌ 添加示例数据失败:', error);
  }
}

export default seedDatabase;
