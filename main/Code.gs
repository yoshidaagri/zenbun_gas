// ===== メイン関数・Webアプリエントリーポイント =====

/**
 * Google Apps Script Webアプリケーションのメイン処理
 * リファクタリング後の統合エントリーポイント
 */

// ===== Webアプリケーション関数 =====

/**
 * WebアプリのHTMLを返す
 * クエリパラメータ 'page' で表示するページを指定可能
 */
function doGet(e) {
  console.log('📄 doGet実行');
  console.log('全パラメータ:', e.parameter);
  
  const page = e && e.parameter ? e.parameter.page : null;
  console.log(`ページ指定: ${page}`);
  
  if (page === 'search') {
    console.log('📊 検索画面表示 (search.htmlテンプレート使用)');
    
    // search.htmlテンプレートを使用
    const template = HtmlService.createTemplateFromFile('search');
    
    // テンプレートにセッション情報を渡す
    template.sessionId = e.parameter.sessionId || '';
    template.userEmail = e.parameter.userEmail || '';
    template.role = e.parameter.role || '';
    
    return template.evaluate()
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .setTitle('📚 ドキュメント検索システム - 検索');
  } else {
    console.log('🔐 ログイン画面表示');
    return HtmlService.createTemplateFromFile('login').evaluate()
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .setTitle('📚 ドキュメント検索システム - ログイン');
  }
}

/**
 * HTMLファイルの内容を含む（テンプレート用）
 * @param {string} filename ファイル名
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * サーバーサイドで検索画面HTMLを生成（元のsearch.htmlテンプレート使用）
 * @param {Object} authResult 認証結果
 */
function generateSearchPageWithSession(authResult) {
  console.log('🔄 サーバーサイドで検索画面生成 (search.htmlテンプレート使用)');
  console.log('認証結果:', authResult);
  
  try {
    // search.htmlテンプレートを使用
    const template = HtmlService.createTemplateFromFile('search');
    
    // テンプレートにセッション情報を設定
    template.sessionId = authResult.sessionId || '';
    template.userEmail = authResult.userEmail || '';
    template.role = authResult.userData ? authResult.userData.role : 'user';
    template.userData = authResult.userData || {};
    
    console.log('🎯 テンプレートに設定した情報:', {
      sessionId: template.sessionId,
      userEmail: template.userEmail,
      role: template.role
    });
    
    // HTMLを評価して返す
    const htmlOutput = template.evaluate();
    return htmlOutput.getContent();
    
  } catch (error) {
    console.error('❌ search.htmlテンプレート生成エラー:', error.message);
    
    // フォールバック: シンプルなエラー画面
    return `
      <html>
        <head><title>検索画面エラー</title></head>
        <body>
          <h1>🔧 検索画面準備中</h1>
          <p>search.htmlテンプレートの読み込みでエラーが発生しました。</p>
          <p>エラー: ${error.message}</p>
          <button onclick="window.location.reload()">再読み込み</button>
        </body>
      </html>
    `;
  }
}

// ===== 公開API関数（フロントエンドから呼び出し） =====

// ===== 業種別設定API =====

/**
 * UI設定を取得（フロントエンドから呼び出し）
 * @returns {Object} UI設定
 */
function getIndustryUISettings() {
  try {
    console.log('🎨 UI設定取得開始');
    const settings = ConfigManager.getUISettings();
    console.log('🎨 UI設定取得完了:', settings);
    return settings;
  } catch (error) {
    console.error('❌ UI設定取得エラー:', error);
    return {
      title: '🏗️ デザイン事務所ドキュメント検索システム',
      placeholder: '例: 設計, 平面図, カフェ設計...',
      searchExamples: ['設計', '平面図', 'カフェ', '住宅', 'テラス', '2階'],
      colors: {
        primary: '#8B9A5B',
        light: '#A8B373',
        pale: '#C5D197',
        cream: '#F5F7F0'
      }
    };
  }
}

/**
 * 業種切り替え（フロントエンドから呼び出し）
 * @param {string} industryType 業種タイプ
 * @returns {Object} 結果
 */
function setIndustryType(industryType) {
  try {
    console.log(`🏢 業種切り替え開始: ${industryType}`);
    const config = ConfigManager.setIndustry(industryType);
    return { 
      success: true, 
      message: `業種を「${config.name}」に変更しました`,
      config: config
    };
  } catch (error) {
    console.error('❌ 業種切り替えエラー:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * 利用可能業種一覧取得（フロントエンドから呼び出し）
 * @returns {Array} 業種一覧
 */
function getAvailableIndustries() {
  try {
    return ConfigManager.getAvailableIndustries();
  } catch (error) {
    console.error('❌ 業種一覧取得エラー:', error);
    return [];
  }
}

/**
 * 会計事務所特化プロンプトテスト関数
 * @returns {Object} テスト結果
 */
function testAccountingPrompt() {
  try {
    console.log('🧪 ===== 会計事務所特化プロンプトテスト開始 =====');
    
    const testResults = [];
    
    // Test 1: デザイン事務所でのプロンプト（影響なし確認）
    console.log('📊 Test 1: デザイン事務所プロンプト確認');
    ConfigManager.setIndustry('design_office');
    const designPrompt = DocumentProcessor.createSummaryPrompt('test.pdf', 'テストテキスト');
    const hasDesignFields = designPrompt.includes('重点解析項目');
    testResults.push(`${hasDesignFields ? '❌' : '✅'} Test 1: デザイン事務所に特化項目なし`);
    
    // Test 2: 会計事務所でのプロンプト（特化機能確認）
    console.log('📊 Test 2: 会計事務所プロンプト確認');
    ConfigManager.setIndustry('accounting_office');
    const accountingPrompt = DocumentProcessor.createSummaryPrompt('receipt.pdf', '領収書データ');
    const hasAccountingFields = accountingPrompt.includes('重点解析項目');
    const hasConsumptionTax = accountingPrompt.includes('消費税8%金額');
    testResults.push(`${hasAccountingFields ? '✅' : '❌'} Test 2: 会計事務所に特化項目あり`);
    testResults.push(`${hasConsumptionTax ? '✅' : '❌'} Test 3: 消費税項目含有確認`);
    
    console.log('🧪 ===== プロンプトテスト完了 =====');
    
    const successCount = testResults.filter(r => r.startsWith('✅')).length;
    const totalCount = testResults.length;
    
    return {
      success: successCount === totalCount,
      summary: `会計特化プロンプトテスト: ${successCount}/${totalCount}成功`,
      results: testResults,
      designPromptSample: designPrompt.substring(0, 200),
      accountingPromptSample: accountingPrompt.substring(0, 200)
    };
    
  } catch (error) {
    console.error('❌ 会計特化プロンプトテストエラー:', error);
    return {
      success: false,
      error: error.message,
      summary: '会計特化プロンプトテストでエラー発生'
    };
  }
}

/**
 * 業種切り替え機能テスト関数
 * @returns {Object} テスト結果
 */
function testIndustryConfigSystem() {
  try {
    console.log('🧪 ===== 業種切り替え機能テスト開始 =====');
    let results = [];
    
    // Test 1: デフォルト設定確認
    console.log('📊 Test 1: デフォルト設定確認');
    const defaultConfig = ConfigManager.getIndustryConfig();
    console.log('デフォルト業種:', defaultConfig.name);
    results.push(`✅ Test 1: デフォルト設定 = ${defaultConfig.name}`);
    
    // Test 2: 会計事務所への切り替え
    console.log('📊 Test 2: 会計事務所への切り替え');
    ConfigManager.setIndustry('accounting_office');
    const accountingConfig = ConfigManager.getIndustryConfig();
    console.log('切り替え後:', accountingConfig.name);
    if (accountingConfig.name === '会計事務所') {
      results.push('✅ Test 2: 会計事務所切り替え成功');
    } else {
      results.push('❌ Test 2: 会計事務所切り替え失敗');
    }
    
    // Test 3: UI設定確認
    console.log('📊 Test 3: UI設定確認');
    const uiSettings = ConfigManager.getUISettings();
    console.log('検索例:', uiSettings.searchExamples);
    if (uiSettings.searchExamples.includes('決算書')) {
      results.push('✅ Test 3: UI設定正常（会計検索例含む）');
    } else {
      results.push('❌ Test 3: UI設定異常（会計検索例なし）');
    }
    
    // Test 4: API動作確認
    console.log('📊 Test 4: API動作確認');
    const apiSettings = getIndustryUISettings();
    if (apiSettings && apiSettings.title.includes('会計事務所')) {
      results.push('✅ Test 4: API正常動作');
    } else {
      results.push('❌ Test 4: API異常動作');
    }
    
    // Test 5: 業種一覧取得
    console.log('📊 Test 5: 業種一覧取得');
    const industries = getAvailableIndustries();
    console.log('利用可能業種:', industries.map(i => i.name));
    if (industries.length >= 2) {
      results.push(`✅ Test 5: 業種一覧取得成功（${industries.length}業種）`);
    } else {
      results.push('❌ Test 5: 業種一覧取得失敗');
    }
    
    // Test 6: デザイン事務所に戻す
    console.log('📊 Test 6: デザイン事務所に戻す');
    ConfigManager.setIndustry('design_office');
    const resetConfig = ConfigManager.getIndustryConfig();
    if (resetConfig.name === 'デザイン事務所') {
      results.push('✅ Test 6: デザイン事務所復帰成功');
    } else {
      results.push('❌ Test 6: デザイン事務所復帰失敗');
    }
    
    console.log('🧪 ===== 業種切り替え機能テスト完了 =====');
    
    const successCount = results.filter(r => r.startsWith('✅')).length;
    const totalCount = results.length;
    const successRate = Math.round((successCount / totalCount) * 100);
    
    return {
      success: successCount === totalCount,
      summary: `業種切り替えテスト: ${successCount}/${totalCount}成功 (${successRate}%)`,
      results: results,
      successRate: successRate
    };
    
  } catch (error) {
    console.error('❌ 業種切り替えテストエラー:', error);
    return {
      success: false,
      error: error.message,
      summary: '業種切り替えテストでエラー発生'
    };
  }
}

/**
 * 検索統計テスト関数
 * @param {string} testQuery テスト用検索クエリ
 * @returns {Object} テスト結果
 */
function testSearchWithStats(testQuery = 'テスト検索') {
  try {
    console.log('🧪 検索統計テスト開始');
    
    // 手動で統計記録テスト
    console.log('📊 手動統計記録テスト');
    DatabaseManager.logUsageStats('search', {
      action: 'manual_test_search',
      query: testQuery,
      timestamp: new Date().toISOString()
    });
    
    // 実際の検索実行
    console.log('🔍 実際の検索実行');
    const results = searchDocuments(testQuery);
    
    return {
      success: true,
      message: '検索統計テスト完了',
      searchResults: results.length,
      testQuery: testQuery
    };
  } catch (error) {
    console.error('❌ 検索統計テストエラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 新規ドキュメント解析統計テスト関数
 * @returns {Object} テスト結果
 */
function testDocumentAnalysisStats() {
  try {
    console.log('🧪 ===== 新規ドキュメント解析統計テスト開始 =====');
    
    const results = {
      timestamp: new Date().toISOString(),
      tests: {},
      success: true,
      errors: []
    };
    
    // Test 1: ドキュメント解析統計記録テスト
    console.log('📊 Test 1: ドキュメント解析統計記録');
    try {
      DatabaseManager.logUsageStats('document_analysis', {
        processed: 3,
        skipped: 1,
        errors: 0,
        totalTime: 45.2,
        averageTime: 15.1
      });
      results.tests.documentAnalysisStats = { success: true };
      console.log('✅ Test 1: ドキュメント解析統計記録成功');
    } catch (error) {
      results.tests.documentAnalysisStats = { success: false, error: error.message };
      results.errors.push('ドキュメント解析統計記録エラー: ' + error.message);
      results.success = false;
    }
    
    // Test 2: ファイル処理統計記録テスト
    console.log('📊 Test 2: ファイル処理統計記録');
    try {
      DatabaseManager.logUsageStats('file_processed', {
        fileName: 'test_receipt.jpg',
        fileType: 'JPEG',
        ocrTime: 2.3,
        aiTime: 1.8
      });
      results.tests.fileProcessedStats = { success: true };
      console.log('✅ Test 2: ファイル処理統計記録成功');
    } catch (error) {
      results.tests.fileProcessedStats = { success: false, error: error.message };
      results.errors.push('ファイル処理統計記録エラー: ' + error.message);
      results.success = false;
    }
    
    // Test 3: ドキュメント保存統計記録テスト
    console.log('📊 Test 3: ドキュメント保存統計記録');
    try {
      DatabaseManager.logUsageStats('document_saved', {
        fileName: 'test_receipt.jpg',
        fileType: 'JPEG',
        hasExtractedText: true,
        hasAiSummary: true,
        extractedTextLength: 150,
        aiSummaryLength: 85
      });
      results.tests.documentSavedStats = { success: true };
      console.log('✅ Test 3: ドキュメント保存統計記録成功');
    } catch (error) {
      results.tests.documentSavedStats = { success: false, error: error.message };
      results.errors.push('ドキュメント保存統計記録エラー: ' + error.message);
      results.success = false;
    }
    
    // Test 4: 統計取得テスト
    console.log('📊 Test 4: 統計取得テスト');
    try {
      const todayStats = DatabaseManager.getUsageStats('today');
      results.tests.statsRetrieval = { 
        success: todayStats.success,
        hasData: todayStats.success && todayStats.data && Object.keys(todayStats.data).length > 0
      };
      if (todayStats.success) {
        console.log('✅ Test 4: 統計取得成功');
      } else {
        results.errors.push('統計取得失敗: ' + (todayStats.error || '不明'));
        results.success = false;
      }
    } catch (error) {
      results.tests.statsRetrieval = { success: false, error: error.message };
      results.errors.push('統計取得エラー: ' + error.message);
      results.success = false;
    }
    
    const successCount = Object.values(results.tests).filter(t => t.success).length;
    const totalCount = Object.keys(results.tests).length;
    
    console.log('🧪 ===== 新規ドキュメント解析統計テスト完了 =====');
    console.log(`結果: ${successCount}/${totalCount} 成功`);
    
    return {
      success: results.success,
      summary: `新規ドキュメント解析統計テスト: ${successCount}/${totalCount}成功`,
      results: results,
      successCount: successCount,
      totalCount: totalCount
    };
    
  } catch (error) {
    console.error('❌ 新規ドキュメント解析統計テストエラー:', error);
    return {
      success: false,
      error: error.message,
      summary: '新規ドキュメント解析統計テストでエラー発生'
    };
  }
}

/**
 * AI要約生成単体テスト関数（C列書き込み問題診断用）
 * @returns {Object} テスト結果
 */
function testAISummaryGeneration() {
  try {
    console.log('🧪 ===== AI要約生成単体テスト開始 =====');
    
    const results = {
      timestamp: new Date().toISOString(),
      tests: {},
      success: true,
      errors: []
    };
    
    // Test 1: 設定確認
    console.log('📋 Test 1: 設定確認');
    const config = ConfigManager.getConfig();
    results.tests.configCheck = {
      hasGeminiApiKey: !!config.geminiApiKey,
      geminiModel: ConfigManager.getGeminiModel()
    };
    
    if (!config.geminiApiKey) {
      results.errors.push('Gemini APIキーが未設定');
      results.success = false;
    }
    
    // Test 2: プロンプト生成テスト
    console.log('📋 Test 2: プロンプト生成テスト');
    try {
      const testPrompt = DocumentProcessor.createSummaryPrompt(
        'test_receipt.jpg', 
        'テスト店舗\n2024/07/25\n合計: 1,500円\n消費税: 150円'
      );
      results.tests.promptGeneration = {
        success: true,
        promptLength: testPrompt.length,
        containsIndustryInfo: testPrompt.includes('会計事務所') || testPrompt.includes('デザイン事務所')
      };
      console.log('✅ Test 2: プロンプト生成成功');
    } catch (error) {
      results.tests.promptGeneration = { success: false, error: error.message };
      results.errors.push('プロンプト生成エラー: ' + error.message);
      results.success = false;
    }
    
    // Test 3: AI要約生成テスト（業種別対応）
    console.log('📋 Test 3: AI要約生成テスト（業種別対応）');
    try {
      const industryConfig = ConfigManager.getIndustryConfig();
      
      if (industryConfig.name === '会計事務所') {
        console.log('📊 会計事務所モード: AI要約生成スキップテスト');
        results.tests.aiSummaryGeneration = {
          success: true,
          mode: 'accounting_office_skip',
          summaryLength: 0,
          summary: '会計事務所モードではAI要約を生成しません',
          hasErrorKeywords: false
        };
        console.log('✅ Test 3: 会計事務所AI要約スキップ正常');
      } else {
        console.log('🤖 他業種モード: AI要約生成実行テスト');
        const testSummary = DocumentProcessor.generateDocumentSummary(
          'test_receipt.jpg',
          'テスト店舗\n2024/07/25 15:30\n商品A: 800円\n商品B: 700円\n小計: 1,500円\n消費税(10%): 150円\n合計: 1,650円\n支払方法: 現金',
          config.geminiApiKey
        );
        
        results.tests.aiSummaryGeneration = {
          success: !!testSummary && !testSummary.includes('エラー'),
          mode: 'other_industry_generate',
          summaryLength: testSummary ? testSummary.length : 0,
          summary: testSummary ? testSummary.substring(0, 200) : null,
          hasErrorKeywords: testSummary ? testSummary.includes('エラー') || testSummary.includes('失敗') : false
        };
        
        if (!testSummary || testSummary.includes('エラー')) {
          results.errors.push('AI要約生成失敗: ' + testSummary);
          results.success = false;
        } else {
          console.log('✅ Test 3: AI要約生成成功');
        }
      }
    } catch (error) {
      results.tests.aiSummaryGeneration = { success: false, error: error.message };
      results.errors.push('AI要約生成エラー: ' + error.message);
      results.success = false;
    }
    
    const successCount = Object.values(results.tests).filter(t => t.success !== false).length;
    const totalCount = Object.keys(results.tests).length;
    
    console.log('🧪 ===== AI要約生成単体テスト完了 =====');
    console.log(`結果: ${successCount}/${totalCount} 成功`);
    
    return {
      success: results.success,
      summary: `AI要約生成テスト: ${successCount}/${totalCount}成功`,
      results: results,
      successCount: successCount,
      totalCount: totalCount,
      recommendation: results.success ? '正常動作中' : 'GASログで詳細エラーを確認してください'
    };
    
  } catch (error) {
    console.error('❌ AI要約生成テストエラー:', error);
    return {
      success: false,
      error: error.message,
      summary: 'AI要約生成テストでエラー発生'
    };
  }
}

/**
 * 会計事務所用：既存AI要約データクリア関数
 * @returns {Object} クリア結果
 */
function clearAISummaryForAccountingOffice() {
  try {
    console.log('🧹 ===== 会計事務所用AI要約データクリア開始 =====');
    
    // 現在の業種確認
    const industryConfig = ConfigManager.getIndustryConfig();
    if (industryConfig.name !== '会計事務所') {
      return {
        success: false,
        error: '会計事務所モードでのみ実行可能です',
        currentIndustry: industryConfig.name
      };
    }
    
    const config = ConfigManager.getConfig();
    if (!config.spreadsheetId) {
      return {
        success: false,
        error: 'スプレッドシートIDが設定されていません'
      };
    }
    
    const spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
    const sheet = spreadsheet.getActiveSheet();
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return {
        success: true,
        message: 'データが存在しないためクリア不要',
        clearedRows: 0
      };
    }
    
    // C列（AI概要列）をクリア
    const range = sheet.getRange(2, 3, lastRow - 1, 1); // 2行目からC列
    range.setValue('-'); // ダッシュで統一
    
    console.log(`✅ ${lastRow - 1}行のAI要約データをクリアしました`);
    
    return {
      success: true,
      message: '会計事務所用AI要約データクリア完了',
      clearedRows: lastRow - 1,
      newValue: '-'
    };
    
  } catch (error) {
    console.error('❌ AI要約データクリアエラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * ドキュメント解析実行
 * @returns {Object} 解析結果
 */
function analyzeDocuments() {
  try {
    console.log('📊 メイン: ドキュメント解析開始');
    
    // 利用統計ログ記録
    DatabaseManager.logUsageStats('document_analysis', {
      action: 'analyze_documents',
      timestamp: new Date().toISOString()
    });
    
    const result = DocumentProcessor.analyzeDocuments();
    console.log('📊 メイン: ドキュメント解析完了');
    return result;
  } catch (error) {
    console.error('❌ メイン: ドキュメント解析エラー:', error);
    return ErrorHandler.handleError(error, 'メインドキュメント解析', {
      returnResult: { success: false, error: error.message }
    });
  }
}

/**
 * ドキュメント検索実行
 * @param {string} query 検索クエリ
 * @returns {Array} 検索結果
 */
function searchDocuments(query) {
  try {
    console.log(`🔍 メイン: 検索実行開始 "${query}"`);
    
    // 統計記録をtry-catchで囲む
    try {
      console.log('📊 統計記録開始');
      DatabaseManager.logUsageStats('search', {
        action: 'search_documents',
        query: query,
        timestamp: new Date().toISOString()
      });
      console.log('📊 統計記録完了');
    } catch (statsError) {
      console.error('❌ 統計記録エラー（検索は続行）:', statsError);
    }
    
    const results = SearchEngine.searchDocuments(query);
    console.log(`🔍 メイン: 検索完了 ${results.length}件`);
    return results;
  } catch (error) {
    console.error('❌ メイン: 検索エラー:', error);
    return ErrorHandler.handleSearchError(error, query);
  }
}

/**
 * ドキュメントサマリー取得
 * @returns {Object} サマリー情報
 */
function getDocumentSummary() {
  try {
    console.log('📊 メイン: サマリー取得開始');
    const config = ConfigManager.getConfig();
    const result = DatabaseManager.getDocumentSummary(config.spreadsheetId);
    console.log('📊 メイン: サマリー取得完了');
    return result;
  } catch (error) {
    console.error('❌ メイン: サマリー取得エラー:', error);
    return ErrorHandler.handleError(error, 'メインサマリー取得', {
      returnResult: { success: false, error: error.message }
    });
  }
}

/**
 * スプレッドシートURL取得
 * @returns {Object} URL情報
 */
function getSpreadsheetUrl() {
  try {
    console.log('📊 メイン: スプレッドシートURL取得');
    const config = ConfigManager.getConfig();
    const result = DatabaseManager.getSpreadsheetUrl(config.spreadsheetId);
    console.log('📊 メイン: スプレッドシートURL取得完了');
    return result;
  } catch (error) {
    console.error('❌ メイン: スプレッドシートURL取得エラー:', error);
    return ErrorHandler.handleError(error, 'メインURL取得', {
      returnResult: { success: false, error: error.message }
    });
  }
}

/**
 * データベース健全性チェック
 * @returns {Object} 健全性チェック結果
 */
function performHealthCheck() {
  try {
    console.log('🩺 メイン: データベース健全性チェック開始');
    const config = ConfigManager.getConfig();
    const result = DatabaseManager.performHealthCheck(config.spreadsheetId);
    console.log('🩺 メイン: データベース健全性チェック完了');
    return result;
  } catch (error) {
    console.error('❌ メイン: データベース健全性チェックエラー:', error);
    return ErrorHandler.handleError(error, 'メイン健全性チェック', {
      returnResult: { success: false, error: error.message }
    });
  }
}

// ===== Phase 2: Gemini File API 解析機能 =====

/**
 * 基本テスト関数（通信確認用）
 * @param {string} testData テストデータ
 * @returns {Object} テスト結果
 */
function testAnalysisConnection(testData = 'test') {
  try {
    console.log('🧪 テスト関数実行開始:', testData);
    
    const result = {
      success: true,
      message: 'GAS関数の実行成功',
      timestamp: new Date().toISOString(),
      receivedData: testData,
      gasVersion: 'v2.0'
    };
    
    console.log('🧪 テスト関数実行完了:', result);
    return result;
  } catch (error) {
    console.error('❌ テスト関数エラー:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * AnalysisManager存在チェック・詳細テスト
 * @returns {Object} 詳細テスト結果
 */
function testAnalysisManagerDetails() {
  try {
    console.log('🔍 AnalysisManager詳細テスト開始');
    
    const testResult = {
      timestamp: new Date().toISOString(),
      tests: {},
      errors: [],
      summary: ''
    };
    
    // 1. AnalysisManagerクラス存在確認
    console.log('📋 テスト1: AnalysisManagerクラス存在確認');
    testResult.tests.analysisManagerExists = typeof AnalysisManager !== 'undefined';
    console.log('  結果:', testResult.tests.analysisManagerExists);
    
    if (!testResult.tests.analysisManagerExists) {
      testResult.errors.push('AnalysisManagerクラスが見つかりません');
      testResult.summary = 'AnalysisManager.gsがGASにコピーされていません';
      return testResult;
    }
    
    // 2. createAnalysisSessionメソッド存在確認
    console.log('📋 テスト2: createAnalysisSessionメソッド存在確認');
    testResult.tests.createMethodExists = typeof AnalysisManager.createAnalysisSession === 'function';
    console.log('  結果:', testResult.tests.createMethodExists);
    
    // 3. AnalysisManagerのメソッド一覧
    console.log('📋 テスト3: AnalysisManagerメソッド一覧取得');
    try {
      const methods = Object.getOwnPropertyNames(AnalysisManager).filter(prop => typeof AnalysisManager[prop] === 'function');
      testResult.tests.availableMethods = methods;
      console.log('  利用可能メソッド:', methods);
    } catch (error) {
      testResult.errors.push('メソッド一覧取得エラー: ' + error.message);
    }
    
    // 4. 依存モジュール確認
    console.log('📋 テスト4: 依存モジュール確認');
    const dependencies = ['ConfigManager', 'Utils', 'ErrorHandler', 'GeminiFileAPI'];
    testResult.tests.dependencies = {};
    
    dependencies.forEach(dep => {
      const exists = typeof eval(dep) !== 'undefined';
      testResult.tests.dependencies[dep] = exists;
      console.log(`  ${dep}: ${exists}`);
      if (!exists) {
        testResult.errors.push(`依存モジュール ${dep} が見つかりません`);
      }
    });
    
    // 5. 実際のセッション作成テスト（ダミーデータ）
    if (testResult.tests.createMethodExists) {
      console.log('📋 テスト5: ダミーデータでセッション作成テスト');
      try {
        const dummyFileId = 'test-dummy-file-id-12345';
        const sessionResult = AnalysisManager.createAnalysisSession(dummyFileId);
        
        testResult.tests.sessionCreation = {
          success: !!sessionResult,
          hasSessionId: !!(sessionResult && sessionResult.sessionId),
          hasFileIds: !!(sessionResult && sessionResult.fileIds),
          structure: sessionResult ? Object.keys(sessionResult) : []
        };
        
        console.log('  セッション作成結果:', testResult.tests.sessionCreation);
        console.log('  セッション構造:', sessionResult ? Object.keys(sessionResult) : 'N/A');
        
        if (sessionResult && sessionResult.sessionId) {
          console.log('  セッションID:', sessionResult.sessionId);
          console.log('  ファイルIDs:', sessionResult.fileIds);
          console.log('  ステータス:', sessionResult.status);
        }
        
      } catch (sessionError) {
        testResult.errors.push('セッション作成テストエラー: ' + sessionError.message);
        testResult.tests.sessionCreation = { error: sessionError.message };
        console.error('  セッション作成エラー:', sessionError);
      }
    }
    
    // 6. 結果サマリー
    const totalTests = Object.keys(testResult.tests).length;
    const failedTests = testResult.errors.length;
    const passedTests = totalTests - failedTests;
    
    testResult.summary = `${passedTests}/${totalTests}件成功`;
    
    if (testResult.errors.length === 0) {
      testResult.summary += ' - 全テスト正常';
      console.log('✅ 全テスト正常完了');
    } else {
      testResult.summary += ` - ${failedTests}件エラー`;
      console.log('❌ テストエラーあり:', testResult.errors);
    }
    
    console.log('🔍 AnalysisManager詳細テスト完了');
    return testResult;
    
  } catch (error) {
    console.error('❌ 詳細テスト実行エラー:', error);
    return {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      summary: 'テスト実行中に例外エラー'
    };
  }
}

/**
 * createAnalysisSession関数の単体テスト
 * @returns {Object} 単体テスト結果
 */
function testCreateAnalysisSessionUnit() {
  try {
    console.log('🧪 createAnalysisSession単体テスト開始');
    
    const testResults = [];
    
    // テストケース1: 正常なファイルID
    console.log('📋 テストケース1: 正常なファイルID');
    try {
      const result1 = createAnalysisSession('test-file-id-normal');
      testResults.push({
        case: '正常なファイルID',
        success: !!result1,
        hasSessionId: !!(result1 && result1.sessionId),
        responseType: typeof result1,
        sessionId: result1 ? result1.sessionId : null
      });
      console.log('  結果1:', result1);
    } catch (error) {
      testResults.push({
        case: '正常なファイルID',
        success: false,
        error: error.message
      });
    }
    
    // テストケース2: nullファイルID
    console.log('📋 テストケース2: nullファイルID');
    try {
      const result2 = createAnalysisSession(null);
      testResults.push({
        case: 'nullファイルID（エラーテスト）',
        success: result2 && result2.success === false, // エラーが正しく返されたか
        isErrorResponse: !!(result2 && result2.error),
        responseType: typeof result2,
        errorHandling: result2 && result2.success === false ? 'OK' : 'NG',
        error: result2 ? result2.error : null
      });
      console.log('  結果2:', result2);
    } catch (error) {
      testResults.push({
        case: 'nullファイルID',
        success: false,
        error: error.message
      });
    }
    
    // テストケース3: 配列ファイルID
    console.log('📋 テストケース3: 配列ファイルID');
    try {
      const result3 = createAnalysisSession(['test-file-1', 'test-file-2']);
      testResults.push({
        case: '配列ファイルID',
        success: !!result3,
        hasSessionId: !!(result3 && result3.sessionId),
        isMultiFile: !!(result3 && result3.options && result3.options.multiFileMode),
        responseType: typeof result3,
        sessionId: result3 ? result3.sessionId : null
      });
      console.log('  結果3:', result3);
    } catch (error) {
      testResults.push({
        case: '配列ファイルID',
        success: false,
        error: error.message
      });
    }
    
    console.log('🧪 createAnalysisSession単体テスト完了');
    
    const finalResult = {
      timestamp: new Date().toISOString(),
      totalTests: testResults.length,
      results: testResults,
      summary: `${testResults.filter(r => r.success).length}/${testResults.length}件成功`
    };
    
    console.log('🧪 テスト結果を返却:', JSON.stringify(finalResult, null, 2));
    return finalResult;
    
  } catch (error) {
    console.error('❌ 単体テスト実行エラー:', error);
    return {
      timestamp: new Date().toISOString(),
      error: error.message,
      summary: '単体テスト実行中に例外エラー'
    };
  }
}

/**
 * 解析セッション作成
 * @param {Array|string} fileIds ファイルIDの配列または単一ファイルID
 * @param {Object} options オプション設定
 * @returns {Object} 解析セッション
 */
function startFileAnalysisSession(fileIds, options = {}) {
  console.log('🔬 メイン: ===== 解析セッション作成開始 =====');
  console.log('🔬 メイン: 受信したファイルID:', fileIds);
  console.log('🔬 メイン: 受信したオプション:', options);
  console.log('🔬 メイン: fileIds型:', typeof fileIds);
  console.log('🔬 メイン: options型:', typeof options);
  
  try {
    // 入力値検証
    if (!fileIds) {
      console.error('❌ ファイルIDが未定義です');
      const errorResult = { success: false, error: 'ファイルIDが指定されていません' };
      console.log('🔬 メイン: エラーレスポンス返却:', JSON.stringify(errorResult));
      return errorResult;
    }
    
    // AnalysisManager存在確認
    console.log('🔬 メイン: AnalysisManager存在確認...');
    console.log('🔬 メイン: typeof AnalysisManager:', typeof AnalysisManager);
    
    if (typeof AnalysisManager === 'undefined') {
      console.error('❌ AnalysisManagerクラスが見つかりません');
      const errorResult = { success: false, error: 'AnalysisManagerクラスがGASにコピーされていません' };
      console.log('🔬 メイン: エラーレスポンス返却:', JSON.stringify(errorResult));
      return errorResult;
    }
    
    // createAnalysisSessionメソッド確認
    console.log('🔬 メイン: createAnalysisSessionメソッド確認...');
    console.log('🔬 メイン: typeof AnalysisManager.createAnalysisSession:', typeof AnalysisManager.createAnalysisSession);
    
    if (typeof AnalysisManager.createAnalysisSession !== 'function') {
      console.error('❌ createAnalysisSessionメソッドが関数ではありません');
      const errorResult = { success: false, error: 'createAnalysisSessionメソッドが見つかりません' };
      console.log('🔬 メイン: エラーレスポンス返却:', JSON.stringify(errorResult));
      return errorResult;
    }
    
    console.log('🔬 メイン: AnalysisManager.createAnalysisSession呼び出し開始');
    const result = AnalysisManager.createAnalysisSession(fileIds, options);
    console.log('🔬 メイン: AnalysisManager.createAnalysisSession呼び出し完了');
    
    console.log('🔬 メイン: 結果の型確認:', typeof result);
    console.log('🔬 メイン: 結果がnull:', result === null);
    console.log('🔬 メイン: 結果がundefined:', result === undefined);
    
    // 詳細なresult内容ログ出力
    console.log('🔬 メイン: ===== result詳細分析開始 =====');
    try {
      if (result) {
        console.log('🔬 メイン: result存在確認: true');
        console.log('🔬 メイン: resultのキー一覧:', Object.keys(result));
        console.log('🔬 メイン: sessionId:', result.sessionId);
        console.log('🔬 メイン: createdAt:', result.createdAt);
        console.log('🔬 メイン: createdAt型:', typeof result.createdAt);
        console.log('🔬 メイン: fileIds:', result.fileIds);
        console.log('🔬 メイン: status:', result.status);
        console.log('🔬 メイン: options:', result.options);
        console.log('🔬 メイン: stats:', result.stats);
        
        // JSON化テスト
        console.log('🔬 メイン: JSON.stringify実行テスト...');
        const jsonTest = JSON.stringify(result);
        console.log('🔬 メイン: JSON化成功:', jsonTest.substring(0, 100) + '...');
        
      } else {
        console.log('🔬 メイン: result存在確認: false');
        console.log('🔬 メイン: result値そのもの:', result);
      }
    } catch (analysisError) {
      console.error('🔬 メイン: result分析中エラー:', analysisError);
      console.error('🔬 メイン: 分析エラー詳細:', analysisError.message);
    }
    console.log('🔬 メイン: ===== result詳細分析完了 =====');
    
    if (result) {
      console.log('🔬 メイン: sessionId存在:', !!result.sessionId);
      console.log('🔬 メイン: fileIds存在:', !!result.fileIds);
      console.log('🔬 メイン: sessionId値:', result.sessionId);
      
      // 安全なログ出力（循環参照対応）
      try {
        console.log('🔬 メイン: 結果の構造:', Object.keys(result));
        console.log('🔬 メイン: 最終レスポンス準備完了');
      } catch (logError) {
        console.log('🔬 メイン: ログ出力エラー（循環参照の可能性）:', logError.message);
      }
    } else {
      console.error('❌ メイン: AnalysisManagerからnull/undefinedが返されました');
      const errorResult = { success: false, error: 'AnalysisManagerが無効な結果を返しました' };
      console.log('🔬 メイン: エラーレスポンス返却:', JSON.stringify(errorResult));
      return errorResult;
    }
    
    console.log('🔬 メイン: ===== 正常完了 - 結果を返却 =====');
    
    // フロントエンド用にシリアライズ可能な形式に変換
    const serializedResult = {
      sessionId: result.sessionId,
      createdAt: result.createdAt ? result.createdAt.toISOString() : null,
      fileIds: result.fileIds,
      status: result.status,
      options: {
        multiFileMode: result.options?.multiFileMode || false,
        autoCleanup: result.options?.autoCleanup || true,
        maxQuestions: result.options?.maxQuestions || 50
      },
      stats: result.stats || {
        totalQuestions: 0,
        totalResponseTime: 0,
        errors: 0
      }
    };
    
    console.log('🔬 メイン: シリアライズ結果:', JSON.stringify(serializedResult));
    return serializedResult;
    
  } catch (error) {
    console.error('❌ メイン: ===== 例外エラー発生 =====');
    console.error('❌ エラー:', error);
    console.error('❌ エラータイプ:', typeof error);
    console.error('❌ エラーメッセージ:', error.message);
    console.error('❌ エラースタック:', error.stack);
    console.error('❌ エラー名:', error.name);
    
    const errorResult = { 
      success: false, 
      error: error.message || '解析セッション作成で不明なエラーが発生しました',
      details: error.stack,
      errorType: typeof error,
      errorName: error.name
    };
    
    console.log('🔬 メイン: 例外エラーレスポンス返却:', JSON.stringify(errorResult));
    console.log('🔬 メイン: ===== 例外エラー処理完了 =====');
    return errorResult;
  }
}

// フロントエンド用の公開関数（フロントエンドから呼び出される）
function createAnalysisSession(fileIds, options = {}) {
  console.log('🔗 API: createAnalysisSession呼び出し開始');
  console.log('🔗 API: startFileAnalysisSessionへリダイレクト');
  const result = startFileAnalysisSession(fileIds, options);
  console.log('🔗 API: startFileAnalysisSessionから結果受信:', !!result);
  return result;
}

/**
 * ファイル解析準備
 * @param {Object} analysisSession 解析セッション
 * @param {number} fileIndex ファイルインデックス
 * @returns {Object} 準備結果
 */
function prepareFileForAnalysis(analysisSession, fileIndex = null) {
  try {
    console.log('📤 メイン: ファイル解析準備開始');
    console.log('📤 メイン: 受信したセッション:', analysisSession ? analysisSession.sessionId : 'null');
    console.log('📤 メイン: ファイルインデックス:', fileIndex);
    
    // 入力値検証
    if (!analysisSession) {
      console.error('❌ 解析セッションが未定義です');
      return { success: false, error: '解析セッションが指定されていません' };
    }
    
    if (!analysisSession.sessionId) {
      console.error('❌ セッションIDが無効です');
      return { success: false, error: 'セッションIDが無効です' };
    }
    
    const result = AnalysisManager.prepareFileForAnalysis(analysisSession, fileIndex);
    console.log('📤 メイン: ファイル解析準備完了');
    
    return result;
  } catch (error) {
    console.error('❌ メイン: ファイル解析準備エラー:', error);
    console.error('❌ エラースタック:', error.stack);
    
    return { 
      success: false, 
      error: error.message || 'ファイル解析準備で不明なエラーが発生しました',
      details: error.stack
    };
  }
}

/**
 * 解析質問処理
 * @param {Object} analysisSession 解析セッション
 * @param {string} question 質問内容
 * @param {number} fileIndex ファイルインデックス
 * @returns {Object} 質問応答結果
 */
function processAnalysisQuestion(analysisSession, question, fileIndex = null) {
  try {
    console.log(`❓ メイン: 解析質問処理開始 "${question.substring(0, 30)}..."`);
    console.log('❓ メイン: セッション:', analysisSession ? analysisSession.sessionId : 'null');
    console.log('❓ メイン: fileIndex:', fileIndex);
    console.log('❓ メイン: セッション詳細:', JSON.stringify({
      sessionId: analysisSession?.sessionId,
      status: analysisSession?.status,
      fileIds: analysisSession?.fileIds,
      chatSessions: analysisSession?.chatSessions?.length || 0,
      uploadedFiles: analysisSession?.uploadedFiles?.length || 0
    }));
    
    // 利用統計ログ記録
    DatabaseManager.logUsageStats('ai_question', {
      action: 'process_analysis_question',
      sessionId: analysisSession?.sessionId,
      question: question.substring(0, 50),
      timestamp: new Date().toISOString()
    });
    
    // 入力値検証
    if (!analysisSession) {
      console.error('❌ 解析セッションが未定義です');
      return { success: false, error: '解析セッションが指定されていません' };
    }
    
    if (!question || question.trim() === '') {
      console.error('❌ 質問が空です');
      return { success: false, error: '質問内容が指定されていません' };
    }
    
    // AnalysisManager存在確認
    if (typeof AnalysisManager === 'undefined') {
      console.error('❌ AnalysisManagerが未定義です');
      return { success: false, error: 'AnalysisManagerクラスがロードされていません' };
    }
    
    if (typeof AnalysisManager.processQuestion !== 'function') {
      console.error('❌ AnalysisManager.processQuestionが関数ではありません');
      return { success: false, error: 'processQuestionメソッドが見つかりません' };
    }
    
    console.log('❓ メイン: AnalysisManager.processQuestion呼び出し前');
    const result = AnalysisManager.processQuestion(analysisSession, question, fileIndex);
    console.log('❓ メイン: AnalysisManager.processQuestion呼び出し後');
    console.log('❓ メイン: 結果の型:', typeof result);
    console.log('❓ メイン: 結果がnull/undefined:', result === null || result === undefined);
    
    if (result === null || result === undefined) {
      console.error('❌ AnalysisManager.processQuestionがnull/undefinedを返しました');
      return { success: false, error: 'AnalysisManagerからnullレスポンスを受信' };
    }
    
    // レスポンスサイズ制限対策 - google.script.run通信制限回避
    if (result.response && result.response.length > 1500) {
      console.log('⚠️ レスポンスが長すぎるため切り詰め:', result.response.length);
      result.response = result.response.substring(0, 1500) + '\n\n[回答が長いため省略されました。詳細は履歴から確認してください]';
      result.truncated = true;
    }
    
    // JSONシリアライゼーション可能性チェック
    let jsonTestResult;
    try {
      jsonTestResult = JSON.stringify(result);
      console.log('❓ メイン: JSON変換成功、サイズ:', jsonTestResult.length);
    } catch (jsonError) {
      console.error('❌ JSON変換エラー:', jsonError);
      return { 
        success: false, 
        error: 'レスポンスのJSON変換に失敗: ' + jsonError.message,
        originalResult: result.success || false
      };
    }
    
    // 安全なレスポンスオブジェクト作成
    const safeResult = {
      success: result.success,
      sessionId: result.sessionId,
      fileIndex: result.fileIndex,
      fileName: result.fileName,
      question: result.question,
      response: result.response,
      responseTime: result.responseTime,
      questionNumber: result.questionNumber,
      timestamp: result.timestamp ? result.timestamp.toISOString() : new Date().toISOString(),
      truncated: result.truncated || false
    };
    
    console.log('❓ メイン: 安全なレスポンス作成完了、サイズ:', JSON.stringify(safeResult).length);
    
    console.log('❓ メイン: 解析質問処理完了 - 正常レスポンス返却');
    return safeResult;
  } catch (error) {
    console.error('❌ メイン: 解析質問処理エラー:', error);
    console.error('❌ エラースタック:', error.stack);
    console.error('❌ エラー発生箇所の詳細:', {
      message: error.message,
      name: error.name,
      line: error.lineNumber || 'unknown'
    });
    
    return { 
      success: false, 
      error: error.message || '質問処理で不明なエラーが発生しました',
      details: error.stack
    };
  }
}

/**
 * 解析セッション履歴取得
 * @param {Object} analysisSession 解析セッション
 * @param {Object} options 取得オプション
 * @returns {Object} セッション履歴
 */
function getAnalysisSessionHistory(analysisSession, options = {}) {
  try {
    console.log('📋 メイン: 解析セッション履歴取得開始');
    const result = AnalysisManager.getSessionHistory(analysisSession, options);
    console.log('📋 メイン: 解析セッション履歴取得完了');
    return result;
  } catch (error) {
    console.error('❌ メイン: 解析セッション履歴取得エラー:', error);
    return ErrorHandler.handleError(error, 'メイン解析履歴取得', {
      returnResult: { success: false, error: error.message }
    });
  }
}

/**
 * 解析セッションクリーンアップ
 * @param {Object} analysisSession 解析セッション
 * @param {boolean} deleteFiles File APIからファイルを削除するか
 */
function cleanupAnalysisSession(analysisSession, deleteFiles = false) {
  try {
    console.log('🧹 メイン: 解析セッションクリーンアップ開始');
    AnalysisManager.cleanupSession(analysisSession, deleteFiles);
    console.log('🧹 メイン: 解析セッションクリーンアップ完了');
  } catch (error) {
    console.error('❌ メイン: 解析セッションクリーンアップエラー:', error);
  }
}

// ===== 設定・管理関数 =====

/**
 * APIキー設定
 * @returns {boolean} 設定成功かどうか
 */
function setApiKeys() {
  try {
    console.log('🔧 メイン: APIキー設定開始');
    const result = ConfigManager.setApiKeys();
    console.log('🔧 メイン: APIキー設定完了');
    return result;
  } catch (error) {
    console.error('❌ メイン: APIキー設定エラー:', error);
    return false;
  }
}

/**
 * ID設定（スプレッドシート、フォルダ）
 * @returns {boolean} 設定成功かどうか
 */
function setupIds() {
  try {
    console.log('🔧 メイン: ID設定開始');
    const result = ConfigManager.setupIds();
    console.log('🔧 メイン: ID設定完了');
    return result;
  } catch (error) {
    console.error('❌ メイン: ID設定エラー:', error);
    return false;
  }
}

/**
 * システム設定確認
 */
function checkSetup() {
  try {
    console.log('🔧 メイン: 設定確認開始');
    ConfigManager.checkSetup();
    console.log('🔧 メイン: 設定確認完了');
  } catch (error) {
    console.error('❌ メイン: 設定確認エラー:', error);
  }
}

/**
 * 設定取得
 * @returns {Object} 設定オブジェクト
 */
function getConfig() {
  try {
    return ConfigManager.getConfig();
  } catch (error) {
    console.error('❌ メイン: 設定取得エラー:', error);
    return {};
  }
}

// ===== デバッグ・テスト関数 =====

/**
 * スプレッドシート構造デバッグ
 */
function debugSpreadsheetStructure() {
  try {
    console.log('🔧 メイン: スプレッドシート構造デバッグ開始');
    const config = ConfigManager.getConfig();
    DatabaseManager.debugSpreadsheetStructure(config.spreadsheetId);
    console.log('🔧 メイン: スプレッドシート構造デバッグ完了');
  } catch (error) {
    console.error('❌ メイン: スプレッドシート構造デバッグエラー:', error);
  }
}

/**
 * スプレッドシート構造修正
 */
function fixSpreadsheetStructure() {
  try {
    console.log('🔧 メイン: スプレッドシート構造修正開始');
    const config = ConfigManager.getConfig();
    DatabaseManager.fixSpreadsheetStructure(config.spreadsheetId);
    console.log('🔧 メイン: スプレッドシート構造修正完了');
  } catch (error) {
    console.error('❌ メイン: スプレッドシート構造修正エラー:', error);
  }
}

/**
 * Gemini API接続テスト
 */
function testGemini() {
  try {
    console.log('🤖 メイン: Gemini接続テスト開始');
    const config = ConfigManager.getConfig();
    
    if (!config.geminiApiKey) {
      console.error('❌ Gemini APIキーが設定されていません');
      throw new Error('Gemini APIキーが設定されていません');
    }
    
    console.log('🔑 APIキー確認: ✅');
    console.log(`キー形式: ${config.geminiApiKey.substring(0, 10)}...`);
    
    const testSummary = DocumentProcessor.generateDocumentSummary(
      'テスト住宅_平面図.pdf',
      'リビング 15畳 キッチン 対面式 寝室 8畳 バルコニー 南向き 木造2階建て',
      config.geminiApiKey
    );
    
    console.log('✅ Gemini接続テスト成功');
    console.log('テスト要約結果:', testSummary);
    
  } catch (error) {
    console.error('❌ メイン: Gemini接続テストエラー:', error);
    throw error;
  }
  
  console.log('🤖 メイン: Gemini接続テスト完了');
}

/**
 * 段階的システムテスト
 */
function runStepByStepTest() {
  try {
    console.log('🧪 メイン: ===== 段階的テスト開始 =====');
    
    console.log('📋 ステップ1: 設定確認');
    checkSetup();
    
    console.log('\n📋 ステップ2: スプレッドシート構造確認');
    debugSpreadsheetStructure();
    
    console.log('\n📋 ステップ3: 検索機能テスト');
    const testResults = searchDocuments('');
    console.log(`検索テスト結果: ${testResults.length}件`);
    
    console.log('\n📋 ステップ4: Gemini接続テスト');
    testGemini();
    
    console.log('\n📋 ステップ5: データベース健全性チェック');
    const config = ConfigManager.getConfig();
    const healthCheck = DatabaseManager.performHealthCheck(config.spreadsheetId);
    console.log('健全性チェック結果:', healthCheck);
    
    console.log('\n✅ 全ステップ正常完了');
    
  } catch (error) {
    console.error('❌ テスト中にエラーが発生:', error);
    console.error('詳細:', error.message);
    console.error('スタック:', error.stack);
  }
  
  console.log('🧪 メイン: ===== 段階的テスト完了 =====');
}

/**
 * 簡単な通信テスト
 * @returns {Object} テスト結果
 */
function testConnection() {
  try {
    console.log('📡 メイン: 通信テスト開始');
    const result = {
      status: 'success',
      message: 'GASとの通信は正常です',
      timestamp: new Date().toLocaleString(),
      version: 'リファクタリング版 v2.0'
    };
    console.log('📡 メイン: 通信テスト完了');
    return result;
  } catch (error) {
    console.error('❌ メイン: 通信テストエラー:', error);
    return {
      status: 'error',
      message: error.message,
      timestamp: new Date().toLocaleString()
    };
  }
}

/**
 * 簡単な検索テスト
 * @returns {Array} 検索結果
 */
function testSimpleSearch() {
  try {
    console.log('🔍 メイン: 簡単な検索テスト開始');
    const result = searchDocuments('全文');
    console.log('🔍 メイン: 検索テスト結果:', result);
    console.log('結果の型:', typeof result);
    console.log('結果が配列?:', Array.isArray(result));
    console.log('結果の長さ:', result ? result.length : 'N/A');
    return result;
  } catch (error) {
    console.error('❌ メイン: 簡単な検索テストエラー:', error);
    return [];
  }
}

/**
 * データ型チェック専用関数
 * @param {string} query 検索クエリ
 * @returns {Object} バリデーション結果
 */
function validateSearchResult(query) {
  try {
    console.log('🔍 メイン: データ型チェック開始:', query);
    
    const result = searchDocuments(query);
    
    console.log('📊 バックエンド結果の詳細分析:');
    console.log('- 型:', typeof result);
    console.log('- 配列?:', Array.isArray(result));
    console.log('- 長さ:', result ? result.length : 'N/A');
    console.log('- 内容:', JSON.stringify(result, null, 2));
    
    if (Array.isArray(result)) {
      result.forEach((item, index) => {
        console.log(`結果${index}:`, {
          fileName: typeof item.fileName,
          extractedText: typeof item.extractedText,
          aiSummary: typeof item.aiSummary,
          fileId: typeof item.fileId,
          updateDate: typeof item.updateDate,
          fileType: typeof item.fileType,
          viewUrl: typeof item.viewUrl
        });
      });
    }
    
    return {
      success: true,
      result: result,
      analysis: {
        type: typeof result,
        isArray: Array.isArray(result),
        length: result ? result.length : 0
      }
    };
    
  } catch (error) {
    console.error('❌ メイン: データ型チェックエラー:', error);
    return {
      success: false,
      error: error.message,
      analysis: null
    };
  }
}

/**
 * クイックテスト（簡易動作確認）
 */
function quickTest() {
  try {
    console.log('⚡ メイン: ===== クイックテスト =====');
    checkSetup();
    
    const config = ConfigManager.getConfig();
    if (config.folderId) {
      try {
        const folder = DriveApp.getFolderById(config.folderId);
        console.log('フォルダ名:', folder.getName());
        
        const files = folder.getFiles();
        let count = 0;
        while (files.hasNext() && count < 3) {
          console.log('ファイル例:', files.next().getName());
          count++;
        }
      } catch (error) {
        console.error('フォルダアクセスエラー:', error);
      }
    }
    
    console.log('⚡ メイン: ===== クイックテスト完了 =====');
  } catch (error) {
    console.error('❌ メイン: クイックテストエラー:', error);
  }
}

// ===== 後方互換性関数 =====

/**
 * 後方互換性: 旧関数名をサポート
 */
function analyzeDrawings() {
  return analyzeDocuments();
}

function searchDrawings(query) {
  return searchDocuments(query);
}

/**
 * JPEG処理テスト関数（UI呼び出し用）
 */
function testJpegProcessing() {
  // tests/TestAI.gs の関数を呼び出し
  const result = (function() {
    try {
      console.log('📸 ===== JPEG画像処理テスト開始 =====');
      
      console.log('📋 ステップ1: 設定確認');
      const config = ConfigManager.getConfig();
      if (!config.folderId) {
        console.error('❌ フォルダIDが設定されていません');
        return { success: false, error: 'フォルダID未設定' };
      }
      
      console.log('📁 ステップ2: フォルダ内JPEG画像検索');
      const folder = DriveApp.getFolderById(config.folderId);
      const files = folder.getFiles();
      
      let jpegFiles = [];
      while (files.hasNext()) {
        const file = files.next();
        const mimeType = file.getBlob().getContentType();
        if (mimeType === MimeType.JPEG || mimeType === 'image/jpeg') {
          jpegFiles.push({
            file: file,
            name: file.getName(),
            size: file.getSize(),
            mimeType: mimeType
          });
        }
      }
      
      console.log(`📊 JPEG画像検出結果: ${jpegFiles.length}件`);
      jpegFiles.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.name} (${Utils.formatFileSize(item.size)})`);
      });
      
      if (jpegFiles.length === 0) {
        console.log('⚠️ JPEG画像が見つかりませんでした。');
        return { success: true, jpegCount: 0, message: 'JPEG画像なし' };
      }
      
      console.log('✅ JPEG処理機能有効化完了');
      return {
        success: true,
        jpegCount: jpegFiles.length,
        message: `JPEG処理準備完了 (${jpegFiles.length}件検出)`
      };
      
    } catch (error) {
      console.error('❌ JPEG処理テストエラー:', error);
      return { success: false, error: error.message };
    }
  })();
  
  return result;
}

/**
 * JPEG処理詳細テスト（ラベル検出機能確認用）
 */
function testJpegProcessingDetailed() {
  console.log('📸 ===== JPEG画像処理詳細テスト開始 =====');
  
  try {
    console.log('📋 ステップ1: 設定確認');
    const config = ConfigManager.getConfig();
    if (!config.folderId || !config.visionApiKey) {
      return { success: false, error: '設定不備: フォルダIDまたはVision APIキーが未設定' };
    }
    
    console.log('📁 ステップ2: JPEG画像検索');
    const folder = DriveApp.getFolderById(config.folderId);
    const files = folder.getFiles();
    
    let jpegFiles = [];
    while (files.hasNext()) {
      const file = files.next();
      const mimeType = file.getBlob().getContentType();
      if (mimeType === MimeType.JPEG || mimeType === 'image/jpeg') {
        jpegFiles.push(file);
        if (jpegFiles.length >= 3) break; // 最大3ファイル
      }
    }
    
    if (jpegFiles.length === 0) {
      return { success: false, error: 'テスト用JPEG画像が見つかりません' };
    }
    
    console.log(`🎯 テスト対象: ${jpegFiles.length}ファイル`);
    
    const results = [];
    
    for (let i = 0; i < jpegFiles.length; i++) {
      const file = jpegFiles[i];
      console.log(`📸 ${i + 1}/${jpegFiles.length}: ${file.getName()} 処理開始`);
      
      try {
        const extractedText = DocumentProcessor.extractTextFromFile(
          file, 
          config.visionApiKey, 
          MimeType.JPEG
        );
        
        console.log(`✅ 処理完了: ${extractedText.length}文字抽出`);
        
        // ラベル検出情報の確認
        const hasLabels = extractedText.includes('画像内容:');
        const hasColors = extractedText.includes('主要色:');
        
        results.push({
          fileName: file.getName(),
          fileSize: Utils.formatFileSize(file.getSize()),
          extractedLength: extractedText.length,
          hasLabels: hasLabels,
          hasColors: hasColors,
          preview: extractedText.substring(0, 200) + (extractedText.length > 200 ? '...' : ''),
          extractedText: extractedText // 完全版
        });
        
        console.log(`  📊 ラベル検出: ${hasLabels ? '✅' : '❌'}`);
        console.log(`  🎨 色情報: ${hasColors ? '✅' : '❌'}`);
        
      } catch (error) {
        console.error(`❌ ${file.getName()} 処理エラー:`, error);
        results.push({
          fileName: file.getName(),
          error: error.message
        });
      }
      
      // API制限対策
      if (i < jpegFiles.length - 1) {
        Utilities.sleep(2000);
      }
    }
    
    console.log('🎊 JPEG処理詳細テスト完了');
    return {
      success: true,
      testCount: jpegFiles.length,
      results: results,
      summary: {
        totalFiles: results.length,
        successFiles: results.filter(r => !r.error).length,
        withLabels: results.filter(r => r.hasLabels).length,
        withColors: results.filter(r => r.hasColors).length
      }
    };
    
  } catch (error) {
    console.error('❌ JPEG詳細テストエラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * PDF処理詳細テスト（ラベル検出機能確認用）
 */

function testPdfProcessingDetailed() {
  console.log('📄 ===== PDF処理詳細テスト開始 =====');
  
  try {
    console.log('📋 ステップ1: 設定確認');
    const config = ConfigManager.getConfig();
    if (!config.folderId || !config.visionApiKey) {
      return { success: false, error: '設定不備: フォルダIDまたはVision APIキーが未設定' };
    }
    
    console.log('📁 ステップ2: PDF検索');
    const folder = DriveApp.getFolderById(config.folderId);
    const files = folder.getFiles();
    
    let pdfFiles = [];
    while (files.hasNext()) {
      const file = files.next();
      const mimeType = file.getBlob().getContentType();
      if (mimeType === MimeType.PDF || mimeType === 'application/pdf') {
        pdfFiles.push(file);
        if (pdfFiles.length >= 3) break; // 最大3ファイル
      }
    }
    
    if (pdfFiles.length === 0) {
      return { success: false, error: 'テスト用PDFファイルが見つかりません' };
    }
    
    console.log(`🎯 テスト対象: ${pdfFiles.length}ファイル`);
    
    const results = [];
    
    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      console.log(`📄 ${i + 1}/${pdfFiles.length}: ${file.getName()} 処理開始`);
      
      try {
        const extractedText = DocumentProcessor.extractTextFromFile(
          file, 
          config.visionApiKey, 
          MimeType.PDF
        );
        
        console.log(`✅ 処理完了: ${extractedText.length}文字抽出`);
        
        // PDF処理結果の確認（テキスト検出専用）
        const isFileBasedFallback = extractedText.includes('PDFファイル:');
        const isTextDetectionFallback = extractedText.includes('PDF フォールバック処理成功');
        
        // PDF処理レベルの判定
        let processingLevel = 'unknown';
        if (!isFileBasedFallback && !isTextDetectionFallback) {
          processingLevel = 'document_text_success'; // 文書テキスト検出成功
        } else if (isTextDetectionFallback) {
          processingLevel = 'text_fallback'; // TEXT_DETECTIONフォールバック
        } else {
          processingLevel = 'filename_fallback'; // ファイル名ベース
        }
        
        results.push({
          fileName: file.getName(),
          fileSize: Utils.formatFileSize(file.getSize()),
          extractedLength: extractedText.length,
          isVisionApiSuccess: !isFileBasedFallback,
          processingLevel: processingLevel,
          preview: extractedText.substring(0, 200) + (extractedText.length > 200 ? '...' : ''),
          extractedText: extractedText // 完全版
        });
        
        console.log(`  🔍 処理レベル: ${processingLevel}`);
        console.log(`  📄 Vision API成功: ${!isFileBasedFallback ? '✅' : '❌'}`);
        
      } catch (error) {
        console.error(`❌ ${file.getName()} 処理エラー:`, error);
        results.push({
          fileName: file.getName(),
          error: error.message
        });
      }
      
      // API制限対策
      if (i < pdfFiles.length - 1) {
        Utilities.sleep(3000); // PDFは処理重いため3秒間隔
      }
    }
    
    console.log('🎊 PDF処理詳細テスト完了');
    return {
      success: true,
      testCount: pdfFiles.length,
      results: results,
      summary: {
        totalFiles: results.length,
        successFiles: results.filter(r => !r.error).length,
        visionApiSuccess: results.filter(r => r.isVisionApiSuccess).length,
        documentTextSuccess: results.filter(r => r.processingLevel === 'document_text_success').length,
        textFallbacks: results.filter(r => r.processingLevel === 'text_fallback').length,
        filenameFallbacks: results.filter(r => r.processingLevel === 'filename_fallback').length
      }
    };
    
  } catch (error) {
    console.error('❌ PDF詳細テストエラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 全ファイル形式統合処理テスト（UI呼び出し用）
 */
function testAllFileTypesProcessing() {
  console.log('🎯 ===== 全ファイル形式統合処理テスト開始 =====');
  
  try {
    console.log('📋 DocumentProcessor.analyzeDocumentsInFolder() 実行');
    const result = DocumentProcessor.analyzeDocumentsInFolder();
    
    console.log('🎊 統合処理結果:');
    console.log('成功:', result.success);
    console.log('処理済み:', result.processed);
    console.log('スキップ:', result.skipped);
    console.log('エラー:', result.errors);
    
    return result;
    
  } catch (error) {
    console.error('❌ 統合処理テストエラー:', error);
    return { success: false, error: error.message };
  }
}

function generateDocumentSummary(fileName, extractedText, geminiApiKey) {
  return DocumentProcessor.generateDocumentSummary(fileName, extractedText, geminiApiKey);
}

/**
 * Gemini 2.0 Flash 画像処理専用テスト
 * キーワード抽出重視の画像解析確認
 */
function testImageGeminiProcessing() {
  console.log('🤖 ===== Gemini 2.0 Flash 画像処理テスト開始 =====');
  
  try {
    console.log('📋 ステップ1: 設定確認');
    const config = ConfigManager.getConfig();
    if (!config.folderId || !config.geminiApiKey) {
      return { success: false, error: '設定不備: フォルダIDまたはGemini APIキーが未設定' };
    }
    
    console.log('📁 ステップ2: テスト用画像検索');
    const folder = DriveApp.getFolderById(config.folderId);
    const files = folder.getFiles();
    
    let testImageFile = null;
    while (files.hasNext()) {
      const file = files.next();
      const mimeType = file.getBlob().getContentType();
      if (mimeType === MimeType.JPEG || mimeType === MimeType.PNG || 
          mimeType === 'image/jpeg' || mimeType === 'image/png') {
        testImageFile = file;
        break;
      }
    }
    
    if (!testImageFile) {
      return { success: false, error: 'テスト用画像ファイル（JPEG/PNG）が見つかりません' };
    }
    
    console.log(`🎯 テスト対象: ${testImageFile.getName()}`);
    console.log(`📊 ファイルサイズ: ${Utils.formatFileSize(testImageFile.getSize())}`);
    console.log(`🎨 画像形式: ${testImageFile.getBlob().getContentType()}`);
    
    console.log('🔍 ステップ3: Gemini 2.0 Flash 画像解析実行');
    const startTime = new Date();
    
    // Gemini 画像処理をテスト
    const geminiResult = DocumentProcessor.extractTextFromImageViaGemini(testImageFile, config.geminiApiKey);
    
    const endTime = new Date();
    const processingTime = (endTime - startTime) / 1000;
    
    console.log(`⏱️ 処理時間: ${processingTime}秒`);
    
    if (geminiResult && geminiResult.trim() !== '' && geminiResult !== '読み取れませんでした') {
      console.log('✅ Gemini 2.0 Flash 画像解析成功');
      console.log(`📄 抽出キーワード文字数: ${geminiResult.length}文字`);
      console.log(`📝 キーワード内容: ${geminiResult.substring(0, 300)}...`);
      
      return {
        success: true,
        fileName: testImageFile.getName(),
        fileType: testImageFile.getBlob().getContentType(),
        processingTime: processingTime,
        extractedLength: geminiResult.length,
        keywords: geminiResult.substring(0, 300),
        method: 'Gemini 2.0 Flash File API',
        isKeywordFocused: true
      };
    } else {
      console.log('⚠️ Gemini 2.0 Flash 画像解析失敗');
      
      // フォールバック処理もテスト（既存のextractTextFromImage）
      console.log('🔄 フォールバック処理テスト');
      const fallbackStartTime = new Date();
      const fallbackResult = DocumentProcessor.extractTextFromImage(testImageFile, config.visionApiKey);
      const fallbackEndTime = new Date();
      const fallbackTime = (fallbackEndTime - fallbackStartTime) / 1000;
      
      return {
        success: false,
        fileName: testImageFile.getName(),
        fileType: testImageFile.getBlob().getContentType(),
        geminiProcessingTime: processingTime,
        fallbackProcessingTime: fallbackTime,
        fallbackResult: fallbackResult ? fallbackResult.substring(0, 300) : 'フォールバックも失敗',
        error: 'Gemini 2.0 Flash 画像解析失敗、フォールバック実行'
      };
    }
    
  } catch (error) {
    console.error('❌ Gemini 2.0 Flash 画像処理テストエラー:', error);
    return { 
      success: false, 
      error: error.message,
      details: error.stack
    };
  }
}

/**
 * Gemini 2.0 Flash PDF処理専用テスト
 * キーワード抽出重視のPDF解析確認
 */
function testPdfGeminiProcessing() {
  console.log('🤖 ===== Gemini 2.0 Flash PDF処理テスト開始 =====');
  
  try {
    console.log('📋 ステップ1: 設定確認');
    const config = ConfigManager.getConfig();
    if (!config.folderId || !config.geminiApiKey) {
      return { success: false, error: '設定不備: フォルダIDまたはGemini APIキーが未設定' };
    }
    
    console.log('📁 ステップ2: テスト用PDF検索');
    const folder = DriveApp.getFolderById(config.folderId);
    const files = folder.getFiles();
    
    let testPdfFile = null;
    while (files.hasNext()) {
      const file = files.next();
      const mimeType = file.getBlob().getContentType();
      if (mimeType === MimeType.PDF || mimeType === 'application/pdf') {
        testPdfFile = file;
        break;
      }
    }
    
    if (!testPdfFile) {
      return { success: false, error: 'テスト用PDFファイルが見つかりません' };
    }
    
    console.log(`🎯 テスト対象: ${testPdfFile.getName()}`);
    console.log(`📊 ファイルサイズ: ${Utils.formatFileSize(testPdfFile.getSize())}`);
    
    console.log('🔍 ステップ3: Gemini 2.0 Flash PDF解析実行');
    const startTime = new Date();
    
    // Gemini PDF処理をテスト
    const geminiResult = DocumentProcessor.extractTextFromPdfViaGemini(testPdfFile, config.geminiApiKey);
    
    const endTime = new Date();
    const processingTime = (endTime - startTime) / 1000;
    
    console.log(`⏱️ 処理時間: ${processingTime}秒`);
    
    if (geminiResult && geminiResult.trim() !== '' && geminiResult !== '読み取れませんでした') {
      console.log('✅ Gemini 2.0 Flash PDF解析成功');
      console.log(`📄 抽出キーワード文字数: ${geminiResult.length}文字`);
      console.log(`📝 キーワード内容: ${geminiResult.substring(0, 300)}...`);
      
      return {
        success: true,
        fileName: testPdfFile.getName(),
        processingTime: processingTime,
        extractedLength: geminiResult.length,
        keywords: geminiResult.substring(0, 300),
        method: 'Gemini 2.0 Flash File API',
        isKeywordFocused: true
      };
    } else {
      console.log('⚠️ Gemini 2.0 Flash PDF解析失敗');
      
      // フォールバック処理もテスト（既存のextractTextFromPDF）
      console.log('🔄 フォールバック処理テスト');
      const fallbackStartTime = new Date();
      const fallbackResult = DocumentProcessor.extractTextFromPDF(testPdfFile, config.visionApiKey);
      const fallbackEndTime = new Date();
      const fallbackTime = (fallbackEndTime - fallbackStartTime) / 1000;
      
      return {
        success: false,
        fileName: testPdfFile.getName(),
        geminiProcessingTime: processingTime,
        fallbackProcessingTime: fallbackTime,
        fallbackResult: fallbackResult ? fallbackResult.substring(0, 300) : 'フォールバックも失敗',
        error: 'Gemini 2.0 Flash PDF解析失敗、フォールバック実行'
      };
    }
    
  } catch (error) {
    console.error('❌ Gemini 2.0 Flash PDF処理テストエラー:', error);
    return { 
      success: false, 
      error: error.message,
      details: error.stack
    };
  }
}


/**
 * Gemini 2.5 Flash統一テスト
 * 新規ドキュメント解析とAI解析の統一確認
 */
function testGeminiModelUnification() {
  console.log('🚀 ===== Gemini 2.5 Flash統一テスト開始 =====');
  
  try {
    console.log('📋 ステップ1: 現在の設定確認');
    console.log('現在のモデル:', ConfigManager.getGeminiModel());
    console.log('APIエンドポイント:', ConfigManager.getGeminiApiEndpoint());
    
    console.log('\n📋 ステップ2: デフォルトモデル確認');
    const defaultModel = ConfigManager.getGeminiModel();
    if (defaultModel === 'gemini-2.5-flash') {
      console.log('✅ Gemini 2.5 Flash統一完了');
    } else {
      console.log('❌ モデル不一致:', defaultModel);
    }
    
    console.log('\n📋 ステップ3: 新規ドキュメント解析モデル確認');
    // DocumentProcessor で使用されるモデルをテスト
    const testPrompt = DocumentProcessor.createSummaryPrompt('test.pdf', 'テストテキスト');
    console.log('✅ プロンプト生成成功');
    
    console.log('\n📋 ステップ4: AI解析モデル確認');
    // GeminiFileAPI で使用されるモデルをテスト（ConfigManager.getGeminiModel()を使用）
    const apiEndpoint = ConfigManager.getGeminiApiEndpoint();
    console.log('API エンドポイント:', apiEndpoint);
    
    return {
      success: defaultModel === 'gemini-2.5-flash',
      currentModel: defaultModel,
      endpoint: apiEndpoint,
      isUnified: true,
      message: 'Gemini 2.5 Flash統一テスト完了'
    };
    
  } catch (error) {
    console.error('❌ Gemini統一テストエラー:', error);
    return { 
      success: false, 
      error: error.message,
      currentModel: ConfigManager.getGeminiModel()
    };
  }
}

/**
 * Gemini 2.0 Flash移行テスト
 * モデル切り替え・フォールバック機能の確認
 */
function testGemini2Migration() {
  console.log('🚀 ===== Gemini 2.0 Flash移行テスト開始 =====');
  
  try {
    console.log('📋 ステップ1: 現在の設定確認');
    console.log('現在のモデル:', ConfigManager.getGeminiModel());
    console.log('APIエンドポイント:', ConfigManager.getGeminiApiEndpoint());
    
    console.log('\n📋 ステップ2: 設定テスト');
    ConfigManager.checkSetup();
    
    console.log('\n📋 ステップ3: モデル切り替えテスト');
    const originalModel = ConfigManager.getGeminiModel();
    
    // 2.0 Flashに設定
    ConfigManager.setGeminiModel('gemini-2.0-flash-exp');
    console.log('✅ Gemini 2.0設定:', ConfigManager.getGeminiModel());
    
    // 2.0 Flashに戻すテスト
    ConfigManager.setGeminiModel('gemini-2.0-flash');
    console.log('✅ Gemini 1.5設定:', ConfigManager.getGeminiModel());
    
    // 元の設定に戻す
    ConfigManager.setGeminiModel(originalModel);
    console.log('✅ 元設定復元:', ConfigManager.getGeminiModel());
    
    console.log('\n📋 ステップ4: 基本接続テスト');
    const config = ConfigManager.getConfig();
    if (!config.geminiApiKey) {
      throw new Error('Gemini APIキーが設定されていません');
    }
    
    console.log('🎊 Gemini 2.0移行テスト完了');
    return {
      success: true,
      currentModel: ConfigManager.getGeminiModel(),
      endpoint: ConfigManager.getGeminiApiEndpoint(),
      configValid: true
    };
    
  } catch (error) {
    console.error('❌ Gemini 2.0移行テストエラー:', error);
    return { 
      success: false, 
      error: error.message,
      currentModel: ConfigManager.getGeminiModel()
    };
  }
}

/**
 * Geminiモデル性能比較テスト
 * 2.0 Flash vs 2.0 Flash の比較
 */
function compareGeminiModels() {
  console.log('⚖️ ===== Geminiモデル性能比較テスト開始 =====');
  
  try {
    const config = ConfigManager.getConfig();
    if (!config.folderId || !config.geminiApiKey) {
      return { success: false, error: '設定不備: フォルダIDまたはGemini APIキーが未設定' };
    }
    
    console.log('📁 テストファイル検索中...');
    const folder = DriveApp.getFolderById(config.folderId);
    const files = folder.getFiles();
    
    let testFile = null;
    while (files.hasNext()) {
      const file = files.next();
      const mimeType = file.getBlob().getContentType();
      if (mimeType === MimeType.JPEG || mimeType === MimeType.PNG || mimeType === MimeType.PDF) {
        testFile = file;
        break;
      }
    }
    
    if (!testFile) {
      return { success: false, error: 'テストファイルが見つかりません' };
    }
    
    console.log(`🎯 テスト対象: ${testFile.getName()}`);
    
    const results = {
      fileName: testFile.getName(),
      fileType: testFile.getBlob().getContentType(),
      models: {}
    };
    
    // Gemini 2.0 Flash テスト
    console.log('\n📊 Gemini 2.0 Flash テスト...');
    ConfigManager.setGeminiModel('gemini-2.0-flash');
    const startTime1_5 = new Date();
    
    let result1_5;
    try {
      if (testFile.getBlob().getContentType() === MimeType.PDF) {
        result1_5 = DocumentProcessor.extractTextFromPDF(testFile, config.visionApiKey);
      } else {
        result1_5 = DocumentProcessor.extractTextFromImage(testFile, config.visionApiKey);
      }
      const endTime1_5 = new Date();
      
      results.models['gemini-2.0-flash'] = {
        success: true,
        processingTime: (endTime1_5 - startTime1_5) / 1000,
        responseLength: result1_5 ? result1_5.length : 0,
        response: result1_5 ? result1_5.substring(0, 200) : '失敗'
      };
    } catch (error1_5) {
      results.models['gemini-2.0-flash'] = {
        success: false,
        error: error1_5.message
      };
    }
    
    // 少し待機
    Utilities.sleep(3000);
    
    // Gemini 2.0 Flash テスト
    console.log('\n📊 Gemini 2.0 Flash テスト...');
    ConfigManager.setGeminiModel('gemini-2.0-flash-exp');
    const startTime2_0 = new Date();
    
    let result2_0;
    try {
      if (testFile.getBlob().getContentType() === MimeType.PDF) {
        result2_0 = DocumentProcessor.extractTextFromPDF(testFile, config.visionApiKey);
      } else {
        result2_0 = DocumentProcessor.extractTextFromImage(testFile, config.visionApiKey);
      }
      const endTime2_0 = new Date();
      
      results.models['gemini-2.0-flash-exp'] = {
        success: true,
        processingTime: (endTime2_0 - startTime2_0) / 1000,
        responseLength: result2_0 ? result2_0.length : 0,
        response: result2_0 ? result2_0.substring(0, 200) : '失敗'
      };
    } catch (error2_0) {
      results.models['gemini-2.0-flash-exp'] = {
        success: false,
        error: error2_0.message
      };
    }
    
    console.log('🎊 性能比較テスト完了');
    results.success = true;
    return results;
    
  } catch (error) {
    console.error('❌ 性能比較テストエラー:', error);
    return { 
      success: false, 
      error: error.message
    };
  }
}

// ===== システム情報関数 =====

/**
 * システム情報を取得
 * @returns {Object} システム情報
 */
function getSystemInfo() {
  try {
    const config = ConfigManager.getConfig();
    const limits = ConfigManager.getApiLimits();
    const schema = ConfigManager.getSpreadsheetSchema();
    
    return {
      version: 'リファクタリング版 v2.0',
      timestamp: new Date().toLocaleString(),
      config: {
        hasVisionApi: !!config.visionApiKey,
        hasGeminiApi: !!config.geminiApiKey,
        hasSpreadsheet: !!config.spreadsheetId,
        hasFolder: !!config.folderId
      },
      limits: limits,
      schema: schema,
      modules: [
        'ConfigManager',
        'Utils',
        'ErrorHandler',
        'SearchEngine',
        'DocumentProcessor',
        'DatabaseManager'
      ]
    };
  } catch (error) {
    console.error('❌ メイン: システム情報取得エラー:', error);
    return {
      version: 'リファクタリング版 v2.0',
      error: error.message,
      timestamp: new Date().toLocaleString()
    };
  }
}

// ===== 利用統計機能 =====

/**
 * 利用統計手動テスト（デバッグ用）
 * @returns {Object} テスト結果
 */
function testUsageStatsSystem() {
  try {
    console.log('📊 ===== 利用統計システムテスト開始 =====');
    
    const results = {
      timestamp: new Date().toISOString(),
      tests: {},
      errors: []
    };
    
    // 1. 設定確認
    console.log('📋 ステップ1: 設定確認');
    const config = ConfigManager.getConfig();
    results.tests.configCheck = {
      hasSpreadsheetId: !!config.spreadsheetId,
      spreadsheetId: config.spreadsheetId ? config.spreadsheetId.substring(0, 10) + '...' : 'なし'
    };
    
    if (!config.spreadsheetId) {
      results.errors.push('スプレッドシートIDが未設定');
      return results;
    }
    
    // 2. 手動ログ記録テスト
    console.log('📋 ステップ2: 手動ログ記録テスト');
    try {
      DatabaseManager.logUsageStats('search', {
        action: 'test_manual_log',
        query: 'テスト検索',
        timestamp: new Date().toISOString()
      });
      results.tests.manualLogTest = { success: true };
      console.log('✅ 手動ログ記録成功');
    } catch (logError) {
      results.tests.manualLogTest = { success: false, error: logError.message };
      results.errors.push('手動ログ記録エラー: ' + logError.message);
      console.error('❌ 手動ログ記録エラー:', logError);
    }
    
    // 3. 統計取得テスト
    console.log('📋 ステップ3: 統計取得テスト');
    try {
      const todayStats = DatabaseManager.getUsageStats('today');
      results.tests.statsRetrieval = {
        success: todayStats.success,
        hasData: todayStats.data && todayStats.data.length > 0,
        summary: todayStats.summary,
        error: todayStats.error
      };
      console.log('✅ 統計取得テスト結果:', todayStats);
    } catch (statsError) {
      results.tests.statsRetrieval = { success: false, error: statsError.message };
      results.errors.push('統計取得エラー: ' + statsError.message);
      console.error('❌ 統計取得エラー:', statsError);
    }
    
    // 4. スプレッドシート直接確認
    console.log('📋 ステップ4: スプレッドシート直接確認');
    try {
      const spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
      const sheets = spreadsheet.getSheets();
      const sheetNames = sheets.map(sheet => sheet.getName());
      
      results.tests.spreadsheetCheck = {
        totalSheets: sheets.length,
        sheetNames: sheetNames,
        hasUsageStatsSheet: sheetNames.includes('利用統計')
      };
      
      // 利用統計シートの詳細確認
      if (sheetNames.includes('利用統計')) {
        const usageSheet = spreadsheet.getSheetByName('利用統計');
        const lastRow = usageSheet.getLastRow();
        const lastCol = usageSheet.getLastColumn();
        
        results.tests.usageSheetDetails = {
          lastRow: lastRow,
          lastCol: lastCol,
          hasData: lastRow > 1
        };
        
        if (lastRow > 0) {
          const headers = usageSheet.getRange(1, 1, 1, lastCol).getValues()[0];
          results.tests.usageSheetDetails.headers = headers;
        }
        
        console.log('✅ 利用統計シート確認完了');
      }
      
    } catch (sheetError) {
      results.tests.spreadsheetCheck = { success: false, error: sheetError.message };
      results.errors.push('スプレッドシート確認エラー: ' + sheetError.message);
      console.error('❌ スプレッドシート確認エラー:', sheetError);
    }
    
    // 5. 結果サマリー
    const totalTests = Object.keys(results.tests).length;
    const successTests = Object.values(results.tests).filter(test => test.success !== false).length;
    
    results.summary = `${successTests}/${totalTests}件成功`;
    if (results.errors.length === 0) {
      results.summary += ' - 全テスト正常';
      console.log('✅ 利用統計システム正常動作');
    } else {
      results.summary += ` - ${results.errors.length}件エラー`;
      console.log('❌ 利用統計システムにエラーあり');
    }
    
    console.log('📊 ===== 利用統計システムテスト完了 =====');
    return results;
    
  } catch (error) {
    console.error('❌ 利用統計システムテストエラー:', error);
    return {
      timestamp: new Date().toISOString(),
      error: error.message,
      summary: 'テスト実行中に例外エラー'
    };
  }
}

/**
 * 今日の利用統計を取得（UI呼び出し用）
 * @returns {Object} 今日の統計
 */
function getTodayUsageStats() {
  try {
    console.log('📊 今日の利用統計取得開始');
    const result = DatabaseManager.getUsageStats('today');
    console.log('📊 今日の利用統計取得完了');
    return result;
  } catch (error) {
    console.error('❌ 今日の利用統計取得エラー:', error);
    return {
      success: false,
      error: error.message,
      period: 'today'
    };
  }
}

/**
 * 全期間の利用統計を取得（UI呼び出し用）
 * @returns {Object} 全期間の統計
 */
function getAllUsageStats() {
  try {
    console.log('📊 全期間の利用統計取得開始');
    const result = DatabaseManager.getUsageStats('all');
    console.log('📊 全期間の利用統計取得完了');
    return result;
  } catch (error) {
    console.error('❌ 全期間の利用統計取得エラー:', error);
    return {
      success: false,
      error: error.message,
      period: 'all'
    };
  }
}

// ===== カスタムプロンプト管理機能 =====

/**
 * カスタムプロンプト状況を確認
 * @returns {Object} 状況情報
 */
function checkCustomPromptStatus() {
  console.log('📝 ===== カスタムプロンプト状況確認 =====');
  
  try {
    const config = ConfigManager.getConfig();
    const status = CustomPromptManager.getCustomPromptStatus(config.spreadsheetId);
    
    console.log('📊 カスタムプロンプト状況:');
    console.log(`   現在使用中: ${status.currentlyUsing === 'custom' ? 'カスタム' : 'デフォルト'}`);
    console.log(`   推奨事項: ${status.recommendation}`);
    
    if (status.custom.hasCustom) {
      console.log('✅ カスタムプロンプト設定済み:');
      console.log(`   文字数: ${status.custom.length}文字`);
      console.log(`   内容: ${status.custom.preview}...`);
    } else {
      console.log('⚪ カスタムプロンプト未設定');
      console.log(`   理由: ${status.custom.message}`);
    }
    
    console.log('🏢 デフォルトプロンプト:');
    console.log(`   業種: ${status.default.industry}`);
    console.log(`   文字数: ${status.default.length}文字`);
    console.log(`   内容: ${status.default.prompt.substring(0, 100)}...`);
    
    return status;
    
  } catch (error) {
    console.error('❌ カスタムプロンプト状況確認エラー:', error);
    return { error: error.message };
  }
}

/**
 * カスタムプロンプトを設定
 * @param {string} prompt カスタムプロンプト
 * @returns {Object} 設定結果
 */
function setCustomPrompt(prompt) {
  console.log('📝 ===== カスタムプロンプト設定 =====');
  
  try {
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      throw new Error('有効なプロンプトを指定してください');
    }
    
    const config = ConfigManager.getConfig();
    const result = CustomPromptManager.setCustomPrompt(config.spreadsheetId, prompt);
    
    console.log(`✅ 設定結果: ${result.message}`);
    return result;
    
  } catch (error) {
    console.error('❌ カスタムプロンプト設定エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * カスタムプロンプトをクリア
 * @returns {Object} クリア結果
 */
function clearCustomPrompt() {
  console.log('🗑️ ===== カスタムプロンプトクリア =====');
  
  try {
    const config = ConfigManager.getConfig();
    const result = CustomPromptManager.clearCustomPrompt(config.spreadsheetId);
    
    console.log(`✅ クリア結果: ${result.message}`);
    return result;
    
  } catch (error) {
    console.error('❌ カスタムプロンプトクリアエラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * カスタムプロンプトのテスト実行
 * @returns {Object} テスト結果
 */
function testCustomPrompt() {
  console.log('🧪 ===== カスタムプロンプトテスト =====');
  
  try {
    // 現在の状況確認
    const status = checkCustomPromptStatus();
    
    // テスト用ドキュメント処理
    const testPrompt = DocumentProcessor.createSummaryPrompt(
      'test_document.pdf',
      'これはテスト用のドキュメントです。重要な情報が含まれています。会計データ、設計情報、プロジェクト詳細などが記載されています。'
    );
    
    const result = {
      success: true,
      customPromptStatus: status,
      testPrompt: {
        length: testPrompt.length,
        preview: testPrompt.substring(0, 300),
        usingCustom: status.custom && status.custom.hasCustom
      },
      message: status.custom && status.custom.hasCustom ? 
        'カスタムプロンプトが正常に適用されています' :
        'デフォルトプロンプトが使用されています'
    };
    
    console.log('✅ テスト完了:', result.message);
    console.log(`📏 生成されたプロンプト長: ${testPrompt.length}文字`);
    console.log(`📝 プロンプト内容（抜粋）: ${testPrompt.substring(0, 200)}...`);
    
    return result;
    
  } catch (error) {
    console.error('❌ カスタムプロンプトテストエラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * カスタムシートのURLを取得
 * @returns {Object} URL情報
 */
function getCustomSheetUrl() {
  console.log('🔗 ===== カスタムシートURL取得 =====');
  
  try {
    const config = ConfigManager.getConfig();
    const result = CustomPromptManager.getCustomSheetUrl(config.spreadsheetId);
    
    if (result.success) {
      console.log(`✅ URL取得成功: ${result.url}`);
    } else {
      console.log(`❌ URL取得失敗: ${result.message}`);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ カスタムシートURL取得エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * カスタムプロンプトの検証
 * @param {string} prompt プロンプト文字列
 * @returns {Object} 検証結果
 */
function validateCustomPrompt(prompt) {
  console.log('🔍 ===== カスタムプロンプト検証 =====');
  
  try {
    const validation = CustomPromptManager.validateCustomPrompt(prompt);
    
    console.log(`📊 検証結果: ${validation.isValid ? '✅ 有効' : '⚠️ 要改善'}`);
    console.log(`📈 品質スコア: ${validation.score}/100`);
    
    if (validation.warnings.length > 0) {
      console.log('⚠️ 警告事項:');
      validation.warnings.forEach(warning => console.log(`   - ${warning}`));
    }
    
    if (validation.recommendations.length > 0) {
      console.log('💡 改善提案:');
      validation.recommendations.forEach(rec => console.log(`   - ${rec}`));
    }
    
    return validation;
    
  } catch (error) {
    console.error('❌ カスタムプロンプト検証エラー:', error);
    return { isValid: false, error: error.message };
  }
}

// ===== 業種モード切り替え機能 =====

// 古いdoGet()関数を削除（14行目のテスト用doGet()を使用）

/**
 * POSTリクエストの処理（将来的な拡張用）
 */
function doPost(e) {
  console.log('📨 ===== doPost呼び出し =====');
  
  try {
    // 基本的なPOSTデータ確認
    if (!e) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid request object'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    console.log('📨 POST request received successfully');
    
    // 将来的にはWebhook受信などに使用予定
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'POST endpoint ready for future use'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('❌ doPostエラー:', error.message);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * システム初期化（userシート作成など）
 */
function initializeSystem() {
  console.log('🏗️ ===== システム初期化開始 =====');
  
  try {
    // userシートの初期化
    const userSheetResult = UserManager.initializeUserSheet();
    console.log('userシート初期化結果:', userSheetResult);
    
    // 設定確認
    const configCheck = ConfigManager.checkSetup();
    console.log('設定確認完了');
    
    console.log('✅ システム初期化完了');
    return { success: true, message: 'システム初期化が完了しました' };
    
  } catch (error) {
    console.error('❌ システム初期化エラー:', error.message);
    return { success: false, error: error.message };
  }
}



/**
 * 業種設定と設定取得（UI用）
 * @param {string} industryType 業種タイプ
 * @returns {Object} 設定結果
 */
function setIndustryAndGetConfig(industryType) {
  console.log(`🔄 ===== 業種切り替え: ${industryType} =====`);
  
  try {
    if (!industryType || typeof industryType !== 'string') {
      throw new Error('有効な業種タイプを指定してください');
    }
    
    console.log(`📋 切り替え対象: ${industryType}`);
    const result = ConfigManager.setIndustry(industryType);
    
    console.log(`✅ 切り替え成功: ${result.name}`);
    console.log(`🎨 カラーテーマ: ${result.colors.primary}`);
    console.log(`🔍 検索例: [${result.searchExamples.join(', ')}]`);
    
    return {
      success: true,
      config: result,
      message: `${result.name}モードに切り替えました`
    };
    
  } catch (error) {
    console.error('❌ 業種切り替えエラー:', error);
    console.error('❌ エラー詳細:', error.message);
    
    return {
      success: false,
      error: error.message,
      config: null
    };
  }
}

/**
 * 現在の業種設定取得（UI用）
 * @returns {Object} 現在の業種設定
 */
function getCurrentIndustryConfig() {
  console.log('📊 ===== 現在の業種設定取得 =====');
  
  try {
    const config = ConfigManager.getIndustryConfig();
    
    console.log(`📋 現在の業種: ${config.name}`);
    console.log(`🎨 システムタイトル: ${config.systemTitle}`);
    console.log(`🔍 検索例数: ${config.searchExamples ? config.searchExamples.length : 0}個`);
    
    return config;
    
  } catch (error) {
    console.error('❌ 業種設定取得エラー:', error);
    console.log('🔄 フォールバック: デフォルト設定を使用');
    
    // フォールバック処理
    try {
      return ConfigManager.getIndustryConfig();
    } catch (fallbackError) {
      console.error('❌ フォールバックも失敗:', fallbackError);
      
      // 最終フォールバック
      return {
        name: 'デザイン事務所',
        systemTitle: '🏗️ デザイン事務所ドキュメント検索システム',
        searchExamples: ['設計', '平面図', 'カフェ'],
        placeholder: '例: 設計, 平面図, カフェ設計...',
        colors: {
          primary: '#8B9A5B',
          light: '#A8B373',
          pale: '#C5D197',
          cream: '#F5F7F0',
          dark: '#6B7A47',
          accent: '#9CAD6B'
        }
      };
    }
  }
}

/**
 * 利用可能業種一覧取得（UI用）
 * @returns {Array} 業種一覧
 */
function getAvailableIndustries() {
  console.log('📋 ===== 利用可能業種一覧取得 =====');
  
  try {
    const industries = ConfigManager.getAvailableIndustries();
    
    console.log(`📊 対応業種数: ${industries.length}種類`);
    industries.forEach((industry, index) => {
      console.log(`   ${index + 1}. ${industry.name} (${industry.key})`);
    });
    
    return industries;
    
  } catch (error) {
    console.error('❌ 業種一覧取得エラー:', error);
    
    // フォールバック: 固定の業種一覧
    return [
      { key: 'design_office', name: 'デザイン事務所', title: '🏗️ デザイン事務所ドキュメント検索システム' },
      { key: 'accounting_office', name: '会計事務所', title: '📊 会計事務所ドキュメント検索システム' },
      { key: 'photographer', name: '写真家', title: '📸 写真家・イラストレーター検索システム' }
    ];
  }
}