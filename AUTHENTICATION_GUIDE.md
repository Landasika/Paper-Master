# Paper-Master - Authentication Guide

## Overview

Paper-Master supports multiple authentication methods for flexibility and security.

## Authentication Methods

### 1. Username + Password Authentication

The recommended method for most users.

**How it works:**
1. User enters their credentials
2. Application creates an API key automatically
3. API key is stored locally
4. Future sync operations use the stored API key

**Steps:**
1. Open **Edit** → **Sync Settings**
2. Select **Username + Password Authentication**
3. Enter your username and password
4. Click **Login and Create API Key**
5. Wait for successful authentication

**Permissions Granted:**
```json
{
  "user": {
    "library": true,    // Library access
    "notes": true,      // Note permissions
    "write": true,      // Write permissions
    "files": true       // File access
  },
  "groups": {
    "all": {
      "library": true,  // Group library access
      "write": true     // Group library write
    }
  }
}
```

### 2. API Key Authentication

For advanced users who prefer manual API key management.

**Steps:**
1. Generate an API key from your service provider
2. Open **Edit** → **Sync Settings**
3. Select **API Key Authentication**
4. Paste your API key
5. Click **Save**

### 3. Custom Server Authentication

For users who host their own reference management server.

**Steps:**
1. Open **Edit** → **Sync Settings**
2. Select **Custom Server**
3. Enter your server URL
4. Click **Test Connection**
5. If successful, click **Sync Now**

## Security Features

### Local Storage
- All credentials are stored locally in your browser
- No data is sent to third-party services
- Credentials are encrypted in storage

### API Key Management
- Automatic API key creation and renewal
- API key permissions are clearly defined
- Revocation support

## Troubleshooting

### Authentication Failed

**Possible causes:**
1. Incorrect username or password
2. Server connectivity issues
3. Insufficient permissions

**Solutions:**
1. Verify your credentials
2. Check your internet connection
3. Try the API key authentication method

### Sync Errors

**Possible causes:**
1. API key expired
2. Server unavailable
3. Network issues

**Solutions:**
1. Re-authenticate to get a new API key
2. Check server status
3. Verify network connectivity

## Best Practices

1. **Use strong passwords** - Combine letters, numbers, and symbols
2. **Enable two-factor authentication** - If available
3. **Regular backups** - Export your data regularly
4. **Keep API keys secure** - Don't share them
5. **Monitor access** - Check your connected devices

## Advanced Configuration

### Custom Server Setup

If you're using a custom server, you may need to configure:

1. **Server URL**: Your server address
2. **API Version**: API version compatibility
3. **Timeout Settings**: Request timeout duration
4. **Retry Logic**: Failed request handling

### Multiple Accounts

Paper-Master supports switching between different accounts:

1. **Logout**: Current session
2. **Login**: Different account
3. **Data Management**: Each account has separate storage

## Development

### Authentication Service

```typescript
// src/core/auth/ZoteroAuthService.ts
class ZoteroAuthService {
  // Username + password authentication
  async authenticateWithPassword(credentials: AuthCredentials): Promise<APIKeyInfo>

  // Create login session
  async createLoginSession(username?: string): Promise<LoginSession>

  // Sync with API Key
  async syncWithAPIKey(): Promise<void>

  // Validate API Key
  async getKeyInfo(): Promise<APIKeyInfo | null>
}
```

### API Endpoints

```typescript
// Authentication endpoint
POST https://api.zotero.org/keys

// Request body
{
  "username": "your_username",
  "password": "your_password",
  "name": "Paper-Master",
  "access": {
    "user": {
      "library": true,
      "notes": true,
      "write": true,
      "files": true
    },
    "groups": {
      "all": {
        "library": true,
        "write": true
      }
    }
  }
}

// Response
{
  "key": "abc123...",
  "userID": "123456",
  "username": "your_username",
  "access": { ... }
}
```

## Server API Requirements

For custom server implementations, provide these endpoints:

```
GET    /api/health          # Health check
GET    /api/items          # Get items list
POST   /api/items          # Create item
PUT    /api/items/:id      # Update item
DELETE /api/items/:id      # Delete item
GET    /api/collections    # Get collections
POST   /api/collections    # Create collection
GET    /api/tags           # Get tags
```

## Support

For issues or questions:
- Check the [README.md](README.md)
- Review [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)
- Open an issue on GitHub

---

**Last Updated**: 2026-03-29
**Version**: v1.0.0
