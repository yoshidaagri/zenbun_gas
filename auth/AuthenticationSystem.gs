// ===== 認証システムモジュール =====

/**
 * 包括的な認証システム
 * ユーザー管理とセッション管理を統合
 */
class AuthenticationSystem {
  constructor() {
    this.sessionManager = new SessionManager();
    this.lockService = LockService.getUserLock();
  }
  
  /**
   * ログイン処理
   */
  login(email, password) {
    console.log(`🔐 ===== ログイン処理開始: ${email} =====`);
    
    let lock;
    try {
      // 排他制御
      lock = this.lockService.tryLock(10000);
      if (!lock) {
        console.log('⏳ ロック取得失敗 - 他の処理が実行中');
        return { 
          success: false, 
          error: '他の処理が実行中です。しばらく待ってからもう一度お試しください。',
          reason: 'lock_timeout'
        };
      }
      
      // 1. 基本的な入力検証
      const validation = this.validateLoginInput(email, password);
      if (!validation.valid) {
        console.log(`❌ 入力検証失敗: ${validation.reason}`);
        return { 
          success: false, 
          error: validation.message,
          reason: validation.reason
        };
      }
      
      // 2. ユーザー認証
      const authResult = UserManager.authenticateUser(email, password);
      if (!authResult.success) {
        console.log(`❌ ユーザー認証失敗: ${authResult.reason}`);
        return { 
          success: false, 
          error: authResult.error,
          reason: authResult.reason
        };
      }
      
      // 3. 既存セッションの確認
      const existingSession = this.sessionManager.validateSession();
      if (existingSession.valid && existingSession.userEmail === email) {
        console.log(`♻️ 既存セッション継続: ${email}`);
        return { 
          success: true, 
          sessionId: existingSession.data.sessionId,
          userEmail: email,
          userData: existingSession.userData,
          message: '既存のセッションを継続します',
          isExistingSession: true
        };
      }
      
      // 4. 新規セッション作成
      const sessionResult = this.sessionManager.createSession(email, authResult.userData);
      
      if (sessionResult.success) {
        console.log(`✅ ログイン成功: ${email} (${authResult.userData.role})`);
        
        // ログイン履歴の記録
        this.recordLoginHistory(email, authResult.userData, 'success');
        
        return { 
          success: true, 
          sessionId: sessionResult.sessionId,
          userEmail: email,
          userData: authResult.userData,
          message: 'ログインしました',
          isNewSession: true,
          expiresAt: sessionResult.expiresAt
        };
      } else {
        throw new Error('セッション作成に失敗しました');
      }
      
    } catch (error) {
      console.error(`❌ ログインエラー: ${error.message}`);
      
      // エラーログの記録
      this.recordLoginHistory(email, null, 'error', error.message);
      
      return { 
        success: false, 
        error: `ログイン処理でエラーが発生しました: ${error.message}`,
        reason: 'login_error'
      };
    } finally {
      if (lock && typeof lock.releaseLock === 'function') {
        lock.releaseLock();
      }
      console.log('🔐 ===== ログイン処理完了 =====');
    }
  }
  
  /**
   * ログイン入力検証
   */
  validateLoginInput(email, password) {
    // メールアドレス形式チェック
    if (!email || typeof email !== 'string') {
      return { 
        valid: false, 
        reason: 'invalid_email_format',
        message: 'メールアドレスを入力してください' 
      };
    }
    
    // 簡易メールアドレス形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { 
        valid: false, 
        reason: 'invalid_email_format',
        message: '正しいメールアドレス形式で入力してください' 
      };
    }
    
    // パスワードチェック
    if (!password || typeof password !== 'string') {
      return { 
        valid: false, 
        reason: 'invalid_password_format',
        message: 'パスワードを入力してください' 
      };
    }
    
    if (password.length < 3) {
      return { 
        valid: false, 
        reason: 'password_too_short',
        message: 'パスワードは3文字以上で入力してください' 
      };
    }
    
    return { valid: true };
  }
  
  /**
   * ログアウト処理
   */
  logout(sessionId = null) {
    console.log(`🚪 ===== ログアウト処理開始: ${sessionId || 'current'} =====`);
    
    try {
      // セッション情報の取得（ログ用）
      const sessionInfo = this.sessionManager.validateSession(sessionId);
      const userEmail = sessionInfo.valid ? sessionInfo.userEmail : 'unknown';
      
      // セッション削除
      const result = this.sessionManager.destroySession(sessionId);
      
      if (result.success) {
        console.log(`✅ ログアウト成功: ${userEmail}`);
        
        // ログアウト履歴の記録
        this.recordLoginHistory(userEmail, null, 'logout');
        
        return { 
          success: true, 
          message: 'ログアウトしました',
          userEmail: userEmail
        };
      } else {
        throw new Error('セッション削除に失敗しました');
      }
      
    } catch (error) {
      console.error(`❌ ログアウトエラー: ${error.message}`);
      return { 
        success: false, 
        error: `ログアウト処理でエラーが発生しました: ${error.message}` 
      };
    } finally {
      console.log('🚪 ===== ログアウト処理完了 =====');
    }
  }
  
  /**
   * セッション状態確認
   */
  checkSession(sessionId = null) {
    console.log(`🔍 セッション状態確認: ${sessionId || 'current'}`);
    
    try {
      const sessionResult = this.sessionManager.validateSession(sessionId);
      
      if (sessionResult.valid) {
        console.log(`✅ セッション有効: ${sessionResult.userEmail}`);
        return {
          valid: true,
          userEmail: sessionResult.userEmail,
          userData: sessionResult.userData,
          sessionId: sessionResult.data.sessionId,
          expiresAt: new Date(sessionResult.data.lastActivity + this.sessionManager.SESSION_TIMEOUT).toISOString()
        };
      } else {
        console.log(`❌ セッション無効: ${sessionResult.reason}`);
        return {
          valid: false,
          reason: sessionResult.reason,
          message: this.getSessionErrorMessage(sessionResult.reason)
        };
      }
      
    } catch (error) {
      console.error(`❌ セッション確認エラー: ${error.message}`);
      return {
        valid: false,
        reason: 'check_error',
        error: error.message
      };
    }
  }
  
  /**
   * セッションエラーメッセージ取得
   */
  getSessionErrorMessage(reason) {
    const messages = {
      'no_session_id': 'セッションが見つかりません。ログインしてください。',
      'session_not_found': 'セッションが無効です。再度ログインしてください。',
      'timeout': 'セッションの有効期限が切れました。再度ログインしてください。',
      'validation_error': 'セッション検証でエラーが発生しました。再度ログインしてください。'
    };
    
    return messages[reason] || '不明なセッションエラーです。再度ログインしてください。';
  }
  
  /**
   * 権限チェック
   */
  hasPermission(sessionId, requiredPermission) {
    console.log(`🔒 権限チェック: ${requiredPermission}`);
    
    try {
      const sessionResult = this.checkSession(sessionId);
      
      if (!sessionResult.valid) {
        console.log('❌ セッション無効のため権限チェック失敗');
        return { 
          hasPermission: false, 
          reason: 'invalid_session',
          message: sessionResult.message 
        };
      }
      
      const hasPermission = UserManager.hasPermission(sessionResult.userData, requiredPermission);
      
      if (hasPermission) {
        console.log(`✅ 権限あり: ${sessionResult.userEmail} -> ${requiredPermission}`);
        return { 
          hasPermission: true,
          userEmail: sessionResult.userEmail,
          userData: sessionResult.userData
        };
      } else {
        console.log(`❌ 権限なし: ${sessionResult.userEmail} -> ${requiredPermission}`);
        return { 
          hasPermission: false,
          reason: 'insufficient_permission',
          message: `この機能を使用する権限がありません (必要権限: ${requiredPermission})`
        };
      }
      
    } catch (error) {
      console.error(`❌ 権限チェックエラー: ${error.message}`);
      return { 
        hasPermission: false,
        reason: 'permission_check_error',
        error: error.message
      };
    }
  }
  
  /**
   * ログイン履歴記録
   */
  recordLoginHistory(userEmail, userData, action, error = null) {
    try {
      const timestamp = new Date().toISOString();
      const logData = {
        timestamp: timestamp,
        userEmail: userEmail,
        action: action, // success, error, logout
        role: userData ? userData.role : null,
        department: userData ? userData.department : null,
        error: error,
        success: action === 'success' || action === 'logout'
      };
      
      console.log(`📝 ログイン履歴記録: ${userEmail} - ${action}`);
      
      // スクリプトプロパティに簡易ログ保存（最新10件）
      const existingLogs = JSON.parse(
        this.sessionManager.scriptProperties.getProperty('login_history') || '[]'
      );
      
      existingLogs.unshift(logData);
      
      // 最新10件のみ保持
      if (existingLogs.length > 10) {
        existingLogs.splice(10);
      }
      
      this.sessionManager.scriptProperties.setProperty(
        'login_history', 
        JSON.stringify(existingLogs)
      );
      
    } catch (error) {
      console.error(`❌ ログイン履歴記録エラー: ${error.message}`);
    }
  }
  
  /**
   * ログイン履歴取得（管理者用）
   */
  getLoginHistory() {
    try {
      const history = JSON.parse(
        this.sessionManager.scriptProperties.getProperty('login_history') || '[]'
      );
      
      console.log(`📋 ログイン履歴取得: ${history.length}件`);
      return { success: true, history: history };
      
    } catch (error) {
      console.error(`❌ ログイン履歴取得エラー: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * システム管理情報取得（管理者用）
   */
  getSystemInfo(sessionId) {
    console.log('📊 ===== システム管理情報取得 =====');
    
    try {
      // 管理者権限チェック
      const permissionCheck = this.hasPermission(sessionId, 'admin');
      if (!permissionCheck.hasPermission) {
        return { 
          success: false, 
          error: '管理者権限が必要です',
          reason: 'insufficient_permission'
        };
      }
      
      // システム情報の収集
      const systemInfo = {
        timestamp: new Date().toISOString(),
        activeSessions: this.sessionManager.getActiveSessions(),
        sessionStats: this.sessionManager.getSessionStats(),
        userList: UserManager.getUserList(),
        loginHistory: this.getLoginHistory(),
        systemHealth: this.checkSystemHealth()
      };
      
      console.log('✅ システム管理情報取得完了');
      return { success: true, systemInfo: systemInfo };
      
    } catch (error) {
      console.error(`❌ システム管理情報取得エラー: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * システムヘルスチェック
   */
  checkSystemHealth() {
    const health = {
      timestamp: new Date().toISOString(),
      components: {},
      overall: 'healthy'
    };
    
    try {
      // Config確認
      const config = ConfigManager.getConfig();
      health.components.config = config.spreadsheetId ? 'ok' : 'error';
      
      // スプレッドシート接続確認
      try {
        SpreadsheetApp.openById(config.spreadsheetId);
        health.components.spreadsheet = 'ok';
      } catch (error) {
        health.components.spreadsheet = 'error';
        health.overall = 'degraded';
      }
      
      // ユーザーシート確認
      const userSheet = UserManager.getUserSheet();
      health.components.userSheet = userSheet ? 'ok' : 'error';
      
      // プロパティサービス確認
      try {
        PropertiesService.getScriptProperties().getProperty('test');
        health.components.properties = 'ok';
      } catch (error) {
        health.components.properties = 'error';
        health.overall = 'degraded';
      }
      
      // 全体的な健全性判定
      const errorCount = Object.values(health.components).filter(status => status === 'error').length;
      if (errorCount > 0) {
        health.overall = errorCount >= 2 ? 'critical' : 'degraded';
      }
      
    } catch (error) {
      health.overall = 'critical';
      health.error = error.message;
    }
    
    return health;
  }
}

// 後方互換性のための関数エクスポート
function loginUser(email, password) {
  const authSystem = new AuthenticationSystem();
  return authSystem.login(email, password);
}

function logoutUser(sessionId) {
  const authSystem = new AuthenticationSystem();
  return authSystem.logout(sessionId);
}

function checkUserSession(sessionId) {
  const authSystem = new AuthenticationSystem();
  return authSystem.checkSession(sessionId);
}

function checkUserPermission(sessionId, permission) {
  const authSystem = new AuthenticationSystem();
  return authSystem.hasPermission(sessionId, permission);
}

function getSystemInformation(sessionId) {
  const authSystem = new AuthenticationSystem();
  return authSystem.getSystemInfo(sessionId);
}