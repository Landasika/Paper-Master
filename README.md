# Paper-Master

一个现代化的文献管理系统，支持 PDF 文件拖拽上传、自动元数据提取、Zotero 格式兼容。

## 功能特性

- ✅ **PDF 拖拽上传**：直接拖拽 PDF 到主窗口即可导入
- ✅ **自动元数据提取**：从 PDF 文件中自动提取标题、作者、年份等信息
- ✅ **Zotero 格式兼容**：完全兼容 Zotero 数据格式
- ✅ **条目管理**：创建、编辑、删除文献条目
- ✅ **笔记系统**：为文献添加笔记
- ✅ **PDF 查看器**：内置 PDF 查看器
- ✅ **数据持久化**：基于 SQLite 的本地数据库
- ✅ **离线模式**：无需网络连接，所有数据本地存储

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务

```bash
./start.sh
```

这将启动：
- 前端开发服务器：http://localhost:8000
- 后端 API 服务器：http://localhost:3001

### 3. 停止服务

```bash
./stop.sh
```

## 使用指南

### 导入 PDF 文件

1. 打开浏览器访问 http://localhost:8000
2. 将 PDF 文件拖拽到主窗口
3. 系统自动：
   - 上传文件到服务器
   - 提取 PDF 元数据（标题、作者、年份、期刊等）
   - 按照 Zotero 格式创建条目
   - 保存到本地数据库

### 管理文献

- **编辑条目**：点击条目卡片的 "Edit" 按钮
- **删除条目**：点击条目卡片的 "Delete" 按钮（会同时删除关联的 PDF 文件）
- **查看 PDF**：点击条目的 "PDF" 按钮
- **添加笔记**：点击条目的 "Add Note" 按钮

### 数据导出/导入

- **导出数据**：点击顶部 "Export" 按钮，导出所有数据为 JSON 文件
- **导入数据**：点击顶部 "Import" 按钮，从 JSON 文件导入数据

## 技术架构

### 前端

- **框架**：React 19 + TypeScript
- **构建工具**：Vite 5.4
- **UI 组件**：自定义组件库
- **状态管理**：React Hooks (useDataStore)
- **数据存储**：ServerStore（连接后端 API）

### 后端

- **框架**：Express.js
- **数据库**：SQLite (sql.js)
- **文件上传**：Multer
- **PDF 解析**：pdf-parse@1.1.1
- **端口**：3001

### 数据存储

- **数据库文件**：`zotero-data.db`
- **上传文件**：`public/uploads/`
- **数据格式**：Zotero JSON 格式

## 项目结构

```
paper-master/
├── src/
│   ├── components/          # React 组件
│   │   ├── forms/          # 表单组件
│   │   ├── modals/         # 模态框组件
│   │   ├── Button.tsx      # 通用按钮
│   │   ├── Modal.tsx       # 通用模态框
│   │   ├── NoteEditor.tsx  # 笔记编辑器
│   │   └── icons.tsx       # 图标组件
│   ├── core/               # 核心逻辑
│   │   ├── data/           # 数据模型
│   │   ├── stores/         # 数据存储 (ServerStore, IndexedDBStore)
│   │   └── index.ts
│   ├── hooks/              # 自定义 Hooks
│   │   └── useDataStore.ts # 数据存储 Hook
│   ├── pages/              # 页面组件
│   │   ├── Library.tsx     # 主页面（文献列表）
│   │   ├── ItemEditor.tsx  # 条目编辑器
│   │   ├── NoteView.tsx    # 笔记查看
│   │   └── PDFView.tsx     # PDF 查看器
│   ├── types/              # TypeScript 类型
│   ├── utils/              # 工具函数
│   ├── App.tsx             # 应用入口
│   └── main.tsx            # React 入口
├── public/                 # 静态资源
│   └── uploads/           # 上传的 PDF 文件
├── simple-server.cjs       # 后端服务器 (Express + SQLite)
├── start.sh               # 启动脚本
├── stop.sh                # 停止脚本
├── vite.config.ts         # Vite 配置
├── tsconfig.json          # TypeScript 配置
└── package.json           # 项目配置
```

## 开发

### 构建生产版本

```bash
npm run build
```

### 代码检查

```bash
npm run lint
```

### 预览生产版本

```bash
npm run preview
```

## 数据格式

### 文献条目示例

```json
{
  "itemType": "journalArticle",
  "title": "Training Language Model Agents to Find Vulnerabilities",
  "creators": [
    {
      "creatorType": "author",
      "firstName": "Terry Yue",
      "lastName": "Zhuo"
    }
  ],
  "publicationTitle": "arXiv",
  "date": "2024",
  "DOI": "10.1234/example",
  "abstractNote": "论文摘要...",
  "attachments": [
    {
      "itemType": "attachment",
      "title": "example.pdf",
      "url": "http://localhost:3001/uploads/pdf-xxx.pdf",
      "filename": "pdf-xxx.pdf"
    }
  ]
}
```

## 已知问题

- PDF 元数据提取依赖 PDF 文件本身是否包含元数据
- 扫描版 PDF 无法提取文本信息
- 某些期刊的 PDF 格式特殊，可能无法正确解析

## 未来计划

- [ ] 集成在线元数据查询 API (Crossref, Google Scholar)
- [ ] 支持批量导入
- [ ] 添加文献分类功能
- [ ] 支持引用管理
- [ ] 添加浏览器扩展
- [ ] 支持多种文献格式（Word, EPUB 等）

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
