# Paper-Master - Technical Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Web Browser (React)                  │
├─────────────────────────────────────────────────────┤
│  UI Layer:                                          │
│  ├── ItemTree           (Item tree view)            │
│  ├── CollectionTree     (Collection tree view)      │
│  └── VirtualizedTable   (Virtualized table)         │
├─────────────────────────────────────────────────────┤
│  Data Layer:                                        │
│  ├── DataObject         (Base data object class)    │
│  ├── Item               (Reference item model)      │
│  ├── Collection         (Collection model)          │
│  └── Tag                (Tag model)                 │
├─────────────────────────────────────────────────────┤
│  Database Layer:                                     │
│  └── IndexedDB         (Browser database)           │
└─────────────────────────────────────────────────────┘
           ↓ HTTP API
┌─────────────────────────────────────────────────────┐
│              Backend Services (Optional)             │
├─────────────────────────────────────────────────────┤
│  ├── Cloud APIs         (Data synchronization)      │
│  └── Custom Servers     (Self-hosted option)        │
└─────────────────────────────────────────────────────┘
```

## Core Design Principles

1. **Data Model Abstraction** - Clean separation between data and UI
2. **Storage Flexibility** - Multiple storage backend support
3. **Offline-first** - Local caching with sync capabilities
4. **API Compatibility** - Consistent data interfaces

## Tech Stack

### Frontend
- **React 19**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool
- **Dexie**: IndexedDB wrapper
- **React Virtualized**: Performance optimization
- **TipTap**: Rich text editor

### Storage
- **IndexedDB**: Primary local storage
- **LocalStorage**: Configuration storage
- **In-Memory Cache**: Performance optimization

## Implementation Phases

### Phase 1: Core Data Models
- [x] DataObject base class
- [x] Item data model
- [x] Collection data model
- [x] Tag data model

### Phase 2: Database Layer
- [x] IndexedDB setup
- [x] Data access layer
- [x] Query optimization

### Phase 3: UI Components
- [x] Virtualized Table
- [x] ItemTree component
- [x] CollectionTree component
- [x] Search and filter UI

### Phase 4: Integration
- [x] API integration
- [x] PDF preview
- [x] Note editing
- [ ] Advanced features

## Data Flow

```
User Action
    ↓
React Component
    ↓
Custom Hook (useDataStore)
    ↓
DataStore (HybridStore)
    ↓
├─────┬─────┐
│     │     │
IDB   API  Cache
│     │     │
└─────┴─────┘
    ↓
UI Update
```

## Component Structure

### Data Layer
- `DataObject.ts` - Base data object class
- `Item.ts` - Reference item implementation
- `Collection.ts` - Collection implementation
- `Tag.ts` - Tag implementation

### Storage Layer
- `DataStore.ts` - Storage interface
- `IndexedDBStore.ts` - IndexedDB implementation
- `APIClient.ts` - API client
- `HybridStore.ts` - Hybrid storage

### UI Layer
- `Library.tsx` - Main library view
- `ItemEditor.tsx` - Item editor
- `CollectionTree.tsx` - Collection tree
- `VirtualizedTable.tsx` - Virtualized list
