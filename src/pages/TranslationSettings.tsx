import React, { useState } from 'react';
import { useTranslationSettings } from '../hooks/useTranslationSettings';
import type { TranslationSettings } from '../config/translation';
import {
  serviceDisplayNames,
  servicePresets,
  serviceRequiredFields,
  languageNames
} from '../config/translation';
import type { TranslationService } from '../config/translation';
import './TranslationSettings.css';

interface TranslationSettingsProps {
  onClose: () => void;
}

export const TranslationSettingsPage: React.FC<TranslationSettingsProps> = ({
  onClose
}) => {
  const { settings, saveSettings, loading } = useTranslationSettings();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [tempSettings, setTempSettings] = useState<TranslationSettings>(settings);

  // 如果正在加载，显示loading
  if (loading) {
    return (
      <div className="translation-settings-loading">
        <div className="spinner"></div>
        <p>加载设置中...</p>
      </div>
    );
  }

  // 服务选择变化时更新配置
  const handleServiceChange = (service: TranslationService) => {
    const preset = servicePresets[service];
    setTempSettings({
      ...tempSettings,
      service,
      ...(preset || {})
    });
    setTestResult(null);
  };

  // 更新配置项
  const handleFieldChange = (field: keyof TranslationSettings, value: any) => {
    setTempSettings({
      ...tempSettings,
      [field]: value
    });
    setTestResult(null);
  };

  // 测试API连接
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      // 简单测试：发送一个翻译请求
      const testText = 'Hello';
      let success = false;
      let message = '';

      switch (tempSettings.service) {
        case 'libretranslate':
          try {
            const response = await fetch(tempSettings.apiEndpoint!, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                q: testText,
                source: 'auto',
                target: tempSettings.targetLanguage,
                format: 'text'
              })
            });
            if (response.ok) {
              const data = await response.json();
              success = !!data.translatedText;
              message = success ? `测试成功！翻译结果: ${data.translatedText}` : '翻译失败';
            } else {
              message = `连接失败: ${response.status}`;
            }
          } catch (e) {
            message = `连接错误: ${(e as Error).message}`;
          }
          break;

        case 'mymemory':
          try {
            const langPair = `aut|${tempSettings.targetLanguage}`;
            const url = `${tempSettings.apiEndpoint}?q=${encodeURIComponent(testText)}&langpair=${langPair}`;
            const response = await fetch(url);
            const data = await response.json();
            success = data.responseStatus === 200;
            message = success ? `测试成功！翻译结果: ${data.responseData.translatedText}` : data.responseDetails || '翻译失败';
          } catch (e) {
            message = `连接错误: ${(e as Error).message}`;
          }
          break;

        default:
          message = '请在配置API密钥后测试连接';
          success = false;
      }

      setTestResult({ success, message });
    } catch (e) {
      setTestResult({ success: false, message: `测试失败: ${(e as Error).message}` });
    } finally {
      setTesting(false);
    }
  };

  // 保存设置
  const handleSave = () => {
    const requiredFields = serviceRequiredFields[tempSettings.service];
    for (const field of requiredFields) {
      if (!tempSettings[field as keyof TranslationSettings]) {
        alert(`请填写 ${field} 字段`);
        return;
      }
    }

    saveSettings(tempSettings);
    onClose();
  };

  return (
    <div className="translation-settings">
      <div className="translation-settings-section">
        <h3>翻译服务</h3>
        <div className="service-selector">
          {Object.entries(serviceDisplayNames).map(([key, name]) => (
            <label
              key={key}
              className={`service-option ${tempSettings.service === key ? 'active' : ''}`}
            >
              <input
                type="radio"
                name="service"
                value={key}
                checked={tempSettings.service === key}
                onChange={(e) => handleServiceChange(e.target.value as TranslationService)}
              />
              <span className="service-name">{name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="translation-settings-section">
        <h3>API配置</h3>

        {/* API Endpoint */}
        <div className="form-field">
          <label>API Endpoint</label>
          <input
            type="text"
            value={tempSettings.apiEndpoint || ''}
            onChange={(e) => handleFieldChange('apiEndpoint', e.target.value)}
            placeholder="https://api.example.com/translate"
          />
        </div>

        {/* API Key */}
        {(serviceRequiredFields[tempSettings.service].includes('apiKey') ||
         tempSettings.service === 'custom') && (
          <div className="form-field">
            <label>API Key</label>
            <input
              type="password"
              value={tempSettings.apiKey || ''}
              onChange={(e) => handleFieldChange('apiKey', e.target.value)}
              placeholder="输入API密钥"
            />
          </div>
        )}

        {/* App ID (百度) */}
        {serviceRequiredFields[tempSettings.service].includes('appID') && (
          <div className="form-field">
            <label>App ID</label>
            <input
              type="text"
              value={tempSettings.appID || ''}
              onChange={(e) => handleFieldChange('appID', e.target.value)}
              placeholder="输入百度翻译App ID"
            />
          </div>
        )}

        {/* Secret Key (腾讯) */}
        {serviceRequiredFields[tempSettings.service].includes('secretKey') && (
          <div className="form-field">
            <label>Secret Key</label>
            <input
              type="password"
              value={tempSettings.secretKey || ''}
              onChange={(e) => handleFieldChange('secretKey', e.target.value)}
              placeholder="输入腾讯翻译Secret Key"
            />
          </div>
        )}

        {/* Test Connection */}
        {tempSettings.service !== 'libretranslate' && tempSettings.service !== 'mymemory' && (
          <button
            className="test-button"
            onClick={handleTestConnection}
            disabled={testing}
          >
            {testing ? '测试中...' : '测试连接'}
          </button>
        )}

        {/* Test Result */}
        {testResult && (
          <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
            {testResult.message}
          </div>
        )}
      </div>

      <div className="translation-settings-section">
        <h3>语言设置</h3>
        <div className="form-field">
          <label>目标语言</label>
          <select
            value={tempSettings.targetLanguage}
            onChange={(e) => handleFieldChange('targetLanguage', e.target.value)}
          >
            {Object.entries(languageNames).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={tempSettings.enableAutoDetect}
            onChange={(e) => handleFieldChange('enableAutoDetect', e.target.checked)}
          />
          <span>自动检测源语言</span>
        </label>
      </div>

      <div className="translation-settings-section">
        <h3>行为设置</h3>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={tempSettings.enableFallback}
            onChange={(e) => handleFieldChange('enableFallback', e.target.checked)}
          />
          <span>启用备用API（主API失败时自动切换）</span>
        </label>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={tempSettings.showOnSelect}
            onChange={(e) => handleFieldChange('showOnSelect', e.target.checked)}
          />
          <span>选中文本时自动显示翻译</span>
        </label>
      </div>

      <div className="translation-settings-actions">
        <button className="btn-secondary" onClick={onClose}>
          取消
        </button>
        <button className="btn-primary" onClick={handleSave}>
          保存设置
        </button>
      </div>
    </div>
  );
};
