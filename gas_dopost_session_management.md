# GAS doPost セッション管理 - 実用的な実装ガイド

## 📋 概要

Google Apps Script (GAS) の doPost 関数を使用したWebアプリケーションにおける、安定したセッション管理の実装方法をまとめたガイドです。企業レベルでの実用性を重視した実装例とトラブルシューティングを含みます。

## 🔥 よくある doPost の問題と解決策

### 問題1: HTTP 405 Method Not Allowed エラー

#### 原因
- デプロイ設定が正しくない
- `Execute as` が `Me` になっていない
- `Who has access` が `Only myself` になっている

#### 解決策
```javascript
function doPost(e) {
  // 必ず最初にeオブジェクトの存在確認
  if (!e) {
    console.error('Event object is undefined');
    return ContentService.createTextOutput(JSON.stringify({
      error: 'Invalid request'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // デプロイ設定チェック用のデバッグ情報
  console.log('doPost called successfully');
  console.log('Parameter keys:', Object.keys(e.parameter || {}));
  console.log('PostData available:', !!e.postData);
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    message: 'doPost is working correctly'
  })).setMimeType(ContentService.MimeType.JSON);
}
```

#### 正しいデプロイ設定
1. **スクリプトエディタ** → **デプロイ** → **新しいデプロイ**
2. **種類**: `ウェブアプリ`
3. **Execute as**: `Me (your email)`
4. **Who has access**: `Anyone` (企業内の場合は `Anyone within your organization`)

### 問題2: セッション情報が取得できない

#### 原因と解決策
```javascript
function getSessionInfo() {
  try {
    // 方法1: Session.getActiveUser() (推奨)
    const activeUser = Session.getActiveUser();
    const userEmail = activeUser.getEmail();
    
    if (userEmail) {
      console.log(`✅ セッション取得成功: ${userEmail}`);
      return { success: true, email: userEmail, method: 'Session.getActiveUser' };
    }
    
    // 方法2: Session.getEffectiveUser() (フォールバック)
    const effectiveUser = Session.getEffectiveUser();
    const effectiveEmail = effectiveUser.getEmail();
    
    if (effectiveEmail) {
      console.log(`✅ セッション取得成功(Effective): ${effectiveEmail}`);
      return { success: true, email: effectiveEmail, method: 'Session.getEffectiveUser' };
    }
    
    // 方法3: DriveApp.getStorageUsed() (間接的な認証確認)
    try {
      DriveApp.getStorageUsed(); // 認証が必要な操作
      console.log('🔓 ユーザーは認証済み（メール不明）');
      return { success: true, email: 'authenticated_user', method: 'Drive API check' };
    } catch (driveError) {
      console.log('🔒 ユーザー未認証');
      return { success: false, error: 'User not authenticated' };
    }
    
  } catch (error) {
    console.error(`❌ セッション情報取得エラー: ${error.message}`);
    return { success: false, error: error.message };
  }
}
```

## 🔐 安定したセッション管理システム

### 1. 基本的なセッション管理クラス

```javascript
/**
 * 安定したセッション管理システム
 * PropertiesService + CacheService + LockService の組み合わせ
 */
class RobustSessionManager {
  constructor() {
    this.userProperties = PropertiesService.getUserProperties();
    this.userCache = CacheService.getUserCache();
    this.scriptProperties = PropertiesService.getScriptProperties();
    this.SESSION_TIMEOUT = 30 * 60 * 1000; // 30分
    this.CACHE_TIMEOUT = 3600; // 1時間（秒）
  }
  
  /**
   * セッション作成（ログイン処理）
   */
  createSession(userEmail, additionalData = {}) {
    try {
      const sessionId = Utilities.getUuid();
      const timestamp = new Date().getTime();
      
      const sessionData = {
        sessionId: sessionId,
        userEmail: userEmail,
        createdAt: timestamp,
        lastActivity: timestamp,
        isActive: true,
        ...additionalData
      };
      
      // 1. キャッシュに保存（高速アクセス用）
      this.userCache.put(
        `session_${sessionId}`, 
        JSON.stringify(sessionData), 
        this.CACHE_TIMEOUT
      );
      
      // 2. ユーザープロパティに保存（永続化用）
      this.userProperties.setProperties({
        'current_session_id': sessionId,
        'session_data': JSON.stringify(sessionData),
        'last_activity': timestamp.toString()
      });
      
      // 3. グローバルセッション一覧に追加（管理用）
      this.addToGlobalSessionList(sessionId, userEmail);
      
      console.log(`✅ セッション作成成功: ${userEmail} (${sessionId})`);
      return { success: true, sessionId: sessionId, data: sessionData };
      
    } catch (error) {
      console.error(`❌ セッション作成エラー: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * セッション検証
   */
  validateSession(sessionId = null) {
    try {
      // sessionIdが指定されていない場合、現在のセッションを取得
      if (!sessionId) {
        sessionId = this.userProperties.getProperty('current_session_id');
      }
      
      if (!sessionId) {
        console.log('⚠️ セッションIDが見つかりません');
        return { valid: false, reason: 'no_session_id' };
      }
      
      // 1. キャッシュから取得を試行
      let sessionData = this.userCache.get(`session_${sessionId}`);
      
      if (sessionData) {
        sessionData = JSON.parse(sessionData);
        console.log('📁 キャッシュからセッション取得');
      } else {
        // 2. キャッシュにない場合、ユーザープロパティから取得
        const storedData = this.userProperties.getProperty('session_data');
        if (storedData && this.userProperties.getProperty('current_session_id') === sessionId) {
          sessionData = JSON.parse(storedData);
          console.log('💾 プロパティからセッション取得・キャッシュに復元');
          
          // キャッシュに復元
          this.userCache.put(
            `session_${sessionId}`, 
            JSON.stringify(sessionData), 
            this.CACHE_TIMEOUT
          );
        } else {
          console.log('❌ セッションデータが見つかりません');
          return { valid: false, reason: 'session_not_found' };
        }
      }
      
      // 3. タイムアウトチェック
      const now = new Date().getTime();
      const timeDiff = now - sessionData.lastActivity;
      
      if (timeDiff > this.SESSION_TIMEOUT) {
        console.log(`⏰ セッションタイムアウト: ${timeDiff / 1000 / 60}分経過`);
        this.destroySession(sessionId);
        return { valid: false, reason: 'timeout' };
      }
      
      // 4. アクティビティ更新
      sessionData.lastActivity = now;
      this.updateSessionActivity(sessionId, sessionData);
      
      console.log(`✅ セッション有効: ${sessionData.userEmail}`);
      return { 
        valid: true, 
        data: sessionData,
        userEmail: sessionData.userEmail 
      };
      
    } catch (error) {
      console.error(`❌ セッション検証エラー: ${error.message}`);
      return { valid: false, reason: 'validation_error', error: error.message };
    }
  }
  
  /**
   * セッションアクティビティ更新
   */
  updateSessionActivity(sessionId, sessionData) {
    try {
      const updatedData = JSON.stringify(sessionData);
      
      // キャッシュ更新
      this.userCache.put(`session_${sessionId}`, updatedData, this.CACHE_TIMEOUT);
      
      // プロパティ更新
      this.userProperties.setProperties({
        'session_data': updatedData,
        'last_activity': sessionData.lastActivity.toString()
      });
      
    } catch (error) {
      console.error(`❌ セッションアクティビティ更新エラー: ${error.message}`);
    }
  }
  
  /**
   * セッション削除
   */
  destroySession(sessionId) {
    try {
      // キャッシュから削除
      this.userCache.remove(`session_${sessionId}`);
      
      // ユーザープロパティから削除
      this.userProperties.deleteProperty('current_session_id');
      this.userProperties.deleteProperty('session_data');
      this.userProperties.deleteProperty('last_activity');
      
      // グローバルセッション一覧から削除
      this.removeFromGlobalSessionList(sessionId);
      
      console.log(`🗑️ セッション削除完了: ${sessionId}`);
      return { success: true };
      
    } catch (error) {
      console.error(`❌ セッション削除エラー: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * グローバルセッション管理（管理者用）
   */
  addToGlobalSessionList(sessionId, userEmail) {
    try {
      const globalSessions = JSON.parse(
        this.scriptProperties.getProperty('global_sessions') || '{}'
      );
      
      globalSessions[sessionId] = {
        userEmail: userEmail,
        createdAt: new Date().toISOString(),
        isActive: true
      };
      
      this.scriptProperties.setProperty('global_sessions', JSON.stringify(globalSessions));
    } catch (error) {
      console.error(`❌ グローバルセッション追加エラー: ${error.message}`);
    }
  }
  
  removeFromGlobalSessionList(sessionId) {
    try {
      const globalSessions = JSON.parse(
        this.scriptProperties.getProperty('global_sessions') || '{}'
      );
      
      delete globalSessions[sessionId];
      this.scriptProperties.setProperty('global_sessions', JSON.stringify(globalSessions));
    } catch (error) {
      console.error(`❌ グローバルセッション削除エラー: ${error.message}`);
    }
  }
  
  /**
   * アクティブセッション一覧取得（管理者用）
   */
  getActiveSessions() {
    try {
      const globalSessions = JSON.parse(
        this.scriptProperties.getProperty('global_sessions') || '{}'
      );
      
      return Object.entries(globalSessions).map(([sessionId, data]) => ({
        sessionId: sessionId,
        ...data
      }));
    } catch (error) {
      console.error(`❌ アクティブセッション取得エラー: ${error.message}`);
      return [];
    }
  }
}
```

### 2. 認証フローの実装

```javascript
/**
 * 包括的な認証システム
 */
class AuthenticationSystem {
  constructor() {
    this.sessionManager = new RobustSessionManager();
    this.lockService = LockService.getUserLock();
  }
  
  /**
   * ログイン処理
   */
  login(credentials = {}) {
    try {
      // 1. 基本認証（Google OAuth）
      const googleUser = Session.getActiveUser();
      const userEmail = googleUser.getEmail();
      
      if (!userEmail) {
        console.log('❌ Google認証が必要');
        return { 
          success: false, 
          error: 'Google authentication required',
          redirectTo: 'google_auth'
        };
      }
      
      // 2. 追加認証（企業ユーザーチェック）
      const authCheck = this.validateUserAccess(userEmail, credentials);
      if (!authCheck.valid) {
        console.log(`❌ ユーザーアクセス拒否: ${userEmail}`);
        return { 
          success: false, 
          error: authCheck.reason,
          userEmail: userEmail
        };
      }
      
      // 3. 既存セッションチェック
      const existingSession = this.sessionManager.validateSession();
      if (existingSession.valid) {
        console.log(`♻️ 既存セッション継続: ${userEmail}`);
        return { 
          success: true, 
          sessionId: existingSession.data.sessionId,
          userEmail: userEmail,
          userData: authCheck.userData,
          message: 'Existing session resumed'
        };
      }
      
      // 4. 新規セッション作成
      const sessionResult = this.sessionManager.createSession(userEmail, {
        userData: authCheck.userData,
        loginTime: new Date().toISOString(),
        ipAddress: this.getClientIP(),
        userAgent: this.getUserAgent()
      });
      
      if (sessionResult.success) {
        console.log(`✅ ログイン成功: ${userEmail}`);
        return { 
          success: true, 
          sessionId: sessionResult.sessionId,
          userEmail: userEmail,
          userData: authCheck.userData,
          message: 'Login successful'
        };
      } else {
        throw new Error('Session creation failed');
      }
      
    } catch (error) {
      console.error(`❌ ログインエラー: ${error.message}`);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
  
  /**
   * ユーザーアクセス権限の検証
   */
  validateUserAccess(userEmail, credentials) {
    try {
      // 企業ユーザーマスタとの照合
      const userMasterSheet = SpreadsheetApp.openById(
        PropertiesService.getScriptProperties().getProperty('USER_MASTER_SHEET_ID')
      ).getSheetByName('users');
      
      const users = userMasterSheet.getDataRange().getValues();
      
      // ヘッダー行をスキップして検索
      for (let i = 1; i < users.length; i++) {
        const row = users[i];
        const email = row[0];
        const isActive = row[1];
        const department = row[2];
        const role = row[3];
        const permissions = row[4] ? row[4].split(',') : [];
        
        if (email === userEmail) {
          if (!isActive) {
            return { 
              valid: false, 
              reason: 'User account is disabled' 
            };
          }
          
          console.log(`✅ ユーザー認証成功: ${userEmail} (${department}/${role})`);
          return { 
            valid: true, 
            userData: {
              department: department,
              role: role,
              permissions: permissions,
              isAdmin: permissions.includes('admin')
            }
          };
        }
      }
      
      // ユーザーが見つからない場合
      console.log(`⚠️ 未登録ユーザー: ${userEmail}`);
      return { 
        valid: false, 
        reason: 'User not found in user master' 
      };
      
    } catch (error) {
      console.error(`❌ ユーザー検証エラー: ${error.message}`);
      return { 
        valid: false, 
        reason: `User validation error: ${error.message}` 
      };
    }
  }
  
  /**
   * ログアウト処理
   */
  logout(sessionId = null) {
    try {
      // 現在のセッションまたは指定されたセッションを削除
      const result = this.sessionManager.destroySession(sessionId);
      
      if (result.success) {
        console.log('✅ ログアウト成功');
        return { 
          success: true, 
          message: 'Logout successful' 
        };
      } else {
        throw new Error('Session destruction failed');
      }
      
    } catch (error) {
      console.error(`❌ ログアウトエラー: ${error.message}`);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
  
  /**
   * セッション状態確認
   */
  checkSession(sessionId = null) {
    return this.sessionManager.validateSession(sessionId);
  }
  
  /**
   * ヘルパーメソッド
   */
  getClientIP() {
    // GASでは直接取得できないため、プレースホルダー
    return 'unknown';
  }
  
  getUserAgent() {
    // GASでは直接取得できないため、プレースホルダー
    return 'GAS WebApp';
  }
}
```

### 3. doPost メインハンドラーの実装

```javascript
/**
 * 安定したWebアプリケーションのメインハンドラー
 */
class WebAppHandler {
  constructor() {
    this.auth = new AuthenticationSystem();
    this.lockService = LockService.getUserLock();
  }
  
  /**
   * POST リクエストの処理
   */
  handlePost(e) {
    let lock;
    try {
      // 1. リクエスト前処理
      const preCheck = this.preprocessRequest(e);
      if (!preCheck.success) {
        return this.createResponse(preCheck, preCheck.statusCode || 400);
      }
      
      // 2. 排他制御
      lock = this.lockService.tryLock(10000); // 10秒待機
      if (!lock) {
        return this.createResponse({
          success: false,
          error: 'Request timeout - server is busy'
        }, 503);
      }
      
      // 3. セッション検証
      const sessionCheck = this.validateRequestSession(e);
      if (!sessionCheck.valid) {
        return this.createResponse({
          success: false,
          error: sessionCheck.reason,
          requiresAuth: true
        }, 401);
      }
      
      // 4. アクション処理
      const result = this.processAction(e, sessionCheck.sessionData);
      return this.createResponse(result, result.statusCode || 200);
      
    } catch (error) {
      this.logError(error, e);
      return this.createResponse({
        success: false,
        error: 'Internal server error'
      }, 500);
      
    } finally {
      if (lock) lock.releaseLock();
    }
  }
  
  /**
   * リクエスト前処理
   */
  preprocessRequest(e) {
    try {
      // eオブジェクトの存在確認
      if (!e) {
        return { success: false, error: 'Invalid request object' };
      }
      
      // POSTデータの存在確認
      if (!e.postData || !e.postData.contents) {
        return { success: false, error: 'No POST data' };
      }
      
      // JSONデータの解析
      try {
        const data = JSON.parse(e.postData.contents);
        e.parsedData = data;
      } catch (parseError) {
        return { success: false, error: 'Invalid JSON data' };
      }
      
      // 必須フィールドの確認
      if (!e.parsedData.action) {
        return { success: false, error: 'Missing action parameter' };
      }
      
      console.log(`📨 リクエスト受信: ${e.parsedData.action}`);
      return { success: true };
      
    } catch (error) {
      console.error(`❌ リクエスト前処理エラー: ${error.message}`);
      return { success: false, error: 'Request preprocessing failed' };
    }
  }
  
  /**
   * セッション検証
   */
  validateRequestSession(e) {
    try {
      const data = e.parsedData;
      
      // ログインアクションはセッション不要
      if (data.action === 'login') {
        return { valid: true, skipSession: true };
      }
      
      // セッションIDの取得
      const sessionId = data.sessionId || e.parameter.sessionId;
      
      // セッション検証
      const sessionResult = this.auth.checkSession(sessionId);
      
      if (!sessionResult.valid) {
        console.log(`🔒 セッション無効: ${sessionResult.reason}`);
        return { 
          valid: false, 
          reason: 'Invalid or expired session',
          sessionReason: sessionResult.reason 
        };
      }
      
      console.log(`✅ セッション有効: ${sessionResult.userEmail}`);
      return { 
        valid: true, 
        sessionData: sessionResult.data,
        userEmail: sessionResult.userEmail 
      };
      
    } catch (error) {
      console.error(`❌ セッション検証エラー: ${error.message}`);
      return { 
        valid: false, 
        reason: 'Session validation error' 
      };
    }
  }
  
  /**
   * アクション処理のディスパッチ
   */
  processAction(e, sessionData) {
    const action = e.parsedData.action;
    const data = e.parsedData;
    
    try {
      switch (action) {
        case 'login':
          return this.auth.login(data.credentials);
          
        case 'logout':
          return this.auth.logout(data.sessionId);
          
        case 'check_session':
          return { 
            success: true, 
            sessionValid: true,
            userEmail: sessionData.userEmail,
            userData: sessionData.userData 
          };
          
        case 'search_documents':
          return this.handleDocumentSearch(data, sessionData);
          
        case 'upload_document':
          return this.handleDocumentUpload(data, sessionData);
          
        case 'get_user_stats':
          return this.handleUserStats(data, sessionData);
          
        default:
          return { 
            success: false, 
            error: `Unknown action: ${action}` 
          };
      }
      
    } catch (error) {
      console.error(`❌ アクション処理エラー: ${error.message}`);
      return { 
        success: false, 
        error: `Action processing failed: ${error.message}` 
      };
    }
  }
  
  /**
   * レスポンス作成
   */
  createResponse(data, statusCode = 200) {
    const response = {
      ...data,
      timestamp: new Date().toISOString(),
      statusCode: statusCode
    };
    
    const output = ContentService.createTextOutput(JSON.stringify(response));
    output.setMimeType(ContentService.MimeType.JSON);
    
    // CORS対応（必要に応じて）
    // output.addHeader('Access-Control-Allow-Origin', '*');
    
    return output;
  }
  
  /**
   * エラーログ記録
   */
  logError(error, event) {
    const logData = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      userEmail: Session.getActiveUser().getEmail(),
      requestData: event ? JSON.stringify(event.parameter) : 'N/A',
      postData: event && event.postData ? event.postData.contents : 'N/A'
    };
    
    console.error('🚨 WebApp Error:', JSON.stringify(logData, null, 2));
    
    // 重要なエラーはスプレッドシートに記録
    try {
      const errorSheetId = PropertiesService.getScriptProperties()
        .getProperty('ERROR_LOG_SHEET_ID');
      
      if (errorSheetId) {
        const errorSheet = SpreadsheetApp.openById(errorSheetId).getActiveSheet();
        errorSheet.appendRow([
          logData.timestamp,
          logData.userEmail,
          logData.error,
          logData.stack,
          logData.requestData
        ]);
      }
    } catch (logError) {
      console.error('📊 エラーログ記録失敗:', logError.message);
    }
  }
  
  /**
   * ドキュメント検索処理（例）
   */
  handleDocumentSearch(data, sessionData) {
    try {
      const query = data.query;
      const filters = data.filters || {};
      
      // 権限チェック
      if (!sessionData.userData.permissions.includes('search')) {
        return { 
          success: false, 
          error: 'Search permission required' 
        };
      }
      
      // 検索処理の実装
      console.log(`🔍 検索実行: "${query}" by ${sessionData.userEmail}`);
      
      return { 
        success: true, 
        results: [], // 実際の検索結果
        query: query,
        searchedBy: sessionData.userEmail 
      };
      
    } catch (error) {
      console.error(`❌ 検索処理エラー: ${error.message}`);
      return { 
        success: false, 
        error: 'Search processing failed' 
      };
    }
  }
}

// メインエントリーポイント
function doPost(e) {
  const handler = new WebAppHandler();
  return handler.handlePost(e);
}

function doGet(e) {
  // GET リクエストの場合はログインページを表示
  return HtmlService.createTemplateFromFile('login')
    .evaluate()
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
```

## 🛡️ セキュリティ強化機能

### CSRF対策の実装

```javascript
/**
 * CSRF（Cross-Site Request Forgery）対策
 */
class CSRFProtection {
  constructor() {
    this.userProperties = PropertiesService.getUserProperties();
    this.TOKEN_LIFETIME = 3600000; // 1時間
  }
  
  /**
   * CSRFトークン生成
   */
  generateToken() {
    const token = Utilities.getUuid();
    const expires = new Date().getTime() + this.TOKEN_LIFETIME;
    
    this.userProperties.setProperties({
      'csrf_token': token,
      'csrf_token_expires': expires.toString()
    });
    
    console.log(`🛡️ CSRFトークン生成: ${token.substring(0, 8)}...`);
    return token;
  }
  
  /**
   * CSRFトークン検証
   */
  validateToken(providedToken) {
    try {
      const storedToken = this.userProperties.getProperty('csrf_token');
      const expiresStr = this.userProperties.getProperty('csrf_token_expires');
      
      if (!storedToken || !providedToken) {
        console.log('⚠️ CSRFトークンなし');
        return false;
      }
      
      if (storedToken !== providedToken) {
        console.log('❌ CSRFトークン不一致');
        return false;
      }
      
      const expires = parseInt(expiresStr || '0');
      if (new Date().getTime() > expires) {
        console.log('⏰ CSRFトークン期限切れ');
        this.clearToken();
        return false;
      }
      
      console.log('✅ CSRFトークン検証成功');
      return true;
      
    } catch (error) {
      console.error(`❌ CSRFトークン検証エラー: ${error.message}`);
      return false;
    }
  }
  
  /**
   * トークンクリア
   */
  clearToken() {
    this.userProperties.deleteProperty('csrf_token');
    this.userProperties.deleteProperty('csrf_token_expires');
  }
}
```

### レート制限の実装

```javascript
/**
 * レート制限（Rate Limiting）機能
 */
class RateLimiter {
  constructor() {
    this.userCache = CacheService.getUserCache();
    this.RATE_LIMIT_WINDOW = 3600; // 1時間（秒）
    this.MAX_REQUESTS = 100; // 1時間に100リクエスト
  }
  
  /**
   * レート制限チェック
   */
  checkRateLimit(userEmail) {
    try {
      const key = `rate_limit_${userEmail}`;
      const currentRequests = parseInt(this.userCache.get(key) || '0');
      
      if (currentRequests >= this.MAX_REQUESTS) {
        console.log(`🚫 レート制限超過: ${userEmail} (${currentRequests}/${this.MAX_REQUESTS})`);
        return { 
          allowed: false, 
          remaining: 0,
          resetTime: this.getRateLimitResetTime(key)
        };
      }
      
      // リクエスト数を増加
      const newCount = currentRequests + 1;
      this.userCache.put(key, newCount.toString(), this.RATE_LIMIT_WINDOW);
      
      console.log(`✅ レート制限OK: ${userEmail} (${newCount}/${this.MAX_REQUESTS})`);
      return { 
        allowed: true, 
        remaining: this.MAX_REQUESTS - newCount,
        resetTime: null
      };
      
    } catch (error) {
      console.error(`❌ レート制限チェックエラー: ${error.message}`);
      // エラーの場合は許可（フェイルオープン）
      return { allowed: true, remaining: this.MAX_REQUESTS };
    }
  }
  
  /**
   * レート制限リセット時刻取得
   */
  getRateLimitResetTime(key) {
    // GASのCacheServiceでは正確なTTLは取得できないため、概算
    return new Date(new Date().getTime() + this.RATE_LIMIT_WINDOW * 1000);
  }
}
```

## 🔧 トラブルシューティング

### よくある問題と解決策

#### 1. セッションが消える問題

```javascript
/**
 * セッション復旧機能
 */
function recoverSession() {
  try {
    console.log('🔄 セッション復旧を試行中...');
    
    // 1. Google認証の確認
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) {
      console.log('❌ Google認証が切れています');
      return { success: false, reason: 'google_auth_lost' };
    }
    
    // 2. セッションマネージャーで自動復旧
    const sessionManager = new RobustSessionManager();
    const authSystem = new AuthenticationSystem();
    
    // 3. 新規セッション作成（自動ログイン）
    const loginResult = authSystem.login();
    
    if (loginResult.success) {
      console.log('✅ セッション復旧成功');
      return { 
        success: true, 
        sessionId: loginResult.sessionId,
        message: 'Session recovered successfully'
      };
    } else {
      console.log('❌ セッション復旧失敗');
      return { 
        success: false, 
        reason: 'recovery_failed',
        error: loginResult.error 
      };
    }
    
  } catch (error) {
    console.error(`❌ セッション復旧エラー: ${error.message}`);
    return { 
      success: false, 
      reason: 'recovery_error',
      error: error.message 
    };
  }
}
```

#### 2. デプロイ問題の診断

```javascript
/**
 * デプロイ状態診断機能
 */
function diagnoseDeployment() {
  const diagnosis = {
    timestamp: new Date().toISOString(),
    gas_version: null,
    user_access: null,
    permissions: {},
    errors: []
  };
  
  try {
    // 1. ユーザー情報取得テスト
    try {
      const userEmail = Session.getActiveUser().getEmail();
      diagnosis.user_access = userEmail ? 'OK' : 'No Email';
      diagnosis.user_email = userEmail;
    } catch (error) {
      diagnosis.user_access = 'ERROR';
      diagnosis.errors.push(`User access: ${error.message}`);
    }
    
    // 2. Drive API アクセステスト
    try {
      DriveApp.getStorageUsed();
      diagnosis.permissions.drive = 'OK';
    } catch (error) {
      diagnosis.permissions.drive = 'ERROR';
      diagnosis.errors.push(`Drive access: ${error.message}`);
    }
    
    // 3. スプレッドシートアクセステスト
    try {
      const testSheetId = PropertiesService.getScriptProperties()
        .getProperty('TEST_SHEET_ID');
      if (testSheetId) {
        SpreadsheetApp.openById(testSheetId);
        diagnosis.permissions.sheets = 'OK';
      } else {
        diagnosis.permissions.sheets = 'NO_TEST_SHEET';
      }
    } catch (error) {
      diagnosis.permissions.sheets = 'ERROR';
      diagnosis.errors.push(`Sheets access: ${error.message}`);
    }
    
    // 4. プロパティサービステスト
    try {
      PropertiesService.getUserProperties().getProperty('test');
      diagnosis.permissions.properties = 'OK';
    } catch (error) {
      diagnosis.permissions.properties = 'ERROR';
      diagnosis.errors.push(`Properties access: ${error.message}`);
    }
    
    console.log('🔍 デプロイ診断結果:', JSON.stringify(diagnosis, null, 2));
    return diagnosis;
    
  } catch (error) {
    diagnosis.errors.push(`Diagnosis error: ${error.message}`);
    return diagnosis;
  }
}

// doPost内での診断実行
function doPost(e) {
  // デバッグモードの場合は診断実行
  if (e && e.parameter && e.parameter.debug === 'true') {
    const diagnosis = diagnoseDeployment();
    return ContentService.createTextOutput(JSON.stringify(diagnosis, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // 通常処理
  const handler = new WebAppHandler();
  return handler.handlePost(e);
}
```

## 📊 実装チェックリスト

### ✅ 基本機能
- [ ] doPost関数の正常動作確認
- [ ] セッション作成・検証・削除機能
- [ ] ユーザー認証機能
- [ ] エラーハンドリング

### ✅ セキュリティ
- [ ] CSRF対策
- [ ] レート制限
- [ ] 入力検証
- [ ] セッションタイムアウト

### ✅ 運用機能
- [ ] エラーログ記録
- [ ] セッション復旧機能
- [ ] 診断機能
- [ ] 管理者用セッション一覧

### ✅ パフォーマンス
- [ ] キャッシュ活用
- [ ] 排他制御
- [ ] 適切なタイムアウト設定

この実装ガイドに従うことで、企業レベルで使用できる安定したGAS Webアプリケーションのセッション管理システムを構築できます。