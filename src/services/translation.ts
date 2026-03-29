// 翻译服务 - 使用免费的翻译API
interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
}

export class TranslationService {
  private targetLang: string = 'zh'; // 默认翻译成中文

  constructor(targetLang: string = 'zh') {
    this.targetLang = targetLang;
  }

  // 使用 LibreTranslate (免费开源翻译API)
  async translate(text: string): Promise<TranslationResult> {
    if (!text || text.trim().length === 0) {
      throw new Error('文本为空');
    }

    try {
      // 方案1: 使用 LibreTranslate 免费 API
      const response = await fetch('https://libretranslate.com/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: 'auto',
          target: this.targetLang,
          format: 'text'
        })
      });

      if (!response.ok) {
        throw new Error(`翻译请求失败: ${response.status}`);
      }

      const data = await response.json();

      return {
        originalText: text,
        translatedText: data.translatedText,
        sourceLang: data.detectedLanguage?.language || 'auto',
        targetLang: this.targetLang
      };
    } catch (error) {
      console.error('翻译失败:', error);
      throw error;
    }
  }

  // 备用方案：使用 MyMemory Translation API (免费，无需key)
  async translateFallback(text: string): Promise<TranslationResult> {
    const langPair = `aut|${this.targetLang}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.responseStatus === 200) {
      return {
        originalText: text,
        translatedText: data.responseData.translatedText,
        sourceLang: 'auto',
        targetLang: this.targetLang
      };
    }

    throw new Error(data.responseDetails || '翻译失败');
  }

  // 检测文本语言
  detectLanguage(text: string): string {
    // 简单的中文检测
    const chineseRegex = /[\u4e00-\u9fa5]/;
    return chineseRegex.test(text) ? 'zh' : 'en';
  }

  // 智能翻译（自动检测语言并翻译）
  async smartTranslate(text: string): Promise<TranslationResult> {
    const detectedLang = this.detectLanguage(text);

    // 如果是中文，翻译成英文；如果是英文，翻译成中文
    const targetLang = detectedLang === 'zh' ? 'en' : 'zh';

    try {
      // 先尝试主要API
      return await this.translateWithTarget(text, targetLang);
    } catch (error) {
      console.warn('主翻译API失败，尝试备用API...');
      try {
        return await this.translateFallbackWithTarget(text, targetLang);
      } catch (fallbackError) {
        console.error('备用翻译API也失败:', fallbackError);
        throw new Error('翻译服务暂时不可用');
      }
    }
  }

  private async translateWithTarget(text: string, targetLang: string): Promise<TranslationResult> {
    const response = await fetch('https://libretranslate.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: 'auto',
        target: targetLang,
        format: 'text'
      })
    });

    if (!response.ok) throw new Error(`翻译请求失败: ${response.status}`);

    const data = await response.json();
    return {
      originalText: text,
      translatedText: data.translatedText,
      sourceLang: data.detectedLanguage?.language || 'auto',
      targetLang: targetLang
    };
  }

  private async translateFallbackWithTarget(text: string, targetLang: string): Promise<TranslationResult> {
    const langPair = `aut|${targetLang}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.responseStatus === 200) {
      return {
        originalText: text,
        translatedText: data.responseData.translatedText,
        sourceLang: 'auto',
        targetLang: targetLang
      };
    }

    throw new Error(data.responseDetails || '翻译失败');
  }
}

// 导出单例
export const translationService = new TranslationService();
