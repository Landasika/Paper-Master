# Zotero PDF Reader 集成说明

## 已完成的集成 ✅

### 1. 文件结构
```
public/zotero-reader/     # Zotero Reader 构建文件
├── reader.html          # 主页面（已修改）
├── reader.js            # 核心逻辑
├── reader.css           # 样式文件
├── pdf/                 # PDF.js 资源
└── mathjax-fonts/       # 数学字体

src/components/
└── ZoteroPDFView.tsx    # Zotero Reader 桥接组件
```

### 2. 工作原理

```
┌─────────────────────────────────────────┐
│          Paper-Master 应用               │
│  ┌─────────────────────────────────┐   │
│  │   ZoteroPDFView 组件            │   │
│  │  ┌─────────────────────────┐   │   │
│  │  │   iframe (postMessage)  │   │   │
│  │  │  ┌───────────────────┐  │   │   │
│  │  │  │  Zotero Reader   │  │   │   │
│  │  │  │  - PDF 渲染       │  │   │   │
│  │  │  │  - 注释系统       │  │   │   │
│  │  │  │  - 高亮/下划线    │  │   │   │
│  │  │  │  - 划词翻译       │  │   │   │
│  │  │  └───────────────────┘  │   │   │
│  │  └─────────────────────────┘   │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### 3. 通信方式

**父窗口 → Reader (iframe)**
```javascript
// 初始化
iframe.contentWindow.postMessage({
  type: 'init',
  url: 'http://...',
  title: '论文标题',
  readOnly: false
}, '*');
```

**Reader (iframe) → 父窗口**
```javascript
// 保存注释
window.parent.postMessage({
  type: 'onSaveAnnotations',
  annotations: [...]
}, '*');

// 打开链接
window.parent.postMessage({
  type: 'onOpenLink',
  url: 'https://...'
}, '*');
```

## Zotero Reader 功能

### ✅ 已支持的功能

1. **PDF 渲染**
   - 高质量渲染
   - 支持缩放（50%-500%）
   - 页面导航

2. **注释系统**
   - 🖍️ 高亮（多种颜色）
   - 📝 下划线
   - 💬 笔记
   - 🖼️ 图片标注
   - ✍️ 手写笔迹
   - 🧽 橡皮擦

3. **侧边栏**
   - 注释列表
   - 缩略图
   - 大纲目录

4. **其他功能**
   - 全文搜索
   - 复制文本
   - 打印 PDF

### ❌ 可能需要额外配置的功能

- **划词翻译**: 需要额外实现
- **朗读功能**: 需要配置语音服务
- **同步到 Zotero**: 需要 Zotero API

## 使用方法

### 方式 1：直接在 Library 中使用

已经自动集成！点击任意 PDF 即可使用 Zotero Reader 打开。

### 方式 2：独立使用

```tsx
import { ZoteroPDFView } from '../components/ZoteroPDFView';

<ZoteroPDFView
  attachmentKey="ATTACH_123"
  onClose={() => console.log('关闭')}
/>
```

## 自定义配置

### 修改默认设置

编辑 `public/zotero-reader/reader.html`:

```javascript
readerInstance = window.createReader({
  // 基础设置
  type: 'pdf',
  data: pdfUrl,
  readOnly: false,

  // 界面设置
  sidebarOpen: true,        // 侧边栏默认打开
  sidebarWidth: 240,        // 侧边栏宽度
  fontSize: 1,              // 字体大小
  fontFamily: 'sans-serif', // 字体

  // 主题
  lightTheme: 'light',
  darkTheme: 'dark',

  // 工具设置
  textSelectionAnnotationMode: 'highlight', // 选中文本时的默认工具
});
```

### 添加划词翻译

在 `ZoteroPDFView.tsx` 的 `handleMessage` 函数中添加：

```javascript
case 'onTextSelection':
  if (event.data.text) {
    // 调用翻译 API
    translateText(event.data.text);
  }
  break;
```

## 常见问题

### 1. Reader 无法加载 PDF

**原因**: CORS 跨域问题

**解决**: 确保后端服务器设置了正确的 CORS 头：

```javascript
// simple-server.cjs
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
```

### 2. 样式显示异常

**原因**: CSS 文件路径错误

**解决**: 检查 `public/zotero-reader/` 目录下所有文件是否完整。

### 3. 无法选择文本

**原因**: PDF 文件是扫描版图片

**解决**: 需要 OCR 处理， Zotero Reader 可以集成 OCR 功能。

## 下一步优化

1. **持久化注释**: 将注释保存到 IndexedDB
2. **导出功能**: 导出带注释的 PDF
3. **快捷键**: 自定义键盘快捷键
4. **主题定制**: 支持自定义颜色主题
5. **性能优化**: 大文件分块加载

## 参考资料

- [Zotero Reader GitHub](https://github.com/zotero/zotero-pdf-reader)
- [Zotero Reader 文档](https://www.zotero.org/support/reader)
- [PDF.js 文档](https://mozilla.github.io/pdf.js/)
