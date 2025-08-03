// ===== ユーザー管理モジュール =====

/**
 * ユーザー管理クラス
 * スプレッドシートのuserシートでユーザー認証・権限管理を行う
 */
class UserManager {
  
  /**
   * userシートの初期化（シートが存在しない場合に作成）
   */
  static initializeUserSheet() {
    console.log('👥 ===== ユーザーシート初期化開始 =====');
    
    try {
      const config = ConfigManager.getConfig();
      if (!config.spreadsheetId) {
        throw new Error('スプレッドシートIDが設定されていません');
      }
      
      const spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
      console.log(`📊 スプレッドシート接続成功: ${spreadsheet.getName()}`);
      
      // userシートの存在確認（正しい方法で）
      let userSheet = null;
      const sheets = spreadsheet.getSheets();
      for (let i = 0; i < sheets.length; i++) {
        if (sheets[i].getName() === 'user') {
          userSheet = sheets[i];
          console.log('✅ userシートが既に存在します');
          break;
        }
      }
      
      if (!userSheet) {
        console.log('📋 userシートが存在しません - 新規作成します');
        userSheet = this.createUserSheet(spreadsheet);
      }
      
      // userSheetがnullでないことを確認
      if (!userSheet) {
        throw new Error('userシートの作成に失敗しました');
      }
      
      // データの確認
      const lastRow = userSheet.getLastRow();
      console.log(`📤 userSheet状態確認: lastRow[${lastRow}]`);
      
      if (lastRow <= 1) {
        console.log('📝 初期ユーザーデータを作成します');
        this.createInitialUserData(userSheet);
      } else {
        console.log(`📋 既存ユーザーデータ確認: ${lastRow - 1}名のユーザー`);
      }
      
      console.log('✅ ユーザーシート初期化完了');
      return { success: true, userSheet: userSheet };
      
    } catch (error) {
      console.error(`❌ ユーザーシート初期化エラー: ${error.message}`);
      return { success: false, error: error.message };
    } finally {
      console.log('👥 ===== ユーザーシート初期化完了 =====');
    }
  }
  
  /**
   * userシート作成
   */
  static createUserSheet(spreadsheet) {
    console.log('🆕 userシート作成開始');
    
    try {
      const userSheet = spreadsheet.insertSheet('user');
      
      // ヘッダー行設定
      const headers = [
        'メールアドレス',
        '有効/無効',
        '部署',
        'ロール',
        '権限',
        'パスワード',
        '作成日',
        '最終ログイン',
        '備考'
      ];
      
      userSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // ヘッダー行の書式設定
      const headerRange = userSheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#E8F0FE');
      headerRange.setBorder(true, true, true, true, true, true);
      
      // 列幅調整
      userSheet.setColumnWidth(1, 250); // メールアドレス
      userSheet.setColumnWidth(2, 80);  // 有効/無効
      userSheet.setColumnWidth(3, 120); // 部署
      userSheet.setColumnWidth(4, 100); // ロール
      userSheet.setColumnWidth(5, 150); // 権限
      userSheet.setColumnWidth(6, 120); // パスワード
      userSheet.setColumnWidth(7, 120); // 作成日
      userSheet.setColumnWidth(8, 120); // 最終ログイン
      userSheet.setColumnWidth(9, 200); // 備考
      
      // データ検証設定（有効/無効列）
      const validationRange = userSheet.getRange(2, 2, 1000, 1);
      const validation = SpreadsheetApp.newDataValidation()
        .requireValueInList(['有効', '無効'])
        .setAllowInvalid(false)
        .build();
      validationRange.setDataValidation(validation);
      
      console.log('✅ userシート作成完了');
      return userSheet;
      
    } catch (error) {
      console.error(`❌ userシート作成エラー: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 初期ユーザーデータ作成
   */
  static createInitialUserData(userSheet) {
    console.log('👤 初期ユーザーデータ作成開始');
    
    try {
      // adminユーザーの作成
      const adminData = [
        'admin@example.com',           // メールアドレス
        '有効',                        // 有効/無効
        'システム管理',                 // 部署
        'admin',                       // ロール
        'admin,search,upload,manage',  // 権限（カンマ区切り）
        'admin123',                    // パスワード
        new Date().toLocaleDateString('ja-JP'), // 作成日
        '',                            // 最終ログイン（空）
        '初期管理者アカウント'          // 備考
      ];
      
      userSheet.getRange(2, 1, 1, adminData.length).setValues([adminData]);
      
      // サンプルユーザーの作成
      const sampleUserData = [
        'user@example.com',            // メールアドレス
        '有効',                        // 有効/無効
        'デザイン部',                   // 部署
        'user',                        // ロール
        'search,upload',               // 権限（カンマ区切り）
        'user123',                     // パスワード
        new Date().toLocaleDateString('ja-JP'), // 作成日
        '',                            // 最終ログイン（空）
        'サンプルユーザーアカウント'     // 備考
      ];
      
      userSheet.getRange(3, 1, 1, sampleUserData.length).setValues([sampleUserData]);
      
      // データ行の書式設定
      const dataRange = userSheet.getRange(2, 1, 2, adminData.length);
      dataRange.setBorder(true, true, true, true, false, false);
      
      console.log('✅ 初期ユーザーデータ作成完了');
      console.log('   - admin@example.com / admin123 (管理者)');
      console.log('   - user@example.com / user123 (一般ユーザー)');
      
    } catch (error) {
      console.error(`❌ 初期ユーザーデータ作成エラー: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * ユーザー認証
   */
  static authenticateUser(email, password) {
    console.log(`🔐 ===== ユーザー認証開始: ${email} =====`);
    
    try {
      const userSheet = this.getUserSheet();
      if (!userSheet) {
        throw new Error('userシートにアクセスできません');
      }
      
      const users = userSheet.getDataRange().getValues();
      console.log(`📋 ユーザーデータ取得: ${users.length - 1}名のユーザー`);
      
      // ヘッダー行をスキップしてユーザー検索
      for (let i = 1; i < users.length; i++) {
        const row = users[i];
        const userEmail = row[0];
        const isActive = row[1];
        const department = row[2];
        const role = row[3];
        const permissions = row[4];
        const userPassword = row[5];
        
        if (userEmail === email) {
          console.log(`👤 ユーザー発見: ${email}`);
          
          // アクティブ状態チェック
          if (isActive !== '有効') {
            console.log(`🚫 無効なユーザー: ${email}`);
            return {
              success: false,
              error: 'アカウントが無効になっています',
              reason: 'account_disabled'
            };
          }
          
          // パスワードチェック
          if (userPassword !== password) {
            console.log(`❌ パスワード不一致: ${email}`);
            return {
              success: false,
              error: 'メールアドレスまたはパスワードが正しくありません',
              reason: 'invalid_password'
            };
          }
          
          // 認証成功
          console.log(`✅ 認証成功: ${email} (${role})`);
          
          // 最終ログイン更新
          this.updateLastLogin(userSheet, i + 1, email);
          
          const userData = {
            email: userEmail,
            department: department,
            role: role,
            permissions: permissions ? permissions.split(',') : [],
            isAdmin: role === 'admin'
          };
          
          return {
            success: true,
            userData: userData,
            message: 'ログイン成功'
          };
        }
      }
      
      // ユーザーが見つからない
      console.log(`👤 ユーザーが見つかりません: ${email}`);
      return {
        success: false,
        error: 'メールアドレスまたはパスワードが正しくありません',
        reason: 'user_not_found'
      };
      
    } catch (error) {
      console.error(`❌ ユーザー認証エラー: ${error.message}`);
      return {
        success: false,
        error: `認証処理でエラーが発生しました: ${error.message}`,
        reason: 'authentication_error'
      };
    } finally {
      console.log('🔐 ===== ユーザー認証完了 =====');
    }
  }
  
  /**
   * 最終ログイン時刻更新
   */
  static updateLastLogin(userSheet, rowIndex, email) {
    try {
      const now = new Date().toLocaleString('ja-JP');
      userSheet.getRange(rowIndex, 8).setValue(now); // 8列目: 最終ログイン
      console.log(`📅 最終ログイン更新: ${email} -> ${now}`);
    } catch (error) {
      console.error(`❌ 最終ログイン更新エラー: ${error.message}`);
    }
  }
  
  /**
   * userシート取得
   */
  static getUserSheet() {
    try {
      const config = ConfigManager.getConfig();
      const spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
      return spreadsheet.getSheetByName('user');
    } catch (error) {
      console.error(`❌ userシート取得エラー: ${error.message}`);
      return null;
    }
  }
  
  /**
   * ユーザー一覧取得（管理者用）
   */
  static getUserList() {
    console.log('👥 ===== ユーザー一覧取得 =====');
    
    try {
      const userSheet = this.getUserSheet();
      if (!userSheet) {
        throw new Error('userシートにアクセスできません');
      }
      
      const users = userSheet.getDataRange().getValues();
      const userList = [];
      
      // ヘッダー行をスキップしてユーザー情報を収集
      for (let i = 1; i < users.length; i++) {
        const row = users[i];
        if (row[0]) { // メールアドレスが存在する行のみ
          userList.push({
            email: row[0],
            isActive: row[1],
            department: row[2],
            role: row[3],
            permissions: row[4] ? row[4].split(',') : [],
            createdDate: row[6],
            lastLogin: row[7],
            note: row[8]
          });
        }
      }
      
      console.log(`✅ ユーザー一覧取得完了: ${userList.length}名`);
      return { success: true, users: userList };
      
    } catch (error) {
      console.error(`❌ ユーザー一覧取得エラー: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * 新規ユーザー追加
   */
  static addUser(userData) {
    console.log(`👤 ===== 新規ユーザー追加: ${userData.email} =====`);
    
    try {
      const userSheet = this.getUserSheet();
      if (!userSheet) {
        throw new Error('userシートにアクセスできません');
      }
      
      // 重複チェック
      const existingUsers = userSheet.getDataRange().getValues();
      for (let i = 1; i < existingUsers.length; i++) {
        if (existingUsers[i][0] === userData.email) {
          console.log(`⚠️ 既存ユーザー: ${userData.email}`);
          return {
            success: false,
            error: 'このメールアドレスは既に登録されています',
            reason: 'user_exists'
          };
        }
      }
      
      // 新規ユーザーデータ
      const newUserData = [
        userData.email,
        userData.isActive || '有効',
        userData.department || '',
        userData.role || 'user',
        userData.permissions ? userData.permissions.join(',') : 'search',
        userData.password,
        new Date().toLocaleDateString('ja-JP'),
        '',
        userData.note || ''
      ];
      
      // シートに追加
      userSheet.appendRow(newUserData);
      
      console.log(`✅ ユーザー追加成功: ${userData.email}`);
      return { success: true, message: 'ユーザーを追加しました' };
      
    } catch (error) {
      console.error(`❌ ユーザー追加エラー: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * 権限チェック
   */
  static hasPermission(userData, requiredPermission) {
    if (!userData || !userData.permissions) {
      return false;
    }
    
    // adminは全権限を持つ
    if (userData.isAdmin) {
      return true;
    }
    
    // 指定された権限を持っているかチェック
    return userData.permissions.includes(requiredPermission);
  }
}

// 後方互換性のための関数エクスポート
function initializeUserSheet() {
  return UserManager.initializeUserSheet();
}

function authenticateUser(email, password) {
  return UserManager.authenticateUser(email, password);
}

function getUserList() {
  return UserManager.getUserList();
}

function addUser(userData) {
  return UserManager.addUser(userData);
}