// ===== エラーハンドリングモジュール =====

/**
 * エラーハンドリングクラス
 * 統一されたエラー処理とログ管理を提供
 */
class ErrorHandler {

  /**
   * 一般的なエラーを処理
   * @param {Error} error エラーオブジェクト
   * @param {string} context エラーが発生したコンテキスト
   * @param {Object} options オプション設定
   * @returns {Object} エラー情報オブジェクト
   */
  static handleError(error, context = '', options = {}) {
    const {
      logToConsole = true,
      throwError = false,
      returnResult = null
    } = options;

    const errorInfo = {
      timestamp: new Date().toLocaleString(),
      context: context,
      name: error.name || 'UnknownError',
      message: error.message || 'Unknown error occurred',
      stack: error.stack || 'No stack trace available',
      type: this.categorizeError(error)
    };

    if (logToConsole) {
      console.error(`❌ [${errorInfo.type}] ${context}でエラー発生:`);
      console.error(`   エラー名: ${errorInfo.name}`);
      console.error(`   メッセージ: ${errorInfo.message}`);
      console.error(`   発生時刻: ${errorInfo.timestamp}`);
      
      if (error.stack) {
        console.error(`   スタックトレース: ${error.stack}`);
      }
    }

    if (throwError) {
      throw error;
    }

    return returnResult !== null ? returnResult : errorInfo;
  }

  /**
   * エラーの種類を分類
   * @param {Error} error エラーオブジェクト
   * @returns {string} エラー種別
   */
  static categorizeError(error) {
    const message = error.message || '';
    const name = error.name || '';

    // API関連エラー
    if (message.includes('429') || message.includes('rate limit')) {
      return 'API_RATE_LIMIT';
    }
    if (message.includes('403') || message.includes('forbidden')) {
      return 'API_PERMISSION';
    }
    if (message.includes('401') || message.includes('unauthorized')) {
      return 'API_AUTH';
    }
    if (message.includes('400') || message.includes('bad request')) {
      return 'API_REQUEST';
    }
    if (message.includes('500') || message.includes('internal server')) {
      return 'API_SERVER';
    }
    if (message.includes('timeout') || message.includes('time out')) {
      return 'TIMEOUT';
    }

    // Google Apps Script関連エラー
    if (message.includes('Service invoked too many times')) {
      return 'GAS_QUOTA';
    }
    if (message.includes('Execution timeout')) {
      return 'GAS_TIMEOUT';
    }
    if (message.includes('Script runtime too long')) {
      return 'GAS_RUNTIME';
    }

    // ファイル・ドライブ関連エラー
    if (message.includes('File not found') || message.includes('No such file')) {
      return 'FILE_NOT_FOUND';
    }
    if (message.includes('Folder not found')) {
      return 'FOLDER_NOT_FOUND';
    }
    if (message.includes('Permission denied')) {
      return 'PERMISSION_DENIED';
    }

    // ネットワーク関連エラー
    if (name === 'ReferenceError' && message.includes('UrlFetchApp')) {
      return 'NETWORK_ERROR';
    }

    // データ関連エラー
    if (name === 'TypeError') {
      return 'TYPE_ERROR';
    }
    if (name === 'ReferenceError') {
      return 'REFERENCE_ERROR';
    }

    return 'UNKNOWN';
  }

  /**
   * API エラーを処理
   * @param {Error} error APIエラー
   * @param {string} apiName API名
   * @returns {string} ユーザー向けエラーメッセージ
   */
  static handleApiError(error, apiName = 'API') {
    const errorType = this.categorizeError(error);
    
    console.error(`❌ ${apiName} エラー詳細:`, error);
    console.error('エラー種類:', error.name);
    console.error('エラーメッセージ:', error.message);
    
    switch (errorType) {
      case 'API_RATE_LIMIT':
        return `${apiName}の使用制限に達しました。しばらく待ってから再試行してください。`;
      
      case 'API_REQUEST':
        return `${apiName}リクエストが不正です。設定を確認してください。`;
      
      case 'API_AUTH':
      case 'API_PERMISSION':
        return `${apiName}認証に失敗しました。APIキーを確認してください。`;
      
      case 'API_SERVER':
        return `${apiName}サーバーエラーです。しばらく待ってから再試行してください。`;
      
      case 'TIMEOUT':
        return `${apiName}がタイムアウトしました。ネットワーク接続を確認してください。`;
      
      case 'NETWORK_ERROR':
        return `ネットワークエラーが発生しました。接続を確認してください。`;
      
      default:
        return `${apiName}エラー: ${error.message}`;
    }
  }

  /**
   * ファイル処理エラーを処理
   * @param {Error} error ファイルエラー
   * @param {string} fileName ファイル名
   * @param {string} operation 操作名
   * @returns {Object} エラー処理結果
   */
  static handleFileError(error, fileName = '', operation = '処理') {
    const errorType = this.categorizeError(error);
    
    console.error(`❌ ファイル${operation}エラー: ${fileName}`, error);
    
    let userMessage = '';
    let shouldRetry = false;
    
    switch (errorType) {
      case 'FILE_NOT_FOUND':
        userMessage = `ファイル「${fileName}」が見つかりません。`;
        shouldRetry = false;
        break;
      
      case 'FOLDER_NOT_FOUND':
        userMessage = `フォルダが見つかりません。設定を確認してください。`;
        shouldRetry = false;
        break;
      
      case 'PERMISSION_DENIED':
        userMessage = `ファイル「${fileName}」へのアクセス権限がありません。`;
        shouldRetry = false;
        break;
      
      case 'GAS_QUOTA':
      case 'GAS_TIMEOUT':
        userMessage = `処理時間制限に達しました。ファイルサイズを小さくするか、分割して処理してください。`;
        shouldRetry = true;
        break;
      
      default:
        userMessage = `ファイル${operation}エラー: ${error.message}`;
        shouldRetry = true;
        break;
    }
    
    return {
      success: false,
      error: userMessage,
      errorType: errorType,
      shouldRetry: shouldRetry,
      fileName: fileName
    };
  }

  /**
   * 検索機能のエラーを処理
   * @param {Error} error 検索エラー
   * @param {string} query 検索クエリ
   * @returns {Array} 安全な空の検索結果
   */
  static handleSearchError(error, query = '') {
    console.error(`❌ 検索エラー (クエリ: "${query}"):`, error);
    console.error('エラー種類:', error.name);
    console.error('エラーメッセージ:', error.message);
    console.error('スタックトレース:', error.stack);
    
    const errorType = this.categorizeError(error);
    
    // 検索エラーの場合、常に空配列を返して安全性を確保
    return [];
  }

  /**
   * データベース（スプレッドシート）エラーを処理
   * @param {Error} error データベースエラー
   * @param {string} operation 操作名
   * @returns {Object} エラー処理結果
   */
  static handleDatabaseError(error, operation = 'データベース操作') {
    const errorType = this.categorizeError(error);
    
    console.error(`❌ ${operation}エラー:`, error);
    
    let userMessage = '';
    let canRecover = false;
    
    switch (errorType) {
      case 'PERMISSION_DENIED':
        userMessage = 'スプレッドシートへのアクセス権限がありません。設定を確認してください。';
        canRecover = false;
        break;
      
      case 'FILE_NOT_FOUND':
        userMessage = 'スプレッドシートが見つかりません。IDを確認してください。';
        canRecover = false;
        break;
      
      case 'GAS_QUOTA':
        userMessage = 'Google Apps Scriptの使用制限に達しました。しばらく待ってから再試行してください。';
        canRecover = true;
        break;
      
      default:
        userMessage = `${operation}でエラーが発生しました: ${error.message}`;
        canRecover = true;
        break;
    }
    
    return {
      success: false,
      error: userMessage,
      errorType: errorType,
      canRecover: canRecover
    };
  }

  /**
   * 重要な処理の実行を安全に行う
   * @param {Function} func 実行する関数
   * @param {string} context 実行コンテキスト
   * @param {*} fallbackValue 失敗時の戻り値
   * @returns {*} 実行結果またはfallbackValue
   */
  static safeExecute(func, context = '処理', fallbackValue = null) {
    try {
      return func();
    } catch (error) {
      this.handleError(error, context, { logToConsole: true });
      return fallbackValue;
    }
  }

  /**
   * リトライ機能付きの実行
   * @param {Function} func 実行する関数
   * @param {number} maxRetries 最大リトライ回数
   * @param {number} delay リトライ間隔（ミリ秒）
   * @param {string} context 実行コンテキスト
   * @returns {*} 実行結果
   */
  static executeWithRetry(func, maxRetries = 3, delay = 1000, context = '処理') {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`⏳ ${context} (試行 ${attempt}/${maxRetries})`);
        return func();
      } catch (error) {
        lastError = error;
        const errorType = this.categorizeError(error);
        
        console.warn(`⚠️ ${context} 試行 ${attempt} 失敗:`, error.message);
        
        // リトライしない方が良いエラーかチェック
        if (['PERMISSION_DENIED', 'FILE_NOT_FOUND', 'API_AUTH'].includes(errorType)) {
          console.error(`❌ ${context} リトライ不可能なエラーのため中断`);
          throw error;
        }
        
        // 最後の試行でなければ待機
        if (attempt < maxRetries) {
          console.log(`⏱️ ${delay}ms 待機後にリトライします...`);
          Utilities.sleep(delay);
        }
      }
    }
    
    console.error(`❌ ${context} ${maxRetries}回の試行すべて失敗`);
    throw lastError;
  }
}