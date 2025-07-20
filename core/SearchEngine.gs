// ===== 検索エンジンモジュール =====

/**
 * 検索エンジンクラス
 * ドキュメント検索機能を提供
 */
class SearchEngine {

  /**
   * ドキュメント検索
   * @param {string} query 検索クエリ
   * @returns {Array} 検索結果配列
   */
  static searchDocuments(query) {
    const startTime = new Date();
    console.log('🔍 ===== 検索処理開始 =====');
    console.log(`検索キーワード: "${query}"`);
    console.log(`開始時刻: ${startTime.toLocaleString()}`);
    
    try {
      // 設定確認
      const config = ConfigManager.getConfig();
      if (!config.spreadsheetId) {
        console.error('❌ スプレッドシートIDが設定されていません');
        return [];
      }

      console.log('📊 ステップ1: データベース接続');
      const sheet = SpreadsheetApp.openById(config.spreadsheetId).getActiveSheet();
      console.log('✅ スプレッドシート接続成功');
      
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      console.log(`📋 データ構造: ${lastRow}行 × ${lastCol}列`);
      
      if (lastRow <= 1) {
        console.log('⚠️ スプレッドシートにデータがありません（ヘッダーのみ）');
        return [];
      }
      
      console.log('📊 ステップ2: データ取得開始');
      const data = sheet.getDataRange().getValues();
      console.log(`✅ ${data.length}行のデータを取得`);
      console.log('ヘッダー行:', data[0]);
      
      // データの第1行目をサンプル確認
      if (data.length > 1) {
        console.log('データサンプル（2行目）:', data[1]);
      }
      
      console.log('🔍 ステップ3: 検索処理開始');
      const results = this.performSearch(data, query);
      
      const endTime = new Date();
      const processingTime = (endTime - startTime) / 1000;
      
      console.log('📊 ===== 検索結果サマリー =====');
      console.log(`検索対象件数: ${data.length - 1}件`);
      console.log(`マッチ件数: ${results.length}件`);
      console.log(`処理時間: ${processingTime}秒`);
      console.log(`終了時刻: ${endTime.toLocaleString()}`);
      console.log('🔍 ===== 検索処理完了 =====');
      
      return this.validateResults(results);
      
    } catch (error) {
      return ErrorHandler.handleSearchError(error, query);
    }
  }

  /**
   * 実際の検索処理を実行
   * @param {Array} data スプレッドシートデータ
   * @param {string} query 検索クエリ
   * @returns {Array} 検索結果配列
   */
  static performSearch(data, query) {
    const results = [];
    let searchCount = 0;
    let matchCount = 0;
    
    for (let i = 1; i < data.length; i++) {
      searchCount++;
      const row = data[i];
      
      // 行データの詳細ログ
      console.log(`行${i + 1}のデータ:`, row);
      
      // 柔軟なデータ構造対応
      const schema = ConfigManager.getSpreadsheetSchema();
      const fileName = row[schema.columns.fileName] || '';
      const extractedText = row[schema.columns.extractedText] || '';
      const aiSummary = row[schema.columns.aiSummary] || '';
      const fileId = row[schema.columns.fileId] || '';
      const updateDate = row[schema.columns.updateDate];
      const fileType = row[schema.columns.fileType] || '不明';
      
      // 検索マッチング判定
      if (this.isMatch(query, fileName, extractedText, aiSummary)) {
        matchCount++;
        console.log(`✅ マッチ ${matchCount}: ${fileName}`);
        
        const result = this.createResultObject(
          fileName,
          extractedText,
          aiSummary,
          fileId,
          updateDate,
          fileType
        );
        
        console.log('作成された結果オブジェクト:', result);
        results.push(result);
      }
    }
    
    console.log(`📊 検索実行結果: ${searchCount}件中 ${matchCount}件マッチ`);
    return results;
  }

  /**
   * 検索マッチング判定
   * @param {string} query 検索クエリ
   * @param {string} fileName ファイル名
   * @param {string} extractedText 抽出テキスト
   * @param {string} aiSummary AI要約
   * @returns {boolean} マッチするかどうか
   */
  static isMatch(query, fileName, extractedText, aiSummary) {
    // 空クエリの場合は全件マッチ
    if (!query || query.trim() === '') {
      return true;
    }
    
    const searchQuery = query.toLowerCase();
    
    // 基本検索: ファイル名、OCRテキスト、AI要約での検索
    const basicMatch = fileName.toLowerCase().includes(searchQuery) ||
                      extractedText.toLowerCase().includes(searchQuery) ||
                      aiSummary.toLowerCase().includes(searchQuery);
    
    if (basicMatch) {
      return true;
    }
    
    // 高度検索: キーワード分解検索
    return this.performAdvancedSearch(searchQuery, fileName, extractedText, aiSummary);
  }

  /**
   * 高度検索機能
   * @param {string} searchQuery 検索クエリ（小文字）
   * @param {string} fileName ファイル名
   * @param {string} extractedText 抽出テキスト
   * @param {string} aiSummary AI要約
   * @returns {boolean} マッチするかどうか
   */
  static performAdvancedSearch(searchQuery, fileName, extractedText, aiSummary) {
    // スペース区切りでキーワード分解
    const keywords = searchQuery.split(/\s+/).filter(k => k.length > 0);
    if (keywords.length <= 1) {
      return false; // 基本検索で既にチェック済み
    }
    
    const searchTargets = [
      fileName.toLowerCase(),
      extractedText.toLowerCase(),
      aiSummary.toLowerCase()
    ].join(' ');
    
    // すべてのキーワードが含まれるかチェック（AND検索）
    const allKeywordsMatch = keywords.every(keyword => 
      searchTargets.includes(keyword)
    );
    
    if (allKeywordsMatch) {
      console.log(`📍 高度検索マッチ (AND): ${keywords.join(' + ')}`);
      return true;
    }
    
    // 部分キーワードマッチ（OR検索）
    const partialMatch = keywords.some(keyword => 
      keyword.length >= 2 && searchTargets.includes(keyword)
    );
    
    if (partialMatch) {
      console.log(`📍 部分検索マッチ (OR): ${keywords.join(' | ')}`);
      return true;
    }
    
    return false;
  }

  /**
   * 検索結果オブジェクトを作成
   * @param {string} fileName ファイル名
   * @param {string} extractedText 抽出テキスト
   * @param {string} aiSummary AI要約
   * @param {string} fileId ファイルID
   * @param {*} updateDate 更新日
   * @param {string} fileType ファイル形式
   * @returns {Object} 結果オブジェクト
   */
  static createResultObject(fileName, extractedText, aiSummary, fileId, updateDate, fileType) {
    return {
      fileName: Utils.safeString(fileName),
      extractedText: this.truncateText(Utils.safeString(extractedText), 100),
      aiSummary: Utils.safeString(aiSummary),
      fileId: Utils.safeString(fileId),
      updateDate: Utils.formatDate(updateDate),
      fileType: Utils.safeString(fileType),
      viewUrl: `https://drive.google.com/file/d/${Utils.safeString(fileId)}/view`
    };
  }

  /**
   * テキストを指定文字数で切り詰め
   * @param {string} text テキスト
   * @param {number} maxLength 最大文字数
   * @returns {string} 切り詰められたテキスト
   */
  static truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
  }

  /**
   * 検索結果の検証と型安全性確保
   * @param {Array} results 検索結果配列
   * @returns {Array} 検証済み結果配列
   */
  static validateResults(results) {
    // 必ず配列を返す - 型チェック強化
    if (!Array.isArray(results)) {
      console.error('❌ 結果が配列ではありません:', typeof results);
      return [];
    }
    
    // 各結果オブジェクトの型チェック
    const validatedResults = results.map((result, index) => {
      if (!result || typeof result !== 'object') {
        console.error(`❌ 結果${index}が無効です:`, result);
        return null;
      }
      
      // 型安全性を確保した結果オブジェクト
      return {
        fileName: Utils.safeString(result.fileName),
        extractedText: Utils.safeString(result.extractedText),
        aiSummary: Utils.safeString(result.aiSummary),
        fileId: Utils.safeString(result.fileId),
        updateDate: Utils.safeString(result.updateDate),
        fileType: Utils.safeString(result.fileType),
        viewUrl: Utils.safeString(result.viewUrl, '#')
      };
    }).filter(result => result !== null);
    
    console.log(`✅ 検証済み結果: ${validatedResults.length}件`);
    return validatedResults;
  }

  /**
   * 検索例を実行
   * @param {string} exampleQuery 検索例クエリ
   * @returns {Array} 検索結果
   */
  static searchExample(exampleQuery) {
    console.log(`🎯 検索例実行: "${exampleQuery}"`);
    return this.searchDocuments(exampleQuery);
  }

  /**
   * 全ドキュメント一覧を取得
   * @returns {Array} 全ドキュメント配列
   */
  static getAllDocuments() {
    console.log('📋 全ドキュメント一覧取得');
    return this.searchDocuments(''); // 空クエリで全件取得
  }

  /**
   * 検索統計情報を取得
   * @returns {Object} 統計情報
   */
  static getSearchStats() {
    try {
      const config = ConfigManager.getConfig();
      if (!config.spreadsheetId) {
        return { error: 'スプレッドシートIDが設定されていません' };
      }

      const sheet = SpreadsheetApp.openById(config.spreadsheetId).getActiveSheet();
      const data = sheet.getDataRange().getValues();
      
      if (data.length <= 1) {
        return {
          totalDocuments: 0,
          fileTypes: {},
          lastUpdate: null
        };
      }

      const documents = data.slice(1); // ヘッダー除去
      const fileTypes = {};
      let latestDate = null;

      documents.forEach(row => {
        const fileType = row[5] || '不明';
        fileTypes[fileType] = (fileTypes[fileType] || 0) + 1;

        const updateDate = row[4];
        if (updateDate) {
          const date = new Date(updateDate);
          if (!latestDate || date > latestDate) {
            latestDate = date;
          }
        }
      });

      return {
        totalDocuments: documents.length,
        fileTypes: fileTypes,
        lastUpdate: latestDate ? Utils.formatDate(latestDate) : null
      };

    } catch (error) {
      console.error('❌ 検索統計取得エラー:', error);
      return { error: error.message };
    }
  }
}

// 後方互換性のための関数エクスポート
function searchDocuments(query) {
  return SearchEngine.searchDocuments(query);
}

function searchDrawings(query) {
  return SearchEngine.searchDocuments(query);
}