/**
 * Sync Settings Component
 * Authentication and synchronization configuration
 */

import React, { useState, useEffect } from 'react';
import './SyncSettings.css';

export interface SyncConfig {
  authMethod: 'password' | 'apikey'; // 认证方式
  username: string;
  password: string;
  apiKey: string;
  userID?: string;
  lastSync?: Date;
  autoSync: boolean;
}

interface SyncSettingsProps {
  onConfigChange?: (config: SyncConfig) => void;
  onSync?: () => void;
}

export const SyncSettings: React.FC<SyncSettingsProps> = ({
  onConfigChange,
  onSync
}) => {
  const [config, setConfig] = useState<SyncConfig>({
    authMethod: 'password',
    username: '',
    password: '',
    apiKey: '',
    autoSync: true
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [keyInfo, setKeyInfo] = useState<any>(null);

  // Zoter认证API调用
  const authenticateWithPassword = async () => {
    if (!config.username.trim() || !config.password.trim()) {
      setMessage('请输入Zotero用户名和密码');
      setStatus('error');
      return;
    }

    setLoading(true);
    setStatus('loading');
    setMessage('正在认证...');

    try {
      const response = await fetch('https://api.zotero.org/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Zotero-API-Version': '3'
        },
        body: JSON.stringify({
          username: config.username,
          password: config.password,
          name: "Paper-Master",
          access: {
            user: {
              library: true,
              notes: true,
              write: true,
              files: true
            },
            groups: {
              all: {
                library: true,
                write: true
              }
            }
          }
        })
      });

      if (response.status === 403) {
        throw new Error('用户名或密码错误');
      }

      if (!response.ok) {
        throw new Error(`认证失败: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.key || !data.userID) {
        throw new Error('认证响应无效');
      }

      // 保存认证信息
      const newConfig = {
        ...config,
        apiKey: data.key,
        userID: data.userID,
        lastSync: new Date()
      };

      setConfig(newConfig);
      localStorage.setItem('zotero_auth', JSON.stringify(newConfig));

      setKeyInfo(data);
      setStatus('success');
      setMessage(`✅ 认证成功！用户: ${data.username}`);

      if (onConfigChange) {
        onConfigChange(newConfig);
      }

    } catch (error) {
      setStatus('error');
      setMessage(`❌ 认证失败: ${error instanceof Error ? error.message : '未知错误'}`);
      console.error('Authentication failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateApiKey = async () => {
    if (!config.apiKey.trim()) {
      setMessage('请输入API Key');
      setStatus('error');
      return;
    }

    setLoading(true);
    setStatus('loading');
    setMessage('正在验证API Key...');

    try {
      const response = await fetch(`https://api.zotero.org/keys/${config.apiKey}`, {
        headers: {
          'Zotero-API-Version': '3'
        }
      });

      if (response.status === 403) {
        throw new Error('API Key无效或已过期');
      }

      if (!response.ok) {
        throw new Error(`验证失败: ${response.statusText}`);
      }

      const data = await response.json();
      setKeyInfo(data);
      setStatus('success');
      setMessage(`✅ API Key验证成功！用户: ${data.username || data.key?.substring(0, 8)}`);

      const newConfig = {
        ...config,
        apiKey: config.apiKey,
        userID: data.userID
      };

      setConfig(newConfig);
      localStorage.setItem('zotero_auth', JSON.stringify(newConfig));

      if (onConfigChange) {
        onConfigChange(newConfig);
      }

    } catch (error) {
      setStatus('error');
      setMessage(`❌ 验证失败: ${error instanceof Error ? error.message : '未知错误'}`);
      console.error('API Key validation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = () => {
    if ((config.authMethod === 'password' && (!config.username || !config.password)) ||
        (config.authMethod === 'apikey' && !config.apiKey)) {
      setMessage('请先完成认证配置');
      setStatus('error');
      return;
    }

    if (onSync) {
      onSync();
    }
    setMessage('🔄 开始同步...');
    setStatus('loading');
  };

  const handleLogout = () => {
    localStorage.removeItem('zotero_auth');
    setConfig({
      authMethod: 'password',
      username: '',
      password: '',
      apiKey: '',
      autoSync: true
    });
    setKeyInfo(null);
    setStatus('idle');
    setMessage('✅ 已退出登录');
  };

  // 加载已保存的认证信息
  useEffect(() => {
    const saved = localStorage.getItem('zotero_auth');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
        if (parsed.apiKey) {
          setKeyInfo({ username: parsed.username });
        }
      } catch (error) {
        console.error('Failed to load auth config:', error);
      }
    }
  }, []);

  return (
    <div className="sync-settings">
      <div className="sync-header">
        <h2>🔄 Zotero 同步设置</h2>
        <p className="sync-subtitle">Zotero客户端认证与同步</p>
      </div>

      <div className="sync-content">
        {/* 认证方式选择 */}
        <div className="sync-section">
          <h3>认证方式</h3>
          <div className="auth-method-selector">
            <label className="radio-option">
              <input
                type="radio"
                name="authMethod"
                checked={config.authMethod === 'password'}
                onChange={() => setConfig(prev => ({ ...prev, authMethod: 'password' }))}
              />
              <div className="radio-content">
                <strong>🔐 用户名+密码认证</strong>
                <p>使用Zotero账号密码进行认证</p>
              </div>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="authMethod"
                checked={config.authMethod === 'apikey'}
                onChange={() => setConfig(prev => ({ ...prev, authMethod: 'apikey' }))}
              />
              <div className="radio-content">
                <strong>🔑 API Key认证</strong>
                <p>直接使用已有的API Key</p>
              </div>
            </label>
          </div>
        </div>

        {config.authMethod === 'password' ? (
          /* 密码认证 */
          <div className="sync-section">
            <h3>Zotero账号认证</h3>
            <div className="auth-form">
              <div className="form-item">
                <label htmlFor="username">Zotero用户名:</label>
                <input
                  id="username"
                  type="text"
                  className="form-input"
                  placeholder="输入Zotero用户名或邮箱"
                  value={config.username || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
                  disabled={loading}
                />
              </div>

              <div className="form-item">
                <label htmlFor="password">密码:</label>
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  placeholder="输入Zotero密码"
                  value={config.password || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                  disabled={loading}
                />
              </div>

              <div className="form-actions">
                <button
                  className="btn-primary"
                  onClick={authenticateWithPassword}
                  disabled={loading || !config.username || !config.password}
                >
                  {loading ? '认证中...' : '🔐 登录并创建API Key'}
                </button>
              </div>

              <div className="auth-help">
                <p>💡 说明:</p>
                <ul>
                  <li>这是Zotero客户端的主要认证方式</li>
                  <li>使用Zotero账号的用户名和密码</li>
                  <li>首次登录会自动创建API Key</li>
                  <li>之后的同步会使用保存的API Key</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          /* API Key认证 */
          <div className="sync-section">
            <h3>API Key 认证</h3>
            <div className="auth-form">
              <div className="form-item">
                <label htmlFor="apikey-input">Zotero API Key:</label>
                <input
                  id="apikey-input"
                  type="text"
                  className="form-input"
                  placeholder="输入已有的API Key"
                  value={config.apiKey || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                  disabled={loading}
                />
              </div>

              <div className="form-actions">
                <button
                  className="btn-primary"
                  onClick={validateApiKey}
                  disabled={loading || !config.apiKey}
                >
                  {loading ? '验证中...' : '✓ 验证API Key'}
                </button>
              </div>

              <div className="auth-help">
                <p>💡 如何获取API Key:</p>
                <ol>
                  <li>登录 <a href="https://www.zotero.org" target="_blank" rel="noopener">Zotero.org</a></li>
                  <li>进入 Settings → Keys</li>
                  <li>创建新的API Key</li>
                  <li>复制并粘贴到上方输入框</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* 认证状态显示 */}
        {keyInfo && (
          <div className="auth-status">
            <h3>认证信息</h3>
            <div className="status-info">
              <div className="info-item">
                <span className="info-label">用户:</span>
                <span className="info-value">{keyInfo.username}</span>
              </div>
              <div className="info-item">
                <span className="info-label">用户ID:</span>
                <span className="info-value">{keyInfo.userID}</span>
              </div>
              <div className="info-item">
                <span className="info-label">API Key:</span>
                <span className="info-value">{keyInfo.key?.substring(0, 8)}***</span>
              </div>
              <div className="info-item">
                <span className="info-label">权限:</span>
                <span className="info-value">
                  ✅ 库访问 • ✅ 笔记 • ✅ 写入 • ✅ 文件
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 同步选项 */}
        <div className="sync-section">
          <h3>同步选项</h3>
          <div className="sync-options">
            <label className="option-item">
              <input
                type="checkbox"
                checked={config.autoSync}
                onChange={(e) => {
                  const newConfig = { ...config, autoSync: e.target.checked };
                  setConfig(newConfig);
                  localStorage.setItem('zotero_auth', JSON.stringify(newConfig));
                }}
              />
              <span>自动同步</span>
            </label>
          </div>
        </div>

        {/* 同步操作 */}
        <div className="sync-section">
          <h3>同步操作</h3>
          <div className="sync-actions">
            <button
              className="btn-sync"
              onClick={handleSync}
              disabled={loading}
            >
              🔄 立即同步
            </button>

            {(config.apiKey || config.username) && (
              <button
                className="btn-logout"
                onClick={handleLogout}
                disabled={loading}
              >
                🔌 退出登录
              </button>
            )}
          </div>

          {config.lastSync && (
            <div className="last-sync">
              上次同步: {new Date(config.lastSync).toLocaleString('zh-CN')}
            </div>
          )}
        </div>

        {/* 状态消息 */}
        {message && (
          <div className={`status-message ${status}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default SyncSettings;