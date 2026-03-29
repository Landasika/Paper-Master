/**
 * WebDAV Settings Component
 * For configuring WebDAV file synchronization
 */

import React, { useState, useEffect } from 'react';
import './WebDAVSettings.css';
import { WebDAVClient } from '../core/webdav/WebDAVClient';

export interface WebDAVConfig {
  url: string;
  username: string;
  password: string;
  path?: string;
  verified: boolean;
}

interface WebDAVSettingsProps {
  onConfigChange?: (config: WebDAVConfig) => void;
}

export const WebDAVSettings: React.FC<WebDAVSettingsProps> = ({
  onConfigChange
}) => {
  const [config, setConfig] = useState<WebDAVConfig>({
    url: '',
    username: '',
    password: '',
    path: '',
    verified: false
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [fileList, setFileList] = useState<any[]>([]);

  // 加载已保存的WebDAV配置
  useEffect(() => {
    const saved = localStorage.getItem('zotero_webdav_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
      } catch (error) {
        console.error('Failed to load WebDAV config:', error);
      }
    }
  }, []);

  // 测试WebDAV连接
  const testConnection = async () => {
    if (!config.url.trim() || !config.username.trim() || !config.password.trim()) {
      setMessage('❌ 请填写完整的WebDAV服务器信息');
      setStatus('error');
      return;
    }

    setLoading(true);
    setStatus('testing');
    setMessage('🔍 正在测试WebDAV连接...');

    try {
      // 将WebDAV URL转换为代理URL
      let proxyUrl = config.url;

      // 如果是外部WebDAV服务器，使用代理
      if (config.url.includes('106.54.52.227:8085')) {
        const url = new URL(config.url);
        const pathname = url.pathname + url.search;
        proxyUrl = `/webdav-proxy${pathname}`;
        console.log('使用代理URL:', proxyUrl, '原始URL:', config.url);
      }

      const client = new WebDAVClient({
        url: proxyUrl,
        username: config.username,
        password: config.password,
        path: config.path
      });

      const connected = await client.testConnection();

      if (connected) {
        const newConfig = { ...config, verified: true, proxyUrl };
        setConfig(newConfig);
        localStorage.setItem('zotero_webdav_config', JSON.stringify(newConfig));

        setStatus('success');
        setMessage('✅ WebDAV连接成功！服务器可以正常访问');

        // 列出文件
        await listFiles();
      } else {
        setStatus('error');
        setMessage('❌ WebDAV连接失败，请检查服务器地址和认证信息');
      }
    } catch (error) {
      setStatus('error');
      setMessage(`❌ 连接失败: ${error instanceof Error ? error.message : '未知错误'}`);
      console.error('WebDAV connection test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // 列出WebDAV文件
  const listFiles = async () => {
    if (!config.verified) {
      setMessage('⚠️ 请先测试WebDAV连接');
      return;
    }

    setLoading(true);
    setMessage('📂 正在获取文件列表...');

    try {
      // 使用保存的代理URL
      const client = new WebDAVClient({
        url: (config as any).proxyUrl || config.url,
        username: config.username,
        password: config.password,
        path: config.path
      });

      const files = await client.listFiles(config.path);

      setFileList(files);
      setStatus('success');
      setMessage(`✅ 成功获取 ${files.length} 个文件`);

      if (onConfigChange) {
        onConfigChange(config);
      }
    } catch (error) {
      setStatus('error');
      setMessage(`❌ 获取文件列表失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  // 上传测试文件
  const uploadTestFile = async () => {
    if (!config.verified) {
      setMessage('⚠️ 请先测试WebDAV连接');
      return;
    }

    setLoading(true);
    setMessage('📤 正在上传测试文件...');

    try {
      // 使用保存的代理URL
      const client = new WebDAVClient({
        url: (config as any).proxyUrl || config.url,
        username: config.username,
        password: config.password,
        path: config.path
      });

      // 创建测试文件
      const testData = new TextEncoder().encode('Paper-Master WebDAV Test\nTime: ' + new Date().toISOString());
      const fileName = `test_${Date.now()}.txt`;

      const result = await client.uploadFile(fileName, testData.buffer, config.path);

      if (result.success) {
        setStatus('success');
        setMessage(`✅ 测试文件上传成功: ${fileName}`);

        // 重新列出文件
        await listFiles();
      } else {
        setStatus('error');
        setMessage(`❌ 上传失败: ${result.error}`);
      }
    } catch (error) {
      setStatus('error');
      setMessage(`❌ 上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearConfig = () => {
    localStorage.removeItem('zotero_webdav_config');
    setConfig({
      url: '',
      username: '',
      password: '',
      path: '',
      verified: false
    });
    setFileList([]);
    setStatus('idle');
    setMessage('✅ 已清除WebDAV配置');
  };

  return (
    <div className="webdav-settings">
      <div className="webdav-header">
        <h2>☁️ WebDAV 文件同步设置</h2>
        <p className="webdav-subtitle">配置Zotero附件文件的WebDAV同步</p>
      </div>

      <div className="webdav-content">
        {/* WebDAV服务器配置 */}
        <div className="webdav-section">
          <h3>服务器配置</h3>
          <div className="webdav-form">
            <div className="form-item">
              <label htmlFor="webdav-url">WebDAV服务器URL:</label>
              <input
                id="webdav-url"
                type="text"
                className="form-input"
                placeholder="例如: http://106.54.52.227:8085/remote.php/dav/files/Landasika"
                value={config.url || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, url: e.target.value }))}
                disabled={loading}
              />
            </div>

            <div className="form-item">
              <label htmlFor="webdav-username">用户名:</label>
              <input
                id="webdav-username"
                type="text"
                className="form-input"
                placeholder="WebDAV服务器用户名"
                value={config.username || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
                disabled={loading}
              />
            </div>

            <div className="form-item">
              <label htmlFor="webdav-password">密码:</label>
              <input
                id="webdav-password"
                type="password"
                className="form-input"
                placeholder="WebDAV服务器密码"
                value={config.password || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                disabled={loading}
              />
            </div>

            <div className="form-item">
              <label htmlFor="webdav-path">WebDAV路径 (可选):</label>
              <input
                id="webdav-path"
                type="text"
                className="form-input"
                placeholder="Zotero文件存储路径，例如: /Zotero"
                value={config.path || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, path: e.target.value }))}
                disabled={loading}
              />
            </div>

            <div className="form-actions">
              <button
                className="btn-primary"
                onClick={testConnection}
                disabled={loading || !config.url || !config.username || !config.password}
              >
                {loading ? '测试中...' : '🔍 测试连接'}
              </button>

              {config.verified && (
                <>
                  <button
                    className="btn-secondary"
                    onClick={listFiles}
                    disabled={loading}
                  >
                    📂 列出文件
                  </button>

                  <button
                    className="btn-secondary"
                    onClick={uploadTestFile}
                    disabled={loading}
                  >
                    📤 上传测试文件
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 认证状态显示 */}
        {config.verified && (
          <div className="webdav-status success">
            <h3>✅ WebDAV已连接</h3>
            <div className="status-info">
              <div className="info-item">
                <span className="info-label">服务器:</span>
                <span className="info-value">{config.url}</span>
              </div>
              <div className="info-item">
                <span className="info-label">用户:</span>
                <span className="info-value">{config.username}</span>
              </div>
              <div className="info-item">
                <span className="info-label">路径:</span>
                <span className="info-value">{config.path || '/'}</span>
              </div>
            </div>
          </div>
        )}

        {/* 文件列表 */}
        {fileList.length > 0 && (
          <div className="webdav-section">
            <h3>📂 WebDAV文件列表 ({fileList.length} 个文件)</h3>
            <div className="file-list">
              {fileList.map((file, index) => (
                <div key={index} className="file-item">
                  <div className="file-name">
                    {file.href.split('/').pop()}
                  </div>
                  <div className="file-info">
                    {file.contentLength && `大小: ${formatFileSize(file.contentLength)}`}
                    {file.lastModified && ` • 修改: ${formatDate(file.lastModified)}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 使用说明 */}
        <div className="webdav-section">
          <h3>📖 使用说明</h3>
          <div className="webdav-help">
            <p>💡 <strong>什么是WebDAV？</strong></p>
            <p>WebDAV是一种文件共享协议，用于同步Zotero的附件文件（PDF、图片等）</p>

            <p>💡 <strong>支持的WebDAV服务器：</strong></p>
            <ul>
              <li>Nextcloud</li>
              <li>ownCloud</li>
              <li>其他支持WebDAV的云存储服务</li>
            </ul>

            <p>💡 <strong>配置步骤：</strong></p>
            <ol>
              <li>输入WebDAV服务器URL（如Nextcloud的WebDAV地址）</li>
              <li>输入用户名和密码</li>
              <li>（可选）设置Zotero文件存储路径</li>
              <li>点击"测试连接"验证配置</li>
              <li>点击"列出文件"查看现有文件</li>
              <li>点击"上传测试文件"测试上传功能</li>
            </ol>

            <p>💡 <strong>WebDAV URL示例：</strong></p>
            <ul>
              <li>Nextcloud: <code>https://your-nextcloud.com/remote.php/dav/files/username</code></li>
              <li>ownCloud: <code>https://your-owncloud.com/remote.php/webdav/home/username</code></li>
            </ul>
          </div>
        </div>

        {/* 状态消息 */}
        {message && (
          <div className={`status-message ${status}`}>
            {message}
          </div>
        )}

        {/* 清除配置按钮 */}
        {(config.url || config.username) && (
          <div className="webdav-section">
            <button
              className="btn-danger"
              onClick={handleClearConfig}
              disabled={loading}
            >
              🔌 清除WebDAV配置
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// 辅助函数：格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

// 辅助函数：格式化日期
function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleString('zh-CN');
  } catch {
    return dateString;
  }
}

export default WebDAVSettings;
