# Paper-Master

A modern web-based reference management application built with React + TypeScript + Vite.

## Features

### Core Functionality ✅

- ✅ **Item Management** - Create, read, update, and delete references
- ✅ **Multiple Item Types** - Books, journal articles, conference papers, web pages, reports, and more
- ✅ **Author/Creator Management** - Add, edit, and delete authors
- ✅ **Collection Management** - Browse and manage collections in tree view
- ✅ **Tag Management** - Tag filtering and color-coded organization
- ✅ **Search Functionality** - Real-time search and advanced filtering
- ✅ **PDF Preview** - Online PDF attachment preview
- ✅ **Note Editor** - Rich text note editing
- ✅ **Data Synchronization** - Sync with cloud services or custom servers
- ✅ **Local Storage** - IndexedDB caching for offline access
- ✅ **Auto-save** - Automatic note saving
- ✅ **Responsive Design** - Works on various screen sizes

### Upcoming Features 🚧

- 🚧 Advanced search with multiple conditions
- 🚧 Virtualized lists for large datasets
- 🚧 Drag-and-drop sorting
- 🚧 Data export (BibTeX, RIS, CSV)
- 🚧 Multi-language support

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Data Storage**: Dexie (IndexedDB)
- **PDF Processing**: PDF.js
- **Rich Text Editor**: TipTap
- **UI Components**: React Select, React Virtualized

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The application will be available at http://localhost:5173/

### 3. Build for Production

```bash
npm run build
```

## Project Structure

```
paper-master/
├── src/
│   ├── core/                 # Core business logic
│   │   ├── data/            # Data models
│   │   ├── api/             # API clients
│   │   ├── auth/            # Authentication services
│   │   ├── sync/            # Sync services
│   │   └── stores/          # Data storage abstraction
│   ├── components/          # React components
│   ├── pages/               # Page components
│   ├── hooks/               # Custom React Hooks
│   ├── types/               # TypeScript types
│   └── App.tsx
├── public/                  # Static assets
├── package.json
└── vite.config.ts
```

## Data Storage Architecture

### Three-Tier Storage

1. **DataStore Interface**: Unified storage interface
2. **IndexedDBStore**: Local IndexedDB for offline support
3. **APIClient**: API client for server communication
4. **HybridStore**: Combines local cache with remote API

```typescript
// Usage example
const idb = new IndexedDBStore('PaperMasterDB');
const api = new APIClient(apiKey);
const hybrid = new HybridStore(idb, api);

await hybrid.initialize();
const items = await hybrid.query('item');
```

### Data Models

- **DataObject**: Base class for all data objects
- **Item**: Reference item class
- **Collection**: Collection class
- **Tag**: Tag class

```typescript
// Usage example
const item = new Item(dataStore);
item.fromJSON(apiResponse);
item.title = 'New Title';
await item.save();
```

## Development Plans

- [x] Item creation and editing
- [x] PDF preview
- [x] Note editor
- [ ] Advanced search
- [ ] Virtualized lists
- [ ] Drag-and-drop sorting
- [ ] Data export (BibTeX, RIS, CSV)
- [ ] Multi-language support
- [ ] Performance optimization
- [ ] Mobile optimization

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

AGPL-3.0

## Contributing

Contributions are welcome! Please feel free to submit Issues and Pull Requests.
# Paper-Master
