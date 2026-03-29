/**
 * Authentication Service
 * Client authentication system
 */

interface AuthCredentials {
  username: string;
  password: string;
}

interface LoginSession {
  sessionToken: string;
  userID: string;
  username: string;
  apiKey?: string;
}

interface APIKeyInfo {
  key: string;
  userID: string;
  username: string;
  access: {
    user: {
      library: boolean;
      notes: boolean;
      write: boolean;
      files: boolean;
    };
    groups: {
      all: {
        library: boolean;
        write: boolean;
      }
    };
  };
}

export class ZoteroAuthService {
  private baseURL: string = 'https://api.zotero.org';
  private apiKey: string | null = null;
  // private _sessionToken: string | null = null; // Reserved for future session management

  /**
   * 第一步：用户名+密码认证
   * 这是Zotero客户端的主要认证方式
   */
  async authenticateWithPassword(credentials: AuthCredentials): Promise<APIKeyInfo> {
    console.log('[AuthService] 开始密码认证...');

    const response = await fetch(`${this.baseURL}/keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Zotero-API-Version': '3'
      },
      body: JSON.stringify({
        username: credentials.username,
        password: credentials.password,
        name: "Paper-Master", // Client name
        access: {
          user: {
            library: true,    // 库访问权限
            notes: true,     // 笔记权限
            write: true,     // 写入权限
            files: true       // 文件访问权限
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

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('用户名或密码错误');
      }
      throw new Error(`认证失败: ${response.statusText}`);
    }

    const data = await response.json();

    // 验证响应
    if (!data.key) {
      throw new Error('API Key创建失败');
    }

    if (!data.userID) {
      throw new Error('用户ID获取失败');
    }

    // 保存API Key
    this.apiKey = data.key;
    this.saveCredentialsToLocalStorage(data);

    console.log('[AuthService] 认证成功！');
    console.log('[AuthService] 用户:', data.username);
    console.log('[AuthService] UserID:', data.userID);

    return data;
  }

  /**
   * 第二步：创建登录会话
   * 现代Zotero客户端使用的认证方式
   */
  async createLoginSession(username?: string): Promise<LoginSession> {
    console.log('[AuthService] 创建登录会话...');

    const userID = username || await this.getCurrentUserID();

    const body = userID ? JSON.stringify({ userID }) : undefined;

    const response = await fetch(`${this.baseURL}/users/${userID}/keys/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Zotero-API-Version': '3'
      },
      body
    });

    if (!response.ok) {
      throw new Error(`会话创建失败: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.event === 'loginComplete' && data.apiKey) {
      this.apiKey = data.apiKey;
      // this._sessionToken = data.sessionToken; // Reserved for future session management
      this.saveCredentialsToLocalStorage(data);

      console.log('[AuthService] 登录会话创建成功！');
      return data;
    } else if (data.status === 'completed') {
      this.apiKey = data.apiKey;
      // this._sessionToken = data.sessionToken; // Reserved for future session management
      this.saveCredentialsToLocalStorage(data);

      console.log('[AuthService] 登录完成！');
      return data;
    }

    throw new Error('会话创建失败');
  }

  /**
   * 使用API Key进行认证后的同步
   */
  async syncWithAPIKey(): Promise<void> {
    if (!this.apiKey) {
      const saved = this.loadCredentialsFromLocalStorage();
      if (saved && saved.apiKey) {
        this.apiKey = saved.apiKey;
      } else {
        throw new Error('未找到API Key，请先进行认证');
      }
    }

    console.log('[AuthService] 使用API Key同步...');

    // 验证API Key是否有效
    const keyInfo = await this.getKeyInfo();
    if (!keyInfo) {
      throw new Error('API Key无效或已过期');
    }

    console.log('[AuthService] API Key验证成功！');
    // 执行同步...
  }

  /**
   * 验证API Key有效性
   */
  async getKeyInfo(): Promise<APIKeyInfo | null> {
    if (!this.apiKey) return null;

    const response = await fetch(`${this.baseURL}/keys/current`, {
      headers: {
        'Zotero-API-Key': this.apiKey,
        'Zotero-API-Version': '3'
      }
    });

    if (response.status === 403) {
      return null; // API Key无效
    }

    if (!response.ok) {
      throw new Error('API Key验证失败');
    }

    return await response.json();
  }

  /**
   * 获取当前用户ID
   */
  private async getCurrentUserID(): Promise<string> {
    // 这里需要实现获取当前登录用户ID的逻辑
    // 可能需要先调用一些API来获取
    const response = await fetch(`${this.baseURL}/keys/current`, {
      headers: {
        'Zotero-API-Version': '3'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.userID) {
        return data.userID;
      }
    }

    throw new Error('无法获取用户ID');
  }

  /**
   * 保存凭证到本地存储
   */
  private saveCredentialsToLocalStorage(data: any): void {
    localStorage.setItem('zotero_auth', JSON.stringify({
      apiKey: data.key,
      userID: data.userID,
      username: data.username,
      sessionToken: data.sessionToken,
      dateSaved: new Date().toISOString()
    }));
  }

  /**
   * 从本地存储加载凭证
   */
  private loadCredentialsFromLocalStorage(): any {
    try {
      const saved = localStorage.getItem('zotero_auth');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  /**
   * 清除认证信息
   */
  logout(): void {
    this.apiKey = null;
    // this._sessionToken = null; // Reserved for future session management
    localStorage.removeItem('zotero_auth');
    console.log('[AuthService] 已退出登录');
  }

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    return !!this.apiKey;
  }
}

export default ZoteroAuthService;