// ===== データベース管理モジュール =====

/**
 * データベース管理クラス
 * スプレッドシートへのアクセスとデータ操作を提供
 */
class DatabaseManager {

  /**
   * スプレッドシートを取得
   * @param {string} spreadsheetId スプレッドシートID
   * @returns {SpreadsheetApp.Sheet} シートオブジェクト
   */
  static getSheet(spreadsheetId) {
    try {
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      console.log(`✅ スプレッドシート接続成功: ${spreadsheet.getName()}`);
      return spreadsheet.getActiveSheet();
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, 'スプレッドシート接続');
    }
  }

  /**
   * ヘッダー行の確保
   * @param {SpreadsheetApp.Sheet} sheet シートオブジェクト
   */
  static ensureHeaders(sheet) {
    try {
      if (sheet.getLastRow() === 0) {
        console.log('📝 新規ヘッダーを設定');
        const schema = ConfigManager.getSpreadsheetSchema();
        sheet.getRange(1, 1, 1, schema.headers.length).setValues([schema.headers]);
        console.log('✅ ヘッダー設定完了');
      } else {
        console.log('📋 既存ヘッダーを確認');
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        console.log('現在のヘッダー:', headers);
      }
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, 'ヘッダー設定');
    }
  }

  /**
   * ドキュメントデータを保存
   * @param {SpreadsheetApp.Sheet} sheet シートオブジェクト
   * @param {Object} document ドキュメントデータ
   */
  static saveDocument(sheet, document) {
    try {
      console.log('💾 データ保存中...');
      
      const schema = ConfigManager.getSpreadsheetSchema();
      const row = [
        document.fileName || '',
        document.extractedText || '',
        document.aiSummary || '',
        document.fileId || '',
        document.updateDate || Utils.formatDate(new Date()),
        document.fileType || 'unknown'
      ];
      
      sheet.appendRow(row);
      console.log('✅ 保存完了');
      
      // 🆕 ドキュメント保存統計記録
      try {
        console.log('📊 ドキュメント保存統計記録開始');
        this.logUsageStats(
          'document_saved',
          {
            fileName: document.fileName,
            fileType: document.fileType,
            hasExtractedText: !!(document.extractedText && document.extractedText.length > 0),
            hasAiSummary: !!(document.aiSummary && document.aiSummary.length > 0),
            extractedTextLength: document.extractedText ? document.extractedText.length : 0,
            aiSummaryLength: document.aiSummary ? document.aiSummary.length : 0
          }
        );
        console.log('📊 ドキュメント保存統計記録完了');
      } catch (saveStatsError) {
        console.error('❌ ドキュメント保存統計記録エラー（保存は続行）:', saveStatsError);
      }
      
    } catch (error) {
      throw ErrorHandler.handleDatabaseError(error, 'ドキュメント保存');
    }
  }

  /**
   * 既に処理済みかチェック
   * @param {string} fileName ファイル名
   * @param {SpreadsheetApp.Sheet} sheet シートオブジェクト
   * @returns {boolean} 処理済みかどうか
   */
  static isAlreadyProcessed(fileName, sheet) {
    try {
      const data = sheet.getDataRange().getValues();
      const schema = ConfigManager.getSpreadsheetSchema();
      
      return data.some(row => row[schema.columns.fileName] === fileName);
      
    } catch (error) {
      console.error('❌ 処理済みチェックエラー:', error);
      return false; // エラー時は未処理として扱う
    }
  }

  /**
   * スプレッドシート構造をデバッグ
   * @param {string} spreadsheetId スプレッドシートID
   */
  static debugSpreadsheetStructure(spreadsheetId) {
    console.log('📊 ===== スプレッドシート構造デバッグ =====');
    
    if (!spreadsheetId) {
      console.error('❌ スプレッドシートIDが設定されていません');
      return;
    }
    
    try {
      const sheet = this.getSheet(spreadsheetId);
      
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      
      console.log(`📋 基本情報:`);
      console.log(`   シート名: ${sheet.getName()}`);
      console.log(`   最終行: ${lastRow}`);
      console.log(`   最終列: ${lastCol}`);
      
      if (lastRow === 0) {
        console.log('⚠️ データがありません');
        return;
      }
      
      // ヘッダー確認
      const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      console.log('📝 ヘッダー:', headers);
      
      // 期待するヘッダーとの比較
      const expectedHeaders = ConfigManager.getSpreadsheetSchema().headers;
      const isHeadersCorrect = JSON.stringify(headers) === JSON.stringify(expectedHeaders);
      console.log('📋 ヘッダー正合性:', isHeadersCorrect ? '✅正常' : '❌不整合');
      
      if (!isHeadersCorrect) {
        console.log('期待するヘッダー:', expectedHeaders);
        console.log('実際のヘッダー:', headers);
      }
      
      // データサンプル確認
      if (lastRow > 1) {
        const sampleData = sheet.getRange(2, 1, Math.min(3, lastRow - 1), lastCol).getValues();
        console.log('📄 データサンプル:');
        sampleData.forEach((row, index) => {
          console.log(`   行${index + 2}:`, row);
        });
      }
      
      // データ品質チェック
      console.log('\n🔍 データ品質チェック:');
      const qualityStats = this.analyzeDataQuality(sheet);
      console.log(`   有効行: ${qualityStats.validRows}件`);
      console.log(`   空行: ${qualityStats.emptyRows}件`);
      console.log(`   エラー行: ${qualityStats.errorRows}件`);
      console.log(`   品質スコア: ${qualityStats.qualityScore}%`);
      
    } catch (error) {
      ErrorHandler.handleDatabaseError(error, 'スプレッドシート構造確認');
    }
    
    console.log('📊 ===== スプレッドシート構造デバッグ完了 =====');
  }

  /**
   * データ品質を分析
   * @param {SpreadsheetApp.Sheet} sheet シートオブジェクト
   * @returns {Object} 品質統計
   */
  static analyzeDataQuality(sheet) {
    const allData = sheet.getDataRange().getValues();
    const schema = ConfigManager.getSpreadsheetSchema();
    
    let validRows = 0;
    let emptyRows = 0;
    let errorRows = 0;
    
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      
      if (!row[schema.columns.fileName]) {
        emptyRows++;
      } else if (!row[schema.columns.fileId]) {
        errorRows++;
      } else {
        validRows++;
      }
    }
    
    const totalDataRows = allData.length - 1; // ヘッダー除く
    const qualityScore = totalDataRows > 0 ? 
      Math.round((validRows / totalDataRows) * 100) : 100;
    
    return {
      validRows,
      emptyRows,
      errorRows,
      totalRows: totalDataRows,
      qualityScore
    };
  }

  /**
   * スプレッドシート構造を修正
   * @param {string} spreadsheetId スプレッドシートID
   */
  static fixSpreadsheetStructure(spreadsheetId) {
    console.log('🔧 ===== スプレッドシート構造修正開始 =====');
    
    if (!spreadsheetId) {
      console.error('❌ スプレッドシートIDが設定されていません');
      return;
    }
    
    try {
      const sheet = this.getSheet(spreadsheetId);
      const schema = ConfigManager.getSpreadsheetSchema();
      
      // 正しいヘッダーを設定
      console.log('📝 ヘッダー修正');
      sheet.getRange(1, 1, 1, schema.headers.length).setValues([schema.headers]);
      
      // 既存データの構造を修正
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        console.log('📊 既存データの構造修正を開始');
        const allData = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
        
        // データを正しい順序に並び替え
        const correctedData = allData.map((row, index) => {
          console.log(`行${index + 2}の修正中...`);
          
          const fileName = row[0] || '';
          const extractedText = row[1] || '';
          const aiSummary = row[2] || '';
          const fileId = row[3] || '';
          const updateDate = Utils.formatDate(row[4]);
          const fileType = row[5] || 'PDF';
          
          return [fileName, extractedText, aiSummary, fileId, updateDate, fileType];
        });
        
        // 修正されたデータを書き戻し
        sheet.getRange(2, 1, correctedData.length, schema.headers.length).setValues(correctedData);
        console.log('✅ データ構造修正完了');
      }
      
      console.log('✅ スプレッドシート構造修正完了');
      
    } catch (error) {
      ErrorHandler.handleDatabaseError(error, 'スプレッドシート構造修正');
    }
    
    console.log('🔧 ===== スプレッドシート構造修正完了 =====');
  }

  /**
   * ドキュメントサマリー情報を取得
   * @param {string} spreadsheetId スプレッドシートID
   * @returns {Object} サマリー情報
   */
  static getDocumentSummary(spreadsheetId) {
    console.log('📊 ===== ドキュメントサマリー取得開始 =====');
    
    try {
      const startTime = new Date();
      
      if (!spreadsheetId) {
        return {
          success: false,
          error: 'スプレッドシートIDが設定されていません。setupIds()を実行してください。'
        };
      }
      
      const sheet = this.getSheet(spreadsheetId);
      const data = sheet.getDataRange().getValues();
      
      if (data.length <= 1) {
        return {
          success: true,
          summary: {
            totalFiles: 0,
            lastAnalysisDate: null,
            fileTypes: {},
            message: 'データが存在しません。新規ドキュメント解析を実行してください。'
          }
        };
      }
      
      // 統計情報の集計
      const summary = this.calculateSummaryStats(data);
      summary.processingTime = ((new Date() - startTime) / 1000).toFixed(2) + '秒';
      
      console.log('📊 サマリー情報:', summary);
      console.log('🎯 ===== ドキュメントサマリー取得完了 =====');
      
      return {
        success: true,
        summary: summary
      };
      
    } catch (error) {
      return ErrorHandler.handleDatabaseError(error, 'サマリー取得');
    }
  }

  /**
   * サマリー統計を計算
   * @param {Array} data スプレッドシートデータ
   * @returns {Object} 統計情報
   */
  static calculateSummaryStats(data) {
    const documents = data.slice(1); // ヘッダー除去
    const schema = ConfigManager.getSpreadsheetSchema();
    
    console.log(`📋 処理対象ドキュメント数: ${documents.length}件`);
    
    const fileTypes = {};
    let latestDate = null;
    
    documents.forEach((row, index) => {
      try {
        const fileName = row[schema.columns.fileName] || '';
        const updateDate = row[schema.columns.updateDate];
        const fileType = row[schema.columns.fileType] || 'unknown';
        
        // ファイル形式の集計
        if (fileType && fileType !== 'unknown') {
          fileTypes[fileType] = (fileTypes[fileType] || 0) + 1;
        } else {
          // ファイル名から拡張子を推測
          const extension = fileName.split('.').pop()?.toUpperCase();
          if (extension && extension !== fileName.toUpperCase()) {
            fileTypes[extension] = (fileTypes[extension] || 0) + 1;
          } else {
            fileTypes['不明'] = (fileTypes['不明'] || 0) + 1;
          }
        }
        
        // 最新の更新日を特定
        if (updateDate) {
          const date = new Date(updateDate);
          if (!latestDate || date > latestDate) {
            latestDate = date;
          }
        }
        
      } catch (rowError) {
        console.warn(`⚠️ 行${index + 2}の処理中にエラー:`, rowError);
      }
    });
    
    return {
      totalFiles: documents.length,
      lastAnalysisDate: latestDate ? Utils.formatDate(latestDate) : null,
      fileTypes: fileTypes
    };
  }

  /**
   * スプレッドシートURLを取得
   * @param {string} spreadsheetId スプレッドシートID
   * @returns {Object} URL情報
   */
  static getSpreadsheetUrl(spreadsheetId) {
    try {
      if (!spreadsheetId) {
        return {
          success: false,
          error: 'スプレッドシートIDが設定されていません。setupIds()を実行してください。'
        };
      }
      
      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
      
      return {
        success: true,
        url: spreadsheetUrl,
        message: 'スプレッドシートのURLを取得しました'
      };
      
    } catch (error) {
      return ErrorHandler.handleDatabaseError(error, 'スプレッドシートURL取得');
    }
  }

  /**
   * データベースの健全性チェック
   * @param {string} spreadsheetId スプレッドシートID
   * @returns {Object} 健全性レポート
   */
  static performHealthCheck(spreadsheetId) {
    console.log('🩺 ===== データベース健全性チェック開始 =====');
    
    try {
      const sheet = this.getSheet(spreadsheetId);
      const healthReport = {
        timestamp: new Date().toLocaleString(),
        overall: 'healthy',
        issues: [],
        recommendations: []
      };
      
      // 基本構造チェック
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      
      if (lastRow === 0) {
        healthReport.overall = 'warning';
        healthReport.issues.push('データが存在しません');
        healthReport.recommendations.push('新規ドキュメント解析を実行してください');
      }
      
      // ヘッダーチェック
      if (lastRow > 0) {
        const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        const expectedHeaders = ConfigManager.getSpreadsheetSchema().headers;
        
        if (JSON.stringify(headers) !== JSON.stringify(expectedHeaders)) {
          healthReport.overall = 'error';
          healthReport.issues.push('ヘッダー構造が不正です');
          healthReport.recommendations.push('fixSpreadsheetStructure()を実行してください');
        }
      }
      
      // データ品質チェック
      if (lastRow > 1) {
        const qualityStats = this.analyzeDataQuality(sheet);
        
        if (qualityStats.qualityScore < 80) {
          healthReport.overall = 'warning';
          healthReport.issues.push(`データ品質が低下しています (${qualityStats.qualityScore}%)`);
          healthReport.recommendations.push('データクリーニングを実行してください');
        }
        
        if (qualityStats.errorRows > 0) {
          healthReport.issues.push(`${qualityStats.errorRows}件のエラー行があります`);
        }
      }
      
      console.log('🩺 健全性チェック結果:', healthReport);
      console.log('🩺 ===== データベース健全性チェック完了 =====');
      
      return {
        success: true,
        health: healthReport
      };
      
    } catch (error) {
      return ErrorHandler.handleDatabaseError(error, 'データベース健全性チェック');
    }
  }

  /**
   * 利用統計をログに記録
   * @param {string} action アクション種別 ('document_analysis', 'search', 'ai_question')
   * @param {Object} details 詳細情報
   */
  static logUsageStats(action, details = {}) {
    try {
      console.log(`📊 利用統計ログ: ${action}`);
      
      const config = ConfigManager.getConfig();
      if (!config.spreadsheetId) {
        console.warn('⚠️ スプレッドシートIDが未設定のためログを記録できません');
        return;
      }
      
      const spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
      
      // 2枚目のシートを取得または作成
      let logSheet;
      try {
        logSheet = spreadsheet.getSheetByName('利用統計');
        if (!logSheet) {
          throw new Error('利用統計シートが見つかりません');
        }
      } catch (error) {
        console.log('📊 利用統計シートを作成します...');
        console.log('📊 作成理由:', error.message);
        
        try {
          logSheet = spreadsheet.insertSheet('利用統計');
          
          // ヘッダー行を設定
          const headers = ['日付', '新規ドキュメント解析数', '検索回数', 'AI質問数'];
          logSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
          
          // ヘッダー行の書式設定
          const headerRange = logSheet.getRange(1, 1, 1, headers.length);
          headerRange.setFontWeight('bold');
          headerRange.setBackground('#f0f0f0');
          
          console.log('✅ 利用統計シート作成完了');
        } catch (createError) {
          console.error('❌ 利用統計シート作成エラー:', createError);
          throw createError;
        }
      }
      
      // シート存在確認
      if (!logSheet) {
        console.error('❌ 利用統計シートの取得に失敗しました');
        return;
      }
      
      // 今日の日付（日本時間）
      const today = new Date();
      const jstOffset = 9 * 60; // JST is UTC+9
      const utc = today.getTime() + (today.getTimezoneOffset() * 60000);
      const jstDate = new Date(utc + (jstOffset * 60000));
      const dateString = Utilities.formatDate(jstDate, 'Asia/Tokyo', 'yyyy-MM-dd');
      
      console.log(`📅 記録日付: ${dateString}`);
      
      // 今日の行を検索
      let data;
      try {
        const dataRange = logSheet.getDataRange();
        if (!dataRange) {
          console.log('📊 データ範囲が空のため、新規データ作成');
          data = [['日付', '新規ドキュメント解析数', '検索回数', 'AI質問数']]; // ヘッダーのみ
        } else {
          data = dataRange.getValues();
        }
      } catch (dataError) {
        console.error('❌ データ範囲取得エラー:', dataError);
        console.log('📊 データ範囲の手動設定を試行...');
        data = [['日付', '新規ドキュメント解析数', '検索回数', 'AI質問数']]; // ヘッダーのみ
      }
      
      let todayRowIndex = -1;
      
      for (let i = 1; i < data.length; i++) { // 1行目はヘッダーなので除外
        const rowDate = data[i][0];
        let rowDateString;
        
        if (rowDate instanceof Date) {
          rowDateString = Utilities.formatDate(rowDate, 'Asia/Tokyo', 'yyyy-MM-dd');
        } else {
          rowDateString = rowDate.toString();
        }
        
        if (rowDateString === dateString) {
          todayRowIndex = i + 1; // スプレッドシートは1ベースなので+1
          break;
        }
      }
      
      // 今日の行が存在しない場合は新規作成
      if (todayRowIndex === -1) {
        console.log('📝 新しい日付の行を作成');
        todayRowIndex = data.length + 1;
        logSheet.getRange(todayRowIndex, 1).setValue(jstDate);
        logSheet.getRange(todayRowIndex, 2).setValue(0); // 新規ドキュメント解析数
        logSheet.getRange(todayRowIndex, 3).setValue(0); // 検索回数
        logSheet.getRange(todayRowIndex, 4).setValue(0); // AI質問数
      }
      
      // カウントを増加
      let columnIndex;
      switch (action) {
        case 'document_analysis':
          columnIndex = 2;
          console.log('📈 新規ドキュメント解析数をカウント');
          break;
        case 'search':
          columnIndex = 3;
          console.log('🔍 検索回数をカウント');
          break;
        case 'ai_question':
          columnIndex = 4;
          console.log('🤖 AI質問数をカウント');
          break;
        default:
          console.warn('⚠️ 不明なアクション:', action);
          return;
      }
      
      const currentValue = logSheet.getRange(todayRowIndex, columnIndex).getValue() || 0;
      const newValue = currentValue + 1;
      logSheet.getRange(todayRowIndex, columnIndex).setValue(newValue);
      
      console.log(`✅ 統計更新完了: ${action} = ${newValue}`);
      
    } catch (error) {
      console.error('❌ 利用統計ログエラー:', error);
      // ログエラーでメイン処理を止めないように、エラーは出力のみ
    }
  }

  /**
   * 利用統計を取得
   * @param {string} period 期間 ('today', 'week', 'month', 'all')
   * @returns {Object} 統計データ
   */
  static getUsageStats(period = 'today') {
    try {
      console.log(`📊 利用統計取得: ${period}`);
      
      const config = ConfigManager.getConfig();
      if (!config.spreadsheetId) {
        return { success: false, error: 'スプレッドシートIDが未設定' };
      }
      
      const spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
      let logSheet;
      
      try {
        logSheet = spreadsheet.getSheetByName('利用統計');
        if (!logSheet) {
          return { success: false, error: '利用統計シートが見つかりません' };
        }
      } catch (error) {
        return { success: false, error: '利用統計シートが見つかりません' };
      }
      
      let data;
      try {
        const dataRange = logSheet.getDataRange();
        if (!dataRange) {
          return { success: true, stats: [], message: 'データがありません' };
        }
        data = dataRange.getValues();
        if (!data || data.length <= 1) {
          return { success: true, stats: [], message: 'データがありません' };
        }
      } catch (dataError) {
        console.error('❌ データ範囲取得エラー (getUsageStats):', dataError);
        return { success: false, error: 'データ取得エラー: ' + dataError.message };
      }
      
      // ヘッダーを除いたデータ
      const statsData = data.slice(1).map(row => ({
        date: row[0],
        documentAnalysis: row[1] || 0,
        searches: row[2] || 0,
        aiQuestions: row[3] || 0
      }));
      
      // 期間でフィルタリング
      const today = new Date();
      const jstOffset = 9 * 60;
      const utc = today.getTime() + (today.getTimezoneOffset() * 60000);
      const jstToday = new Date(utc + (jstOffset * 60000));
      
      let filteredData = statsData;
      
      if (period === 'today') {
        const todayString = Utilities.formatDate(jstToday, 'Asia/Tokyo', 'yyyy-MM-dd');
        filteredData = statsData.filter(row => {
          const rowDateString = Utilities.formatDate(row.date, 'Asia/Tokyo', 'yyyy-MM-dd');
          return rowDateString === todayString;
        });
      } else if (period === 'week') {
        const weekAgo = new Date(jstToday.getTime() - (7 * 24 * 60 * 60 * 1000));
        filteredData = statsData.filter(row => row.date >= weekAgo);
      } else if (period === 'month') {
        const monthAgo = new Date(jstToday.getTime() - (30 * 24 * 60 * 60 * 1000));
        filteredData = statsData.filter(row => row.date >= monthAgo);
      }
      
      // 合計値を計算
      const summary = filteredData.reduce((sum, row) => ({
        totalDocumentAnalysis: sum.totalDocumentAnalysis + row.documentAnalysis,
        totalSearches: sum.totalSearches + row.searches,
        totalAiQuestions: sum.totalAiQuestions + row.aiQuestions
      }), { totalDocumentAnalysis: 0, totalSearches: 0, totalAiQuestions: 0 });
      
      return {
        success: true,
        period: period,
        data: filteredData,
        summary: summary,
        totalDays: filteredData.length
      };
      
    } catch (error) {
      console.error('❌ 利用統計取得エラー:', error);
      return { success: false, error: error.message };
    }
  }
}

// 後方互換性のための関数エクスポート
function debugSpreadsheetStructure() {
  const config = ConfigManager.getConfig();
  return DatabaseManager.debugSpreadsheetStructure(config.spreadsheetId);
}

function fixSpreadsheetStructure() {
  const config = ConfigManager.getConfig();
  return DatabaseManager.fixSpreadsheetStructure(config.spreadsheetId);
}

function getDocumentSummary() {
  const config = ConfigManager.getConfig();
  return DatabaseManager.getDocumentSummary(config.spreadsheetId);
}

function getSpreadsheetUrl() {
  const config = ConfigManager.getConfig();
  return DatabaseManager.getSpreadsheetUrl(config.spreadsheetId);
}