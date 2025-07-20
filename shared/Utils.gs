// ===== 共通ユーティリティモジュール =====

/**
 * 共通ユーティリティクラス
 * 各種ヘルパー関数を提供
 */
class Utils {

  /**
   * APIレート制限対応の待機
   * @param {number} milliseconds 待機時間（ミリ秒）
   */
  static sleep(milliseconds = 2000) {
    Utilities.sleep(milliseconds);
  }

  /**
   * ファイル名からキーワード抽出
   * @param {string} fileName ファイル名
   * @returns {Array} 抽出されたキーワード配列
   */
  static extractKeywordsFromFilename(fileName) {
    const keywords = [];
    
    const patterns = {
      'プロジェクト': ['pj', 'project', 'プロジェクト'],
      '平面図': ['平面図', 'floor', 'plan'],
      '立面図': ['立面図', 'elevation'],
      '断面図': ['断面図', 'section'],
      '詳細図': ['詳細図', 'detail'],
      '配置図': ['配置図', 'layout', 'site'],
      '設計図': ['設計図', 'design', 'drawing'],
      '建物': ['建物', 'building', 'bldg'],
      '住宅': ['住宅', 'house', 'residence'],
      '店舗': ['店舗', 'shop', 'store'],
      'オフィス': ['オフィス', 'office'],
      '階': ['階', 'F', 'floor']
    };
    
    const lowerFileName = fileName.toLowerCase();
    
    Object.entries(patterns).forEach(([key, values]) => {
      values.forEach(pattern => {
        if (lowerFileName.includes(pattern.toLowerCase())) {
          keywords.push(key);
        }
      });
    });
    
    return [...new Set(keywords)];
  }

  /**
   * ファイル名からの詳細情報抽出
   * @param {string} fileName ファイル名
   * @returns {Array} 詳細情報配列
   */
  static extractDetailedInfoFromFilename(fileName) {
    const details = [];
    const lowerFileName = fileName.toLowerCase();
    
    // 日付パターンの抽出
    const datePatterns = [
      /(\d{6})/g,           // 250225 形式
      /(\d{4}[-_]\d{2}[-_]\d{2})/g,  // 2025-02-25 形式
      /(\d{2}[-_]\d{2}[-_]\d{4})/g   // 25-02-2025 形式
    ];
    
    datePatterns.forEach(pattern => {
      const matches = fileName.match(pattern);
      if (matches) {
        matches.forEach(match => {
          details.push(`日付: ${match}`);
        });
      }
    });
    
    // プロジェクト名の抽出（カタカナ・ひらがな・漢字）
    const projectPatterns = [
      /([ァ-ヶー]+)/g,      // カタカナ
      /([ぁ-んー]+)/g,      // ひらがな
      /([一-龯]+)/g         // 漢字
    ];
    
    projectPatterns.forEach(pattern => {
      const matches = fileName.match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (match.length >= 2) {  // 2文字以上のもの
            details.push(`プロジェクト要素: ${match}`);
          }
        });
      }
    });
    
    // 図面種別の詳細検出
    const drawingTypes = {
      'plan': '平面図',
      'elevation': '立面図',
      'section': '断面図',
      'detail': '詳細図',
      'layout': '配置図',
      'site': '敷地図',
      'floor': '階平面図',
      'roof': '屋根伏図',
      'foundation': '基礎伏図',
      'structure': '構造図',
      'electric': '電気図',
      'plumbing': '配管図'
    };
    
    Object.entries(drawingTypes).forEach(([key, value]) => {
      if (lowerFileName.includes(key)) {
        details.push(`図面種別: ${value}`);
      }
    });
    
    // 建物用途の詳細検出
    const buildingTypes = {
      'house': '住宅',
      'office': 'オフィス',
      'shop': '店舗',
      'restaurant': 'レストラン',
      'cafe': 'カフェ',
      'hotel': 'ホテル',
      'apartment': 'アパート',
      'mansion': 'マンション',
      'warehouse': '倉庫',
      'factory': '工場',
      'school': '学校',
      'hospital': '病院'
    };
    
    Object.entries(buildingTypes).forEach(([key, value]) => {
      if (lowerFileName.includes(key)) {
        details.push(`建物用途: ${value}`);
      }
    });
    
    // 階数の検出
    const floorPatterns = [
      /(\d+)f/gi,           // 1F, 2F 形式
      /(\d+)階/g,           // 1階, 2階 形式
      /地下(\d+)/g          // 地下1階 形式
    ];
    
    floorPatterns.forEach(pattern => {
      const matches = fileName.match(pattern);
      if (matches) {
        matches.forEach(match => {
          details.push(`階数情報: ${match}`);
        });
      }
    });
    
    return [...new Set(details)];
  }

  /**
   * テキストの前処理・整形
   * @param {string} text 入力テキスト
   * @returns {string} 整形済みテキスト
   */
  static cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/\r\n/g, '\n')          // 改行コードの統一
      .replace(/\r/g, '\n')            // 改行コードの統一
      .replace(/\n{3,}/g, '\n\n')      // 連続する改行を2行に制限
      .trim();                         // 前後の空白を除去
  }

  /**
   * 日付を日本語形式にフォーマット
   * @param {Date|string} date 日付
   * @returns {string} フォーマット済み日付文字列
   */
  static formatDate(date) {
    if (!date) return new Date().toLocaleDateString('ja-JP');
    
    if (typeof date === 'string') {
      date = new Date(date);
    }
    
    if (date instanceof Date && !isNaN(date)) {
      return date.toLocaleDateString('ja-JP');
    }
    
    return new Date().toLocaleDateString('ja-JP');
  }

  /**
   * ファイルサイズを人間が読める形式に変換
   * @param {number} bytes バイト数
   * @returns {string} フォーマット済みサイズ文字列
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * 処理時間を計測する関数
   * @param {Function} func 実行する関数
   * @param {string} taskName タスク名（ログ用）
   * @returns {*} 関数の実行結果
   */
  static measureTime(func, taskName = '処理') {
    const startTime = new Date();
    console.log(`⏱️ ${taskName}開始: ${startTime.toLocaleString()}`);
    
    try {
      const result = func();
      const endTime = new Date();
      const duration = (endTime - startTime) / 1000;
      console.log(`✅ ${taskName}完了: ${duration}秒`);
      return result;
    } catch (error) {
      const endTime = new Date();
      const duration = (endTime - startTime) / 1000;
      console.error(`❌ ${taskName}エラー (${duration}秒):`, error);
      throw error;
    }
  }

  /**
   * 配列が空でないことを確認
   * @param {*} value チェックする値
   * @returns {boolean} 配列で空でないかどうか
   */
  static isNonEmptyArray(value) {
    return Array.isArray(value) && value.length > 0;
  }

  /**
   * オブジェクトの型安全な文字列変換
   * @param {*} value 変換する値
   * @param {string} defaultValue デフォルト値
   * @returns {string} 文字列
   */
  static safeString(value, defaultValue = '') {
    if (value === null || value === undefined) return defaultValue;
    return String(value);
  }

  /**
   * ランダムなIDを生成
   * @param {number} length ID長（デフォルト: 8）
   * @returns {string} ランダムID
   */
  static generateId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 進捗表示ヘルパー
   * @param {number} current 現在の進捗
   * @param {number} total 総数
   * @param {string} taskName タスク名
   */
  static logProgress(current, total, taskName = '処理') {
    const percentage = ((current / total) * 100).toFixed(1);
    console.log(`📊 [${current}/${total}] ${taskName}進捗: ${percentage}%`);
  }

  /**
   * エラーメッセージの標準化
   * @param {Error} error エラーオブジェクト
   * @param {string} context エラーが発生したコンテキスト
   * @returns {string} 標準化されたエラーメッセージ
   */
  static formatErrorMessage(error, context = '') {
    const timestamp = new Date().toLocaleString();
    const contextPrefix = context ? `[${context}] ` : '';
    return `${contextPrefix}${error.name}: ${error.message} (${timestamp})`;
  }
}