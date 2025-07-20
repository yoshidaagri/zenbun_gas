// ===== 設定管理モジュール =====

/**
 * 設定管理クラス
 * APIキー、スプレッドシートID、フォルダIDなどの設定を一元管理
 */
class ConfigManager {
  
  /**
   * スクリプトプロパティにAPIキーを設定（手動設定用）
   * 注意: 実際のAPIキーはGASエディタのスクリプトプロパティで設定してください
   */
  static setApiKeys(visionApiKey = null, geminiApiKey = null) {
    console.log('🔑 ===== APIキー設定開始 =====');
    
    // パラメータで指定されたキーがある場合は使用
    if (visionApiKey && geminiApiKey) {
      console.log('📝 パラメータで指定されたAPIキーを設定中...');
      
      PropertiesService.getScriptProperties().setProperties({
        'VISION_API_KEY': visionApiKey,
        'GEMINI_API_KEY': geminiApiKey
      });
      
      console.log('✅ APIキー設定完了');
      console.log('Vision API:', visionApiKey.substring(0, 10) + '...');
      console.log('Gemini API:', geminiApiKey.substring(0, 10) + '...');
      return true;
    }
    
    // パラメータなしの場合は説明を表示
    console.log('📋 APIキー設定方法:');
    console.log('1. GASエディタ左側の「実行」タブ → 「スクリプトプロパティ」');
    console.log('2. 以下のプロパティを追加:');
    console.log('   VISION_API_KEY: Google Cloud Vision APIキー');
    console.log('   GEMINI_API_KEY: Google AI Studio Gemini APIキー');
    console.log('');
    console.log('または、以下の関数を実行:');
    console.log('ConfigManager.setApiKeys("vision_key", "gemini_key")');
    
    // 現在の設定状況確認
    const properties = PropertiesService.getScriptProperties().getProperties();
    if (properties.VISION_API_KEY && properties.GEMINI_API_KEY) {
      console.log('✅ APIキーは既に設定済みです');
      return true;
    } else {
      console.log('❌ APIキーが未設定です。上記の方法で設定してください。');
      return false;
    }
  }


  /**
   * スクリプトプロパティにスプレッドシートとフォルダのIDを設定
   * 注意: 実際のIDはGASエディタのスクリプトプロパティで設定してください
   */
  static setupIds(spreadsheetId = null, folderId = null) {
    console.log('🆔 ===== ID設定開始 =====');
    
    // パラメータで指定されたIDがある場合は使用
    if (spreadsheetId && folderId) {
      console.log('📝 パラメータで指定されたIDを設定中...');
      
      PropertiesService.getScriptProperties().setProperties({
        'SPREADSHEET_ID': spreadsheetId,
        'DRAWINGS_FOLDER_ID': folderId
      });
      
      console.log('✅ ID設定完了');
      console.log('Spreadsheet ID:', spreadsheetId);
      console.log('Folder ID:', folderId);
      return true;
    }
    
    // パラメータなしの場合は説明を表示
    console.log('📋 ID設定方法:');
    console.log('1. GASエディタ左側の「実行」タブ → 「スクリプトプロパティ」');
    console.log('2. 以下のプロパティを追加:');
    console.log('   SPREADSHEET_ID: Google SpreadsheetのID');
    console.log('   DRAWINGS_FOLDER_ID: Google DriveフォルダのID');
    console.log('');
    console.log('または、以下の関数を実行:');
    console.log('ConfigManager.setupIds("spreadsheet_id", "folder_id")');
    
    // 現在の設定状況確認
    const properties = PropertiesService.getScriptProperties().getProperties();
    if (properties.SPREADSHEET_ID && properties.DRAWINGS_FOLDER_ID) {
      console.log('✅ IDは既に設定済みです');
      console.log('Spreadsheet ID:', properties.SPREADSHEET_ID);
      console.log('Folder ID:', properties.DRAWINGS_FOLDER_ID);
      return true;
    } else {
      console.log('❌ IDが未設定です。上記の方法で設定してください。');
      return false;
    }
  }

  /**
   * 初期設定（一括設定用）
   * @param {Object} config - 設定オブジェクト
   * @param {string} config.visionApiKey - Vision APIキー
   * @param {string} config.geminiApiKey - Gemini APIキー
   * @param {string} config.spreadsheetId - スプレッドシートID
   * @param {string} config.folderId - フォルダID
   */
  static setupConfig(config) {
    console.log('⚙️ ===== 一括設定開始 =====');
    
    if (!config || typeof config !== 'object') {
      console.error('❌ 設定オブジェクトが無効です');
      return false;
    }
    
    const { visionApiKey, geminiApiKey, spreadsheetId, folderId } = config;
    
    if (!visionApiKey || !geminiApiKey || !spreadsheetId || !folderId) {
      console.error('❌ 必須パラメータが不足しています');
      console.log('必要なパラメータ: visionApiKey, geminiApiKey, spreadsheetId, folderId');
      return false;
    }
    
    try {
      PropertiesService.getScriptProperties().setProperties({
        'VISION_API_KEY': visionApiKey,
        'GEMINI_API_KEY': geminiApiKey,
        'SPREADSHEET_ID': spreadsheetId,
        'DRAWINGS_FOLDER_ID': folderId
      });
      
      console.log('✅ 一括設定完了');
      console.log('Vision API:', visionApiKey.substring(0, 10) + '...');
      console.log('Gemini API:', geminiApiKey.substring(0, 10) + '...');
      console.log('Spreadsheet ID:', spreadsheetId);
      console.log('Folder ID:', folderId);
      
      return true;
    } catch (error) {
      console.error('❌ 設定保存エラー:', error.message);
      return false;
    }
  }

  /**
   * 設定情報を取得
   * @returns {Object} 設定オブジェクト
   */
  static getConfig() {
    const properties = PropertiesService.getScriptProperties().getProperties();
    return {
      spreadsheetId: properties.SPREADSHEET_ID,
      folderId: properties.DRAWINGS_FOLDER_ID,
      visionApiKey: properties.VISION_API_KEY,
      geminiApiKey: properties.GEMINI_API_KEY
    };
  }


  /**
   * Geminiモデル取得（フォールバック機能付き）
   * @returns {string} 使用するGeminiモデル名
   */
  static getGeminiModel() {
    const properties = PropertiesService.getScriptProperties();
    const customModel = properties.getProperty('GEMINI_MODEL');
    
    // カスタムモデルが設定されている場合はそれを使用
    if (customModel) {
      console.log(`🤖 カスタムGeminiモデル: ${customModel}`);
      return customModel;
    }
    
    // デフォルトはGemini 2.0 Flash
    const defaultModel = 'gemini-2.0-flash-exp';
    console.log(`🤖 デフォルトGeminiモデル: ${defaultModel}`);
    return defaultModel;
  }

  /**
   * Geminiモデル設定
   * @param {string} modelName モデル名 (gemini-2.0-flash-exp, gemini-1.5-flash等)
   */
  static setGeminiModel(modelName) {
    const properties = PropertiesService.getScriptProperties();
    properties.setProperty('GEMINI_MODEL', modelName);
    
    console.log(`🤖 Geminiモデル設定更新: ${modelName}`);
    return true;
  }

  /**
   * Gemini APIエンドポイント取得
   * @returns {string} API エンドポイントURL
   */
  static getGeminiApiEndpoint() {
    const model = this.getGeminiModel();
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  }

  /**
   * 設定確認
   */
  static checkSetup() {
    console.log('🔧 ===== システム設定確認開始 =====');
    
    const properties = PropertiesService.getScriptProperties().getProperties();
    
    console.log('📋 保存済み設定一覧:');
    console.log('Vision API:', properties.VISION_API_KEY ? `✅設定済み (${properties.VISION_API_KEY.substring(0, 10)}...)` : '❌未設定');
    console.log('Gemini API:', properties.GEMINI_API_KEY ? `✅設定済み (${properties.GEMINI_API_KEY.substring(0, 10)}...)` : '❌未設定');
    console.log('Geminiモデル:', this.getGeminiModel());
    console.log('スプレッドシート:', properties.SPREADSHEET_ID ? `✅設定済み (${properties.SPREADSHEET_ID})` : '❌未設定');
    console.log('フォルダ:', properties.DRAWINGS_FOLDER_ID ? `✅設定済み (${properties.DRAWINGS_FOLDER_ID})` : '❌未設定');
    
    // 実際の接続テスト
    console.log('\n🔍 接続テスト実行中...');
    
    try {
      if (properties.SPREADSHEET_ID) {
        console.log('📊 スプレッドシート接続テスト...');
        const sheet = SpreadsheetApp.openById(properties.SPREADSHEET_ID);
        console.log(`✅ スプレッドシート接続成功: ${sheet.getName()}`);
        console.log(`   行数: ${sheet.getActiveSheet().getLastRow()}`);
        console.log(`   列数: ${sheet.getActiveSheet().getLastColumn()}`);
      }
      
      if (properties.DRAWINGS_FOLDER_ID) {
        console.log('📁 フォルダ接続テスト...');
        const folder = DriveApp.getFolderById(properties.DRAWINGS_FOLDER_ID);
        console.log(`✅ フォルダ接続成功: ${folder.getName()}`);
        
        // ファイル数カウント
        const allFiles = folder.getFiles();
        let fileCount = 0;
        while (allFiles.hasNext()) {
          allFiles.next();
          fileCount++;
        }
        console.log(`   ファイル数: ${fileCount}件`);
      }
      
    } catch (error) {
      console.error('❌ 接続テストエラー:', error);
      console.error('詳細:', error.message);
    }
    
    console.log('🔧 ===== システム設定確認完了 =====');
  }

  /**
   * 設定の検証
   * @returns {boolean} 設定が完全かどうか
   */
  static validateConfig() {
    const config = this.getConfig();
    return !!(config.visionApiKey && config.geminiApiKey && config.spreadsheetId && config.folderId);
  }

  /**
   * テスト用サンプルファイルを自動生成・アップロード
   */
  static createTestSampleFile() {
    console.log('📄 テスト用サンプルファイル作成中...');
    
    try {
      const config = this.getConfig();
      
      if (!config.folderId) {
        console.error('❌ フォルダIDが設定されていません');
        return null;
      }
      
      const folder = DriveApp.getFolderById(config.folderId);
      
      // テスト用コンテンツ（簡単なテキスト）
      const testContent = `テストドキュメント
=================

プロジェクト: サンプル建築物
用途: システムテスト・検証用
概要: このファイルはシステムのテスト用に自動生成されました

特記事項:
- 面積: 100㎡
- 構造: RC造
- 階数: 2階建て
- 作成日: ${new Date().toLocaleDateString('ja-JP')}

このファイルはAI解析機能のテスト用サンプルです。
実際の設計ドキュメントの代わりに使用できます。`;
      
      // テキストファイルとして作成
      const blob = Utilities.newBlob(testContent, 'text/plain', `test_sample_${new Date().getTime()}.txt`);
      const file = folder.createFile(blob);
      
      console.log('✅ テスト用ファイル作成完了');
      console.log('ファイルID:', file.getId());
      console.log('ファイル名:', file.getName());
      
      // スクリプトプロパティに保存
      PropertiesService.getScriptProperties().setProperty('TEST_FILE_ID', file.getId());
      
      return file.getId();
      
    } catch (error) {
      console.error('❌ テスト用ファイル作成エラー:', error.message);
      return null;
    }
  }

  /**
   * テスト用ファイルを自動検出・取得
   */
  static getAvailableTestFile() {
    console.log('🔍 テスト用ファイル自動検出中...');
    
    try {
      const config = this.getConfig();
      
      if (!config.folderId) {
        console.error('❌ フォルダIDが設定されていません');
        return null;
      }
      
      const folder = DriveApp.getFolderById(config.folderId);
      const files = folder.getFiles();
      
      // フォルダ内の最初のファイルを使用
      if (files.hasNext()) {
        const file = files.next();
        console.log('✅ テスト用ファイル検出:', file.getName());
        console.log('ファイルID:', file.getId());
        console.log('ファイル形式:', file.getBlob().getContentType());
        return file.getId();
      } else {
        console.log('📄 フォルダにファイルが見つからないため新規作成します');
        return this.createTestSampleFile();
      }
      
    } catch (error) {
      console.error('❌ テスト用ファイル検出エラー:', error.message);
      console.log('📄 エラー発生のため新規ファイルを作成します');
      return this.createTestSampleFile();
    }
  }

  /**
   * テスト用ファイルIDを取得（スクリプトプロパティ優先）
   */
  static getTestFileId() {
    console.log('🧪 テスト用ファイルID取得中...');
    
    const properties = PropertiesService.getScriptProperties().getProperties();
    
    // 1. スクリプトプロパティに保存されたテスト用ファイルIDを確認
    if (properties.TEST_FILE_ID) {
      try {
        const file = DriveApp.getFileById(properties.TEST_FILE_ID);
        console.log('✅ 保存済みテスト用ファイル使用:', file.getName());
        return properties.TEST_FILE_ID;
      } catch (error) {
        console.log('⚠️ 保存済みファイルが無効のため新規検出します');
      }
    }
    
    // 2. フォルダ内から自動検出
    return this.getAvailableTestFile();
  }

  /**
   * API制限設定
   */
  static getApiLimits() {
    return {
      visionApiDelay: 2000,      // Vision API呼び出し間隔（ミリ秒）
      geminiApiDelay: 2000,      // Gemini API呼び出し間隔（ミリ秒）
      maxFileSize: 20 * 1024 * 1024,  // 最大ファイルサイズ（20MB）
      gasTimeoutMs: 6 * 60 * 1000     // GAS実行制限時間（6分）
    };
  }

  /**
   * スプレッドシート構造定義
   */
  static getSpreadsheetSchema() {
    return {
      headers: ['ファイル名', '抽出テキスト', 'AI概要', 'ファイルID', '更新日', 'ファイル形式'],
      columns: {
        fileName: 0,
        extractedText: 1,
        aiSummary: 2,
        fileId: 3,
        updateDate: 4,
        fileType: 5
      }
    };
  }
}

// 後方互換性のための関数エクスポート
function setApiKeys(visionApiKey = null, geminiApiKey = null) {
  return ConfigManager.setApiKeys(visionApiKey, geminiApiKey);
}

function setupIds(spreadsheetId = null, folderId = null) {
  return ConfigManager.setupIds(spreadsheetId, folderId);
}

function setupConfig(config) {
  return ConfigManager.setupConfig(config);
}

function getConfig() {
  return ConfigManager.getConfig();
}

function checkSetup() {
  return ConfigManager.checkSetup();
}

function getTestFileId() {
  return ConfigManager.getTestFileId();
}

function createTestSampleFile() {
  return ConfigManager.createTestSampleFile();
}

function getAvailableTestFile() {
  return ConfigManager.getAvailableTestFile();
}