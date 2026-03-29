/**
 * Item type field definitions
 * Maps item types to their required and optional fields
 */

export interface FieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'number' | 'select';
  options?: string[];
  placeholder?: string;
}

export interface ItemTypeDefinition {
  name: string;
  label: string;
  fields: {
    required: string[];
    optional: string[];
  };
}

// Field definitions
export const FIELD_DEFINITIONS: Record<string, FieldDefinition> = {
  // Basic fields
  title: {
    name: 'title',
    label: 'Title',
    type: 'text',
    placeholder: 'Enter title'
  },
  creators: {
    name: 'creators',
    label: 'Authors/Editors',
    type: 'text'
  },
  abstractNote: {
    name: 'abstractNote',
    label: 'Abstract',
    type: 'textarea',
    placeholder: 'Enter abstract'
  },

  // Book fields
  publisher: {
    name: 'publisher',
    label: 'Publisher',
    type: 'text',
    placeholder: 'Publisher name'
  },
  place: {
    name: 'place',
    label: 'Place',
    type: 'text',
    placeholder: 'City of publication'
  },
  ISBN: {
    name: 'ISBN',
    label: 'ISBN',
    type: 'text',
    placeholder: '978-0-0000-0000-0'
  },
  edition: {
    name: 'edition',
    label: 'Edition',
    type: 'text',
    placeholder: 'e.g., 2nd, 3rd'
  },
  volume: {
    name: 'volume',
    label: 'Volume',
    type: 'text',
    placeholder: 'Volume number'
  },
  numberOfVolumes: {
    name: 'numberOfVolumes',
    label: 'Number of Volumes',
    type: 'number',
    placeholder: 'Total volumes'
  },

  // Article fields
  publicationTitle: {
    name: 'publicationTitle',
    label: 'Publication',
    type: 'text',
    placeholder: 'Journal/Magazine name'
  },
  issue: {
    name: 'issue',
    label: 'Issue',
    type: 'text',
    placeholder: 'Issue number'
  },
  pages: {
    name: 'pages',
    label: 'Pages',
    type: 'text',
    placeholder: 'e.g., 1-25'
  },
  ISSN: {
    name: 'ISSN',
    label: 'ISSN',
    type: 'text',
    placeholder: '0000-0000'
  },
  DOI: {
    name: 'DOI',
    label: 'DOI',
    type: 'text',
    placeholder: '10.xxxx/xxxxx'
  },

  // Date fields
  date: {
    name: 'date',
    label: 'Date',
    type: 'text',
    placeholder: 'YYYY-MM-DD or Year'
  },
  accessDate: {
    name: 'accessDate',
    label: 'Accessed',
    type: 'date'
  },
  year: {
    name: 'year',
    label: 'Year',
    type: 'number',
    placeholder: 'Year'
  },

  // URL fields
  url: {
    name: 'url',
    label: 'URL',
    type: 'text',
    placeholder: 'https://example.com'
  },

  // Series
  series: {
    name: 'series',
    label: 'Series',
    type: 'text',
    placeholder: 'Series name'
  },
  seriesTitle: {
    name: 'seriesTitle',
    label: 'Series Title',
    type: 'text',
    placeholder: 'Title in series'
  },

  // Thesis
  thesisType: {
    name: 'thesisType',
    label: 'Type',
    type: 'text',
    placeholder: "Master's Thesis, PhD Thesis"
  },
  university: {
    name: 'university',
    label: 'University',
    type: 'text',
    placeholder: 'University name'
  },

  // Conference
  proceedingsTitle: {
    name: 'proceedingsTitle',
    label: 'Proceedings',
    type: 'text',
    placeholder: 'Conference proceedings'
  },
  conferenceName: {
    name: 'conferenceName',
    label: 'Conference',
    type: 'text',
    placeholder: 'Conference name'
  },

  // Report
  reportType: {
    name: 'reportType',
    label: 'Report Type',
    type: 'text',
    placeholder: 'e.g., Technical Report'
  },
  institution: {
    name: 'institution',
    label: 'Institution',
    type: 'text',
    placeholder: 'Institution name'
  }
};

// Item type definitions
export const ITEM_TYPE_DEFINITIONS: Record<string, ItemTypeDefinition> = {
  book: {
    name: 'book',
    label: 'Book',
    fields: {
      required: ['title'],
      optional: ['creators', 'abstractNote', 'series', 'seriesTitle', 'volume',
                  'numberOfVolumes', 'edition', 'place', 'publisher', 'year',
                  'ISBN', 'url', 'accessDate']
    }
  },

  journalArticle: {
    name: 'journalArticle',
    label: 'Journal Article',
    fields: {
      required: ['title', 'publicationTitle'],
      optional: ['creators', 'abstractNote', 'volume', 'issue', 'pages',
                  'date', 'year', 'DOI', 'ISSN', 'url', 'accessDate']
    }
  },

  magazineArticle: {
    name: 'magazineArticle',
    label: 'Magazine Article',
    fields: {
      required: ['title', 'publicationTitle'],
      optional: ['creators', 'abstractNote', 'volume', 'issue', 'pages',
                  'date', 'year', 'url', 'accessDate']
    }
  },

  newspaperArticle: {
    name: 'newspaperArticle',
    label: 'Newspaper Article',
    fields: {
      required: ['title', 'publicationTitle'],
      optional: ['creators', 'abstractNote', 'pages', 'date', 'year',
                  'section', 'url', 'accessDate']
    }
  },

  thesis: {
    name: 'thesis',
    label: 'Thesis',
    fields: {
      required: ['title', 'university', 'year'],
      optional: ['creators', 'abstractNote', 'thesisType', 'date', 'url', 'accessDate']
    }
  },

  conferencePaper: {
    name: 'conferencePaper',
    label: 'Conference Paper',
    fields: {
      required: ['title', 'conferenceName'],
      optional: ['creators', 'abstractNote', 'proceedingsTitle', 'publisher',
                  'place', 'date', 'year', 'pages', 'url', 'accessDate']
    }
  },

  webpage: {
    name: 'webpage',
    label: 'Web Page',
    fields: {
      required: ['title', 'url'],
      optional: ['creators', 'abstractNote', 'websiteTitle', 'accessDate']
    }
  },

  report: {
    name: 'report',
    label: 'Report',
    fields: {
      required: ['title', 'institution', 'year'],
      optional: ['creators', 'abstractNote', 'reportType', 'place', 'date', 'url', 'accessDate']
    }
  }
};

// Get item type options
export const getItemTypeOptions = (): Array<{ value: string; label: string }> => {
  return Object.values(ITEM_TYPE_DEFINITIONS).map(type => ({
    value: type.name,
    label: type.label
  }));
};

// Get fields for item type
export const getFieldsForItemType = (itemType: string): {
  required: FieldDefinition[];
  optional: FieldDefinition[];
} => {
  const definition = ITEM_TYPE_DEFINITIONS[itemType];
  if (!definition) {
    return { required: [], optional: [] };
  }

  const getField = (fieldName: string): FieldDefinition | undefined => {
    if (fieldName === 'creators') {
      return FIELD_DEFINITIONS.creators;
    }
    return FIELD_DEFINITIONS[fieldName];
  };

  return {
    required: definition.fields.required
      .map(getField)
      .filter((f): f is FieldDefinition => f !== undefined),
    optional: definition.fields.optional
      .map(getField)
      .filter((f): f is FieldDefinition => f !== undefined)
  };
};
