// ===== セッション管理モジュール =====

/**
 * 安定したセッション管理システム
 * PropertiesService + CacheService + LockService の組み合わせ
 */
class SessionManager {
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
  createSession(userEmail, userData = {}) {
    console.log(`📱 ===== セッション作成開始: ${userEmail} =====`);
    
    try {
      const sessionId = Utilities.getUuid();
      const timestamp = new Date().getTime();
      
      const sessionData = {
        sessionId: sessionId,
        userEmail: userEmail,
        userData: userData,
        createdAt: timestamp,
        lastActivity: timestamp,
        isActive: true,
        ipAddress: 'unknown', // GASでは取得困難
        userAgent: 'GAS WebApp'
      };
      
      // 1. キャッシュに保存（高速アクセス用）
      this.userCache.put(
        `session_${sessionId}`, 
        JSON.stringify(sessionData), 
        this.CACHE_TIMEOUT
      );
      console.log('💾 セッションデータをキャッシュに保存');
      
      // 2. ユーザープロパティに保存（永続化用）
      this.userProperties.setProperties({
        'current_session_id': sessionId,
        'session_data': JSON.stringify(sessionData),
        'last_activity': timestamp.toString()
      });
      console.log('🗃️ セッションデータをプロパティに保存');
      
      // 3. グローバルセッション一覧に追加（管理用）
      this.addToGlobalSessionList(sessionId, userEmail, userData);
      
      console.log(`✅ セッション作成成功: ${userEmail} (${sessionId})`);
      return { 
        success: true, 
        sessionId: sessionId, 
        data: sessionData,
        expiresAt: new Date(timestamp + this.SESSION_TIMEOUT).toISOString()
      };
      
    } catch (error) {
      console.error(`❌ セッション作成エラー: ${error.message}`);
      return { success: false, error: error.message };
    } finally {
      console.log('📱 ===== セッション作成完了 =====');
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
        userEmail: sessionData.userEmail,
        userData: sessionData.userData
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
      
      console.log(`🔄 セッションアクティビティ更新: ${sessionData.userEmail}`);
      
    } catch (error) {
      console.error(`❌ セッションアクティビティ更新エラー: ${error.message}`);
    }
  }
  
  /**
   * セッション削除
   */
  destroySession(sessionId) {
    console.log(`🗑️ ===== セッション削除開始: ${sessionId} =====`);
    
    try {
      // キャッシュから削除
      this.userCache.remove(`session_${sessionId}`);
      console.log('🗑️ キャッシュからセッション削除');
      
      // ユーザープロパティから削除
      this.userProperties.deleteProperty('current_session_id');
      this.userProperties.deleteProperty('session_data');
      this.userProperties.deleteProperty('last_activity');
      console.log('🗑️ プロパティからセッション削除');
      
      // グローバルセッション一覧から削除
      this.removeFromGlobalSessionList(sessionId);
      
      console.log(`✅ セッション削除完了: ${sessionId}`);
      return { success: true };
      
    } catch (error) {
      console.error(`❌ セッション削除エラー: ${error.message}`);
      return { success: false, error: error.message };
    } finally {
      console.log('🗑️ ===== セッション削除完了 =====');
    }
  }
  
  /**
   * グローバルセッション管理（管理者用）
   */
  addToGlobalSessionList(sessionId, userEmail, userData) {
    try {
      const globalSessions = JSON.parse(
        this.scriptProperties.getProperty('global_sessions') || '{}'
      );
      
      globalSessions[sessionId] = {
        userEmail: userEmail,
        role: userData.role || 'user',
        department: userData.department || '',
        createdAt: new Date().toISOString(),
        isActive: true
      };
      
      this.scriptProperties.setProperty('global_sessions', JSON.stringify(globalSessions));
      console.log(`📊 グローバルセッション追加: ${userEmail}`);
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
      console.log(`📊 グローバルセッション削除: ${sessionId}`);
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
      
      const sessions = Object.entries(globalSessions).map(([sessionId, data]) => ({
        sessionId: sessionId,
        ...data
      }));
      
      console.log(`📊 アクティブセッション: ${sessions.length}件`);
      return sessions;
    } catch (error) {
      console.error(`❌ アクティブセッション取得エラー: ${error.message}`);
      return [];
    }
  }
  
  /**
   * セッション復旧機能
   */
  recoverSession() {
    console.log('🔄 ===== セッション復旧試行 =====');
    
    try {
      // 1. Google認証の確認
      const googleUser = Session.getActiveUser();
      const userEmail = googleUser.getEmail();
      
      if (!userEmail) {
        console.log('❌ Google認証が切れています');
        return { success: false, reason: 'google_auth_lost' };
      }
      
      // 2. ユーザー存在確認
      const userAuth = UserManager.authenticateUser(userEmail, 'auto_recovery');
      if (userAuth.success) {
        // 3. 新規セッション作成
        const sessionResult = this.createSession(userEmail, userAuth.userData);
        
        if (sessionResult.success) {
          console.log('✅ セッション復旧成功');
          return { 
            success: true, 
            sessionId: sessionResult.sessionId,
            message: 'Session recovered successfully'
          };
        }
      }
      
      console.log('❌ セッション復旧失敗');
      return { success: false, reason: 'recovery_failed' };
      
    } catch (error) {
      console.error(`❌ セッション復旧エラー: ${error.message}`);
      return { success: false, reason: 'recovery_error', error: error.message };
    }
  }
  
  /**
   * セッション統計情報取得
   */
  getSessionStats() {
    try {
      const globalSessions = JSON.parse(
        this.scriptProperties.getProperty('global_sessions') || '{}'
      );
      
      const stats = {
        totalSessions: Object.keys(globalSessions).length,
        activeUsers: new Set(Object.values(globalSessions).map(s => s.userEmail)).size,
        departments: {},
        roles: {}
      };
      
      // 部署・ロール別統計
      Object.values(globalSessions).forEach(session => {
        const dept = session.department || 'unknown';
        const role = session.role || 'user';
        
        stats.departments[dept] = (stats.departments[dept] || 0) + 1;
        stats.roles[role] = (stats.roles[role] || 0) + 1;
      });
      
      return stats;
    } catch (error) {
      console.error(`❌ セッション統計エラー: ${error.message}`);
      return { totalSessions: 0, activeUsers: 0, departments: {}, roles: {} };
    }
  }
}

// 後方互換性のための関数エクスポート
function createSession(userEmail, userData) {
  const sessionManager = new SessionManager();
  return sessionManager.createSession(userEmail, userData);
}

function validateSession(sessionId) {
  const sessionManager = new SessionManager();
  return sessionManager.validateSession(sessionId);
}

function destroySession(sessionId) {
  const sessionManager = new SessionManager();
  return sessionManager.destroySession(sessionId);
}

function getActiveSessions() {
  const sessionManager = new SessionManager();
  return sessionManager.getActiveSessions();
}

function recoverSession() {
  const sessionManager = new SessionManager();
  return sessionManager.recoverSession();
}