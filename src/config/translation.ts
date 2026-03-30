/**
 * 翻译服务配置
 * 支持多种翻译API服务
 */

export type TranslationService =
  | 'libretranslate'
  | 'mymemory'
  | 'baidu'
  | 'tencent'
  | 'deepl'
  | 'openai'
  | 'custom';

export type TargetLanguage = 'zh' | 'en' | 'ja' | 'ko' | 'auto';

export interface TranslationSettings {
  // 翻译服务选择
  service: TranslationService;

  // API配置
  apiKey?: string;
  apiEndpoint?: string;
  appID?: string; // 百度/腾讯需要
  secretKey?: string; // 腾讯需要

  // 翻译行为
  targetLanguage: TargetLanguage;
  enableAutoDetect: boolean;
  enableFallback: boolean; // 主API失败时是否使用备用

  // UI设置
  showOnSelect: boolean; // 选中文本时自动显示翻译
}

export const defaultSettings: TranslationSettings = {
  service: 'libretranslate',
  targetLanguage: 'zh',
  enableAutoDetect: true,
  enableFallback: true,
  showOnSelect: true
};

// 预设服务配置
export const servicePresets: Record<string, Partial<TranslationSettings>> = {
  libretranslate: {
    service: 'libretranslate',
    apiEndpoint: 'https://libretranslate.com/translate'
  },
  mymemory: {
    service: 'mymemory',
    apiEndpoint: 'https://api.mymemory.translated.net/get'
  },
  baidu: {
    service: 'baidu',
    apiEndpoint: 'http://api.fanyi.baidu.com/api/trans/vip/translate'
  },
  tencent: {
    service: 'tencent',
    apiEndpoint: 'https://tmt.tencentcloudapi.com/'
  },
  deepl: {
    service: 'deepl',
    apiEndpoint: 'https://api-free.deepl.com/v2/translate'
  },
  openai: {
    service: 'openai',
    apiEndpoint: 'https://api.openai.com/v1/chat/completions'
  }
};

// 服务显示名称
export const serviceDisplayNames: Record<TranslationService, string> = {
  libretranslate: 'LibreTranslate (免费)',
  mymemory: 'MyMemory (免费)',
  baidu: '百度翻译',
  tencent: '腾讯翻译',
  deepl: 'DeepL',
  openai: 'OpenAI',
  custom: '自定义'
};

// 服务所需字段
export const serviceRequiredFields: Record<TranslationService, string[]> = {
  libretranslate: [],
  mymemory: [],
  baidu: ['appID', 'apiKey'],
  tencent: ['secretKey', 'apiKey'],
  deepl: ['apiKey'],
  openai: ['apiKey'],
  custom: ['apiEndpoint']
};

// 语言代码映射
export const languageNames: Record<TargetLanguage, string> = {
  zh: '中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  auto: '自动检测'
};
