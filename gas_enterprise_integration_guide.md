# GAS企業システム統合ガイド - PLM・ERP・CAD連携とセッション管理

## 📋 概要

Google Apps Script (GAS) を使用して企業システム（PLM・ERP・CAD）と連携するための実装ガイドです。認証・セッション管理から具体的な連携パターンまで、実用レベルの実装方法を解説します。

## 🔐 GASセッション管理・ログイン機能

### 基本的なセッション管理アーキテクチャ

```javascript
// SessionManager.gs - セッション管理クラス
class SessionManager {
  static SESSION_TIMEOUT = 30 * 60 * 1000; // 30分
  
  /**
   * セッション作成
   */
  static createSession(userEmail, userData = {}) {
    const sessionId = Utilities.getUuid();
    const sessionData = {
      id: sessionId,
      email: userEmail,
      userData: userData,
      createdAt: new Date().getTime(),
      lastAccess: new Date().getTime(),
      isActive: true
    };
    
    // PropertiesServiceでセッション保存（暗号化推奨）
    const encryptedData = this.encryptSessionData(sessionData);
    PropertiesService.getScriptProperties()
      .setProperty(`session_${sessionId}`, encryptedData);
    
    console.log(`📱 セッション作成: ${userEmail} (ID: ${sessionId})`);
    return sessionId;
  }
  
  /**
   * セッション検証
   */
  static validateSession(sessionId) {
    if (!sessionId) return null;
    
    const encryptedData = PropertiesService.getScriptProperties()
      .getProperty(`session_${sessionId}`);
    
    if (!encryptedData) {
      console.warn(`⚠️ セッション未発見: ${sessionId}`);
      return null;
    }
    
    try {
      const sessionData = this.decryptSessionData(encryptedData);
      const now = new Date().getTime();
      
      // タイムアウトチェック
      if (now - sessionData.lastAccess > this.SESSION_TIMEOUT) {
        console.warn(`⏰ セッションタイムアウト: ${sessionData.email}`);
        this.destroySession(sessionId);
        return null;
      }
      
      // 最終アクセス時刻更新
      sessionData.lastAccess = now;
      const updatedEncryptedData = this.encryptSessionData(sessionData);
      PropertiesService.getScriptProperties()
        .setProperty(`session_${sessionId}`, updatedEncryptedData);
      
      console.log(`✅ セッション有効: ${sessionData.email}`);
      return sessionData;
    } catch (error) {
      console.error(`❌ セッション検証エラー: ${error.message}`);
      this.destroySession(sessionId);
      return null;
    }
  }
  
  /**
   * セッション削除
   */
  static destroySession(sessionId) {
    PropertiesService.getScriptProperties().deleteProperty(`session_${sessionId}`);
    console.log(`🗑️ セッション削除: ${sessionId}`);
  }
  
  /**
   * セッションデータ暗号化（簡易版）
   */
  static encryptSessionData(data) {
    // 本番環境では適切な暗号化ライブラリを使用
    const jsonString = JSON.stringify(data);
    return Utilities.base64Encode(jsonString);
  }
  
  /**
   * セッションデータ復号化
   */
  static decryptSessionData(encryptedData) {
    const jsonString = Utilities.base64Decode(encryptedData);
    return JSON.parse(jsonString);
  }
}
```

### 認証管理システム

```javascript
// AuthManager.gs - 認証管理クラス
class AuthManager {
  /**
   * Google OAuth認証 + カスタム認証
   */
  static authenticateUser(customCredentials = null) {
    try {
      // 1. Google OAuth認証
      const googleUser = Session.getActiveUser();
      const googleEmail = googleUser.getEmail();
      
      if (!googleEmail) {
        throw new Error('Google認証が必要です');
      }
      
      // 2. カスタム認証（企業ユーザーリストとの照合）
      if (customCredentials) {
        const isValidUser = this.validateCustomCredentials(googleEmail, customCredentials);
        if (!isValidUser) {
          throw new Error('アクセス権限がありません');
        }
      }
      
      // 3. ユーザー情報取得
      const userData = this.getUserData(googleEmail);
      
      // 4. セッション作成
      const sessionId = SessionManager.createSession(googleEmail, userData);
      
      console.log(`🔑 認証成功: ${googleEmail}`);
      return {
        success: true,
        sessionId: sessionId,
        user: {
          email: googleEmail,
          ...userData
        }
      };
      
    } catch (error) {
      console.error(`❌ 認証エラー: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * カスタム認証情報の検証
   */
  static validateCustomCredentials(email, credentials) {
    try {
      // ユーザーマスタシート（企業のユーザーリスト）との照合
      const userSheet = SpreadsheetApp.openById(CONFIG.USER_MASTER_SHEET_ID)
        .getSheetByName('users');
      
      const users = userSheet.getDataRange().getValues();
      
      for (let i = 1; i < users.length; i++) { // ヘッダー行をスキップ
        const row = users[i];
        const userEmail = row[0];
        const isActive = row[1];
        const department = row[2];
        const role = row[3];
        
        if (userEmail === email && isActive) {
          console.log(`✅ ユーザー承認: ${email} (${department}/${role})`);
          return true;
        }
      }
      
      console.warn(`⚠️ 未承認ユーザー: ${email}`);
      return false;
    } catch (error) {
      console.error(`❌ ユーザー検証エラー: ${error.message}`);
      return false;
    }
  }
  
  /**
   * ユーザー詳細情報取得
   */
  static getUserData(email) {
    try {
      const userSheet = SpreadsheetApp.openById(CONFIG.USER_MASTER_SHEET_ID)
        .getSheetByName('users');
      
      const users = userSheet.getDataRange().getValues();
      
      for (let i = 1; i < users.length; i++) {
        const row = users[i];
        if (row[0] === email) {
          return {
            department: row[2],
            role: row[3],
            permissions: row[4] ? row[4].split(',') : [],
            lastLogin: new Date()
          };
        }
      }
      
      // デフォルトユーザー情報
      return {
        department: 'unknown',
        role: 'user',
        permissions: ['read'],
        lastLogin: new Date()
      };
    } catch (error) {
      console.error(`❌ ユーザーデータ取得エラー: ${error.message}`);
      return {};
    }
  }
}
```

## 🔗 企業システム連携パターン

### Pattern 1: OAuth 2.0 + REST API連携（推奨）

```javascript
// EnterpriseConnector.gs - 企業システム連携クラス
class EnterpriseConnector {
  /**
   * Microsoft Dynamics 365 連携
   */
  static connectToDynamics365() {
    return new Dynamics365Connector();
  }
  
  /**
   * Autodesk Platform Services 連携
   */
  static connectToAutodesk() {
    return new AutodeskConnector();
  }
}

// Dynamics365Connector.gs
class Dynamics365Connector {
  constructor() {
    this.baseUrl = 'https://your-org.api.crm.dynamics.com';
    this.apiVersion = 'v9.2';
    this.clientId = PropertiesService.getScriptProperties().getProperty('DYNAMICS_CLIENT_ID');
    this.clientSecret = PropertiesService.getScriptProperties().getProperty('DYNAMICS_CLIENT_SECRET');
  }
  
  /**
   * OAuth 2.0 アクセストークン取得
   */
  getAccessToken() {
    try {
      // 既存トークンの確認
      const cachedToken = this.getCachedToken();
      if (cachedToken && !this.isTokenExpired(cachedToken)) {
        return cachedToken.access_token;
      }
      
      // 新規トークン取得
      const tokenUrl = 'https://login.microsoftonline.com/your-tenant-id/oauth2/v2.0/token';
      
      const payload = {
        'grant_type': 'client_credentials',
        'client_id': this.clientId,
        'client_secret': this.clientSecret,
        'scope': 'https://your-org.api.crm.dynamics.com/.default'
      };
      
      const response = UrlFetchApp.fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        payload: Object.keys(payload).map(key => `${key}=${encodeURIComponent(payload[key])}`).join('&')
      });
      
      const tokenData = JSON.parse(response.getContentText());
      
      if (tokenData.access_token) {
        // トークンキャッシュ
        this.cacheToken(tokenData);
        console.log('✅ Dynamics 365 アクセストークン取得成功');
        return tokenData.access_token;
      } else {
        throw new Error('アクセストークン取得失敗');
      }
      
    } catch (error) {
      console.error(`❌ Dynamics 365 認証エラー: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * データ取得（OData クエリ対応）
   */
  async getData(entityName, odataQuery = '') {
    const accessToken = this.getAccessToken();
    const url = `${this.baseUrl}/api/data/${this.apiVersion}/${entityName}${odataQuery ? '?' + odataQuery : ''}`;
    
    try {
      const response = UrlFetchApp.fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0'
        }
      });
      
      const data = JSON.parse(response.getContentText());
      console.log(`✅ Dynamics 365 データ取得成功: ${entityName}`);
      return data;
      
    } catch (error) {
      console.error(`❌ Dynamics 365 データ取得エラー: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * データ作成
   */
  async createData(entityName, data) {
    const accessToken = this.getAccessToken();
    const url = `${this.baseUrl}/api/data/${this.apiVersion}/${entityName}`;
    
    try {
      const response = UrlFetchApp.fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        payload: JSON.stringify(data)
      });
      
      console.log(`✅ Dynamics 365 データ作成成功: ${entityName}`);
      return JSON.parse(response.getContentText());
      
    } catch (error) {
      console.error(`❌ Dynamics 365 データ作成エラー: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * トークンキャッシュ機能
   */
  cacheToken(tokenData) {
    const expiryTime = new Date().getTime() + (tokenData.expires_in * 1000);
    const cacheData = {
      ...tokenData,
      expires_at: expiryTime
    };
    
    PropertiesService.getScriptProperties()
      .setProperty('DYNAMICS_TOKEN_CACHE', JSON.stringify(cacheData));
  }
  
  getCachedToken() {
    const cached = PropertiesService.getScriptProperties().getProperty('DYNAMICS_TOKEN_CACHE');
    return cached ? JSON.parse(cached) : null;
  }
  
  isTokenExpired(tokenData) {
    return new Date().getTime() >= tokenData.expires_at;
  }
}
```

### Pattern 2: Webhook受信機能

```javascript
// WebhookManager.gs - Webhook受信管理
class WebhookManager {
  /**
   * Webhook受信のメインハンドラー（doPost関数から呼び出し）
   */
  static handleWebhook(e) {
    try {
      // 1. セキュリティ検証
      const isValid = this.validateWebhookSignature(e);
      if (!isValid) {
        console.error('❌ Webhook署名検証失敗');
        return this.createErrorResponse('Unauthorized', 401);
      }
      
      // 2. ペイロード解析
      const payload = JSON.parse(e.postData.contents);
      const webhookType = e.parameter.type || payload.type;
      
      console.log(`📡 Webhook受信: ${webhookType}`);
      
      // 3. タイプ別処理
      switch (webhookType) {
        case 'plm_update':
          return this.handlePLMUpdate(payload);
        case 'erp_order':
          return this.handleERPOrder(payload);
        case 'cad_revision':
          return this.handleCADRevision(payload);
        default:
          console.warn(`⚠️ 未知のWebhookタイプ: ${webhookType}`);
          return this.createErrorResponse('Unknown webhook type', 400);
      }
      
    } catch (error) {
      console.error(`❌ Webhook処理エラー: ${error.message}`);
      return this.createErrorResponse('Internal Server Error', 500);
    }
  }
  
  /**
   * PLM更新通知の処理
   */
  static handlePLMUpdate(payload) {
    try {
      // スプレッドシートのPLMデータを更新
      const sheet = SpreadsheetApp.openById(CONFIG.PLM_SYNC_SHEET_ID)
        .getSheetByName('plm_data');
      
      const updateData = [
        payload.itemId,
        payload.itemName,
        payload.revision,
        payload.status,
        new Date().toISOString(),
        payload.modifiedBy
      ];
      
      // 既存行を検索して更新 or 新規追加
      const existingRow = this.findRowByItemId(sheet, payload.itemId);
      if (existingRow > 0) {
        sheet.getRange(existingRow, 1, 1, updateData.length).setValues([updateData]);
        console.log(`✅ PLMアイテム更新: ${payload.itemId}`);
      } else {
        sheet.appendRow(updateData);
        console.log(`✅ PLMアイテム新規追加: ${payload.itemId}`);
      }
      
      // 関連する図面検索システムにも反映
      this.updateDrawingSearchIndex(payload);
      
      return this.createSuccessResponse('PLM update processed');
      
    } catch (error) {
      console.error(`❌ PLM更新処理エラー: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * ERP注文通知の処理
   */
  static handleERPOrder(payload) {
    try {
      // 注文データをスプレッドシートに記録
      const sheet = SpreadsheetApp.openById(CONFIG.ERP_SYNC_SHEET_ID)
        .getSheetByName('orders');
      
      const orderData = [
        payload.orderId,
        payload.customerName,
        payload.orderDate,
        payload.totalAmount,
        payload.status,
        new Date().toISOString()
      ];
      
      sheet.appendRow(orderData);
      
      // 関連部品の図面検索（自動）
      if (payload.items && payload.items.length > 0) {
        this.searchRelatedDrawings(payload.items);
      }
      
      console.log(`✅ ERP注文処理完了: ${payload.orderId}`);
      return this.createSuccessResponse('ERP order processed');
      
    } catch (error) {
      console.error(`❌ ERP注文処理エラー: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * CAD改訂通知の処理
   */
  static handleCADRevision(payload) {
    try {
      // CAD改訂履歴をスプレッドシートに記録
      const sheet = SpreadsheetApp.openById(CONFIG.CAD_SYNC_SHEET_ID)
        .getSheetByName('revisions');
      
      const revisionData = [
        payload.drawingId,
        payload.fileName,
        payload.revision,
        payload.changeDescription,
        payload.modifiedBy,
        new Date(payload.modifiedDate),
        payload.fileUrl
      ];
      
      sheet.appendRow(revisionData);
      
      // 図面検索インデックスの更新
      this.triggerDrawingReanalysis(payload.drawingId, payload.fileUrl);
      
      console.log(`✅ CAD改訂処理完了: ${payload.drawingId}`);
      return this.createSuccessResponse('CAD revision processed');
      
    } catch (error) {
      console.error(`❌ CAD改訂処理エラー: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Webhook署名検証
   */
  static validateWebhookSignature(e) {
    const signature = e.parameter.signature || e.postData.headers['X-Webhook-Signature'];
    const secret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
    
    if (!signature || !secret) {
      return false;
    }
    
    // HMAC-SHA256による署名検証
    const expectedSignature = Utilities.computeHmacSha256Signature(
      e.postData.contents, 
      secret
    );
    const expectedSigHex = expectedSignature.map(byte => 
      ('0' + (byte & 0xFF).toString(16)).slice(-2)
    ).join('');
    
    return signature === `sha256=${expectedSigHex}`;
  }
  
  /**
   * レスポンス生成ヘルパー
   */
  static createSuccessResponse(message) {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: message,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  static createErrorResponse(message, statusCode = 400) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

### Pattern 3: 定期同期（時間ベーストリガー）

```javascript
// SyncManager.gs - 定期同期管理
class SyncManager {
  /**
   * 同期タスクセットアップ
   */
  static setupSyncTasks() {
    // 既存トリガー削除
    this.clearExistingTriggers();
    
    // ERP同期（毎時）
    ScriptApp.newTrigger('syncERPData')
      .timeBased()
      .everyHours(1)
      .create();
    
    // PLM同期（4時間毎）
    ScriptApp.newTrigger('syncPLMData')
      .timeBased()
      .everyHours(4)
      .create();
    
    // CAD同期（日次）
    ScriptApp.newTrigger('syncCADData')
      .timeBased()
      .everyDays(1)
      .atHour(2) // 午前2時
      .create();
    
    console.log('✅ 同期タスクセットアップ完了');
  }
  
  /**
   * ERP データ同期
   */
  static syncERPData() {
    try {
      console.log('🔄 ERP同期開始');
      const startTime = new Date();
      
      // 1. 最新データ取得
      const connector = EnterpriseConnector.connectToDynamics365();
      const lastSyncTime = this.getLastSyncTime('ERP');
      
      // 2. 増分データ取得（最終同期時刻以降）
      const odataQuery = `$filter=modifiedon gt ${lastSyncTime.toISOString()}`;
      const newData = await connector.getData('accounts', odataQuery);
      
      // 3. スプレッドシート更新
      if (newData.value && newData.value.length > 0) {
        this.updateERPSpreadsheet(newData.value);
        console.log(`✅ ERP同期完了: ${newData.value.length}件更新`);
      } else {
        console.log('ℹ️ ERP: 新規更新データなし');
      }
      
      // 4. 最終同期時刻更新
      this.updateLastSyncTime('ERP', startTime);
      
    } catch (error) {
      console.error(`❌ ERP同期エラー: ${error.message}`);
      this.notifyAdmin('ERP同期エラー', error.message);
    }
  }
  
  /**
   * PLM データ同期
   */
  static syncPLMData() {
    try {
      console.log('🔄 PLM同期開始');
      // 実装はERPと同様のパターン
      
    } catch (error) {
      console.error(`❌ PLM同期エラー: ${error.message}`);
      this.notifyAdmin('PLM同期エラー', error.message);
    }
  }
  
  /**
   * 最終同期時刻管理
   */
  static getLastSyncTime(systemName) {
    const stored = PropertiesService.getScriptProperties()
      .getProperty(`LAST_SYNC_${systemName}`);
    
    return stored ? new Date(stored) : new Date(0); // 初回は1970年から
  }
  
  static updateLastSyncTime(systemName, timestamp) {
    PropertiesService.getScriptProperties()
      .setProperty(`LAST_SYNC_${systemName}`, timestamp.toISOString());
  }
  
  /**
   * 管理者通知
   */
  static notifyAdmin(subject, message) {
    const adminEmail = PropertiesService.getScriptProperties()
      .getProperty('ADMIN_EMAIL');
    
    if (adminEmail) {
      GmailApp.sendEmail(adminEmail, subject, message);
    }
  }
}
```

## 📊 実装フェーズ・ROI予測

### Phase 1: 基本認証・セッション管理（2週間）
- **実装内容**: Google OAuth + カスタム認証
- **工数**: 40時間
- **効果**: セキュアなユーザー管理基盤

### Phase 2: ERP連携（3週間）
- **実装内容**: Microsoft Dynamics 365 REST API連携
- **工数**: 60時間  
- **効果**: 受注データ自動同期・部品検索効率化

### Phase 3: Webhook統合（2週間）
- **実装内容**: リアルタイムデータ更新
- **工数**: 40時間
- **効果**: データ同期の即時性向上

### Phase 4: 定期同期・運用監視（2週間）
- **実装内容**: バッチ同期・エラー監視
- **工数**: 40時間
- **効果**: システム安定性・運用自動化

**総実装期間**: 9週間（180時間）
**予想ROI**: 1年目で300%（検索効率化・手作業削減効果）

## 🔒 セキュリティ・運用考慮事項

### 必須セキュリティ対策
1. **OAuth 2.0 + JWT**: 標準的な認証方式
2. **HTTPS通信**: すべてのAPI通信を暗号化
3. **トークン管理**: 短期間トークン + リフレッシュトークン
4. **入力検証**: SQLインジェクション・XSS対策
5. **監査ログ**: アクセス・操作履歴の記録

### 運用監視項目
1. **API制限監視**: レート制限・使用量監視
2. **エラー監視**: 連携エラーの自動検知・通知
3. **パフォーマンス監視**: レスポンス時間・可用性
4. **セキュリティ監視**: 不正アクセス・異常操作検知

この実装ガイドにより、GASを使用した企業レベルのシステム統合が実現できます。段階的な実装により、リスクを抑えながら確実にROIを実現できます。