// 翻译服务 - 支持多种翻译API
import type { TranslationSettings } from '../config/translation';
import { defaultSettings } from '../config/translation';

interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
}

export class TranslationService {
  private settings: TranslationSettings;

  constructor(settings?: TranslationSettings) {
    this.settings = settings || defaultSettings;
  }

  // 更新设置
  updateSettings(settings: TranslationSettings) {
    this.settings = settings;
  }

  // 主翻译方法
  async translate(text: string): Promise<TranslationResult> {
    if (!text || text.trim().length === 0) {
      throw new Error('文本为空');
    }

    // 检测是否启用翻译
    if (!this.settings.showOnSelect) {
      throw new Error('翻译功能已禁用');
    }

    try {
      // 根据设置选择翻译服务
      let result: TranslationResult;

      switch (this.settings.service) {
        case 'libretranslate':
          result = await this.translateWithLibreTranslate(text);
          break;
        case 'mymemory':
          result = await this.translateWithMyMemory(text);
          break;
        case 'baidu':
          result = await this.translateWithBaidu(text);
          break;
        case 'tencent':
          result = await this.translateWithTencent(text);
          break;
        case 'deepl':
          result = await this.translateWithDeepL(text);
          break;
        case 'openai':
          result = await this.translateWithOpenAI(text);
          break;
        default:
          // 默认使用LibreTranslate
          result = await this.translateWithLibreTranslate(text);
      }

      return result;
    } catch (error) {
      console.error('翻译失败:', error);

      // 如果启用fallback，尝试备用API
      if (this.settings.enableFallback && this.settings.service !== 'libretranslate') {
        console.warn('尝试使用备用API...');
        try {
          return await this.translateWithLibreTranslate(text);
        } catch (fallbackError) {
          console.error('备用API也失败:', fallbackError);
          // 如果LibreTranslate也失败，尝试MyMemory
          if (this.settings.service !== 'mymemory') {
            try {
              return await this.translateWithMyMemory(text);
            } catch (e) {
              throw new Error('所有翻译服务均不可用');
            }
          }
        }
      }

      throw error;
    }
  }

  // LibreTranslate API
  private async translateWithLibreTranslate(text: string): Promise<TranslationResult> {
    const endpoint = this.settings.apiEndpoint || 'https://libretranslate.com/translate';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: 'auto',
        target: this.settings.targetLanguage,
        format: 'text'
      })
    });

    if (!response.ok) {
      throw new Error(`LibreTranslate请求失败: ${response.status}`);
    }

    const data = await response.json();

    return {
      originalText: text,
      translatedText: data.translatedText,
      sourceLang: data.detectedLanguage?.language || 'auto',
      targetLang: this.settings.targetLanguage
    };
  }

  // MyMemory Translation API
  private async translateWithMyMemory(text: string): Promise<TranslationResult> {
    const endpoint = this.settings.apiEndpoint || 'https://api.mymemory.translated.net/get';
    const langPair = `aut|${this.settings.targetLanguage}`;
    const url = `${endpoint}?q=${encodeURIComponent(text)}&langpair=${langPair}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.responseStatus !== 200) {
      throw new Error(data.responseDetails || 'MyMemory翻译失败');
    }

    return {
      originalText: text,
      translatedText: data.responseData.translatedText,
      sourceLang: 'auto',
      targetLang: this.settings.targetLanguage
    };
  }

  // 百度翻译API
  private async translateWithBaidu(text: string): Promise<TranslationResult> {
    const { appID, apiKey, apiEndpoint } = this.settings;
    if (!appID || !apiKey) {
      throw new Error('请配置百度翻译的App ID和密钥');
    }

    // 百度翻译需要MD5签名
    const crypto = await import('crypto-js');
    const salt = Date.now().toString();
    const sign = crypto.MD5(appID + text + salt + apiKey).toString();

    const endpoint = apiEndpoint || 'http://api.fanyi.baidu.com/api/trans/vip/translate';
    const url = `${endpoint}?q=${encodeURIComponent(text)}&from=auto&to=${this.settings.targetLanguage}&appid=${appID}&salt=${salt}&sign=${sign}`;

    const response = await fetch(url, {
      method: 'POST'
    });

    const data = await response.json();

    if (data.error_code) {
      throw new Error(`百度翻译错误: ${data.error_msg || data.error_code}`);
    }

    return {
      originalText: text,
      translatedText: data.trans_result?.[0]?.dst || '',
      sourceLang: data.from || 'auto',
      targetLang: data.to || this.settings.targetLanguage
    };
  }

  // 腾讯翻译API
  private async translateWithTencent(_text: string): Promise<TranslationResult> {
    const { secretKey, apiKey } = this.settings;
    if (!secretKey || !apiKey) {
      throw new Error('请配置腾讯翻译的Secret Key和密钥');
    }

    // 腾讯云API需要复杂的签名算法
    // 这里简化处理，实际使用需要完整的签名实现
    throw new Error('腾讯翻译API签名实现较复杂，建议使用其他服务');
  }

  // DeepL API
  private async translateWithDeepL(text: string): Promise<TranslationResult> {
    const { apiKey, apiEndpoint } = this.settings;
    if (!apiKey) {
      throw new Error('请配置DeepL的API Key');
    }

    const endpoint = apiEndpoint || 'https://api-free.deepl.com/v2/translate';

    // DeepL使用不同的语言代码
    const langMap: Record<string, string> = {
      'zh': 'ZH',
      'en': 'EN',
      'ja': 'JA',
      'ko': 'KO',
      'auto': 'auto'
    };

    const targetLang = langMap[this.settings.targetLanguage] || this.settings.targetLanguage;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: [text],
        target_lang: targetLang
      })
    });

    if (!response.ok) {
      throw new Error(`DeepL请求失败: ${response.status}`);
    }

    const data = await response.json();

    return {
      originalText: text,
      translatedText: data.translations?.[0]?.text || '',
      sourceLang: data.translations?.[0]?.detected_source_language || 'auto',
      targetLang: this.settings.targetLanguage
    };
  }

  // OpenAI API
  private async translateWithOpenAI(text: string): Promise<TranslationResult> {
    const { apiKey, apiEndpoint } = this.settings;
    if (!apiKey) {
      throw new Error('请配置OpenAI的API Key');
    }

    const endpoint = apiEndpoint || 'https://api.openai.com/v1/chat/completions';

    const langMap: Record<string, string> = {
      'zh': 'Chinese',
      'en': 'English',
      'ja': 'Japanese',
      'ko': 'Korean'
    };

    const targetLang = langMap[this.settings.targetLanguage] || this.settings.targetLanguage;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator. Translate the given text to the target language accurately.'
          },
          {
            role: 'user',
            content: `Translate to ${targetLang}: ${text}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI请求失败: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`OpenAI错误: ${data.error.message}`);
    }

    return {
      originalText: text,
      translatedText: data.choices?.[0]?.message?.content || '',
      sourceLang: 'auto',
      targetLang: this.settings.targetLanguage
    };
  }

  // 检测文本语言
  detectLanguage(text: string): string {
    // 简单的中文检测
    const chineseRegex = /[\u4e00-\u9fa5]/;
    return chineseRegex.test(text) ? 'zh' : 'en';
  }

  // 智能翻译（自动检测语言并翻译）
  async smartTranslate(text: string): Promise<TranslationResult> {
    if (this.settings.enableAutoDetect) {
      const detectedLang = this.detectLanguage(text);

      // 如果是中文，翻译成英文；如果是英文，翻译成中文
      const targetLang = detectedLang === 'zh' ? 'en' : 'zh';

      // 临时修改目标语言
      const originalTarget = this.settings.targetLanguage;
      this.settings.targetLanguage = targetLang as any;

      try {
        return await this.translate(text);
      } finally {
        // 恢复原始设置
        this.settings.targetLanguage = originalTarget;
      }
    }

    return await this.translate(text);
  }
}

// 导出单例
export const translationService = new TranslationService();
