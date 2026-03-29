/**
 * Zotero Desktop Compatibility Layer
 * 让桌面版代码在Web环境中运行
 */

// 模拟Zotero全局对象
const Zotero = {
  debug: console.log,
  log: console.log,
  logError: console.error,

  // 数据库访问
  DB: {
    queryAsync: async (sql: string, params?: any[]) => {
      const { default: zoteroDB } = await import('./database/ZoteroDB');
      return zoteroDB.query(sql, params);
    },

    executeTransaction: async (callback: Function) => {
      const { default: zoteroDB } = await import('./database/ZoteroDB');
      await zoteroDB.beginTransaction();
      try {
        await callback();
        await zoteroDB.commitTransaction();
      } catch (error) {
        await zoteroDB.rollbackTransaction();
        throw error;
      }
    }
  },

  // 日期工具
  Date: {
    dateToSQL: (date: Date, includeTime: boolean = false) => {
      const d = date.toISOString();
      return includeTime ? d : d.split('T')[0];
    },

    toUnixTimestamp: (date: Date) => {
      return Math.floor(date.getTime() / 1000);
    },

    sqlToDate: (sqlDate: string) => {
      return new Date(sqlDate);
    }
  },

  // 工具函数
  Utilities: {
    generateKey: () => {
      return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

   Internal: {
      // 更多内部工具
    }
  },

  // 配置
  Prefs: {
    get: (key: string) => {
      const value = localStorage.getItem(`zotero.prefs.${key}`);
      return value ? JSON.parse(value) : null;
    },

    set: (key: string, value: any) => {
      localStorage.setItem(`zotero.prefs.${key}`, JSON.stringify(value));
    }
  },

  // 字符串本地化
  getString: (key: string) => {
    // 简化版，实际应该从本地化文件读取
    return key;
  }
};

// XPCOM 相关模拟
const ChromeUtils = {
  defineESModuleGetters: (obj: any, imports: any) => {
    Object.keys(imports).forEach(key => {
      obj[key] = imports[key];
    });
  }
};

const Services = {
  prefs: {
    getBranch: (prefName: string) => ({
      getCharPref: (key: string) => localStorage.getItem(`${prefName}.${key}`) || '',
      setCharPref: (key: string, value: string) => localStorage.setItem(`${prefName}.${key}`, value),
      getBoolPref: (key: string) => {
        const value = localStorage.getItem(`${prefName}.${key}`);
        return value === 'true';
      }
    })
  },

  strings: {
    // 字符串服务
  },

  obs: {
    // 观察者服务
  },

  wm: {
    // 窗口管理器
  }
};

// 路径工具模拟
const PathUtils = {
  filename: (path: string) => {
    return path.split('/').pop() || path.split('\\').pop() || path;
  },

  join: (...parts: string[]) => {
    return parts.join('/').replace(/\/+/g, '/');
  }
};

const OS = {
  Path: {
    join: PathUtils.join,
    filename: PathUtils.filename
  }
};

// 将Zotero对象暴露到全局
(window as any).Zotero = Zotero;
(window as any).ChromeUtils = ChromeUtils;
(window as any).Services = Services;
(window as any).PathUtils = PathUtils;
(window as any).OS = OS;

// 扩展Zotero对象属性
Object.defineProperty(Zotero, 'debug', { value: console.log, writable: false });
Object.defineProperty(Zotero, 'log', { value: console.log, writable: false });
Object.defineProperty(Zotero, 'logError', { value: console.error, writable: false });

// 模拟require函数
(window as any).require = (moduleName: string) => {
  switch (moduleName) {
    case 'components/utils':
      return {
        noop: () => {},
        getDragTargetOrient: () => {}
      };

    case 'components/virtualized-table':
      // 使用我们的虚拟化表格
      return {
        VirtualizedTable: null, // Will be resolved by actual import
        renderCell: () => {},
        formatColumnName: (name: string) => name
      };

    case 'components/icons':
      return {
        getCSSIcon: () => '',
        getCSSItemTypeIcon: () => ''
      };

    case 'zotero/itemTreeColumns':
      // 简化的列配置
      return {
        COLUMNS: {
          title: {
            dataKey: 'title',
            label: 'Title',
            width: 300,
            flexGrow: 1,
            sortable: true
          },
          creators: {
            dataKey: 'creators',
            label: 'Creator',
            width: 200,
            sortable: true
          },
          date: {
            dataKey: 'date',
            label: 'Date',
            width: 120,
            sortable: true
          },
          itemType: {
            dataKey: 'itemType',
            label: 'Type',
            width: 100,
            sortable: true
          }
        }
      };

    default:
      console.warn(`Module ${moduleName} not found in compatibility layer`);
      return {};
  }
};

// 模拟defineProperty函数
// @ts-ignore - Adding property to Zotero object for compatibility
Zotero.defineProperty = (obj: any, prop: string, descriptor: PropertyDescriptor) => {
  Object.defineProperty(obj, prop, descriptor);
};

export default Zotero;
