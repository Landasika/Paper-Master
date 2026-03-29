import type { Item, Collection, Tag } from '../types';

/**
 * 示例数据，用于首次使用时展示
 */
export const sampleItems: Item[] = [
  {
    key: 'SAMPLE1',
    itemType: 'book',
    title: 'The Pragmatic Programmer',
    creators: [
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
    ],
    abstractNote: 'Your journey to mastery in software development.',
    edition: '1st',
    publisher: 'Addison-Wesley',
    date: '1999',
    ISBN: '978-0201616224',
    libraryID: 1,
    dateAdded: '2024-01-01T00:00:00Z',
    dateModified: '2024-01-01T00:00:00Z',
    version: 1
  },
  {
    key: 'SAMPLE2',
    itemType: 'journalArticle',
    title: 'Deep Learning',
    creators: [
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
    ],
    publicationTitle: 'Nature',
    volume: '521',
    issue: '7553',
    pages: '436-444',
    date: '2015',
    DOI: '10.1038/nature14539',
    libraryID: 1,
    dateAdded: '2024-01-02T00:00:00Z',
    dateModified: '2024-01-02T00:00:00Z',
    version: 1
  }
];

export const sampleCollections: Collection[] = [
  {
    key: 'COLLECTION1',
    name: 'Programming',
    parentCollection: false,
    version: 1,
    relations: {}
  },
  {
    key: 'COLLECTION2',
    name: 'Machine Learning',
    parentCollection: false,
    version: 1,
    relations: {}
  }
];

export const sampleTags: Tag[] = [
  {
    tag: 'programming',
    type: 0,
    count: 1
  },
  {
    tag: 'deep-learning',
    type: 0,
    count: 1
  },
  {
    tag: 'ai',
    type: 0,
    count: 1
  }
];

export async function loadSampleData(dataStore: any) {
  try {
    await dataStore.save('item', sampleItems);
    await dataStore.save('collection', sampleCollections);
    await dataStore.save('tag', sampleTags);
    console.log('[SampleData] Loaded sample data');
  } catch (error) {
    console.error('[SampleData] Failed to load sample data:', error);
  }
}
