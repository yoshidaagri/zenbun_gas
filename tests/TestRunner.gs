// ===== テスト実行統合モジュール =====

/**
 * すべてのテストを実行し結果を統合管理するクラス
 */
class TestRunner {

  /**
   * すべての単体テストを実行
   * @returns {Object} 統合テスト結果
   */
  static runAllUnitTests() {
    console.log('🧪 ===== 全単体テスト実行開始 =====');
    
    const overallResults = {
      startTime: new Date(),
      endTime: null,
      duration: 0,
      testSuites: [],
      totalTests: 0,
      totalPassed: 0,
      totalFailed: 0,
      overallSuccessRate: 0,
      summary: '',
      errors: []
    };
    
    // 実行するテストスイート
    const testSuites = [
      {
        name: 'GeminiFileAPI',
        runner: TestGeminiFileAPI.runAllTests,
        description: 'Gemini File API統合機能'
      },
      {
        name: 'AnalysisManager', 
        runner: TestAnalysisManager.runAllTests,
        description: '解析セッション管理機能'
      }
    ];
    
    // 各テストスイート実行
    testSuites.forEach(suite => {
      console.log(`\n🔍 ${suite.name} テストスイート実行中...`);
      console.log(`📝 ${suite.description}`);
      
      try {
        const suiteStartTime = new Date();
        const result = suite.runner();
        const suiteEndTime = new Date();
        const suiteDuration = (suiteEndTime - suiteStartTime) / 1000;
        
        // 結果を統合
        const suiteResult = {
          name: suite.name,
          description: suite.description,
          duration: suiteDuration,
          ...result
        };
        
        overallResults.testSuites.push(suiteResult);
        overallResults.totalTests += result.total;
        overallResults.totalPassed += result.passed;
        overallResults.totalFailed += result.failed;
        overallResults.errors.push(...result.errors);
        
        console.log(`✅ ${suite.name} 完了 (${suiteDuration}秒)`);
        
      } catch (error) {
        console.error(`❌ ${suite.name} 実行エラー:`, error);
        
        const errorResult = {
          name: suite.name,
          description: suite.description,
          duration: 0,
          total: 0,
          passed: 0,
          failed: 1,
          errors: [error.message],
          details: [{
            test: `${suite.name} 実行`,
            status: 'error',
            error: error.message
          }]
        };
        
        overallResults.testSuites.push(errorResult);
        overallResults.totalTests += 1;
        overallResults.totalFailed += 1;
        overallResults.errors.push(`${suite.name}: ${error.message}`);
      }
    });
    
    // 統合結果計算
    overallResults.endTime = new Date();
    overallResults.duration = (overallResults.endTime - overallResults.startTime) / 1000;
    overallResults.overallSuccessRate = overallResults.totalTests > 0 ? 
      (overallResults.totalPassed / overallResults.totalTests * 100) : 0;
    
    // サマリー生成
    overallResults.summary = this.generateTestSummary(overallResults);
    
    // 結果表示
    this.displayTestResults(overallResults);
    
    console.log('🧪 ===== 全単体テスト実行完了 =====');
    
    return overallResults;
  }

  /**
   * テスト結果サマリーを生成
   * @param {Object} results テスト結果
   * @returns {string} サマリー文字列
   */
  static generateTestSummary(results) {
    let summary = `=== Phase 2 単体テスト結果サマリー ===\n\n`;
    summary += `実行時間: ${results.duration.toFixed(2)}秒\n`;
    summary += `テストスイート数: ${results.testSuites.length}\n`;
    summary += `総テスト数: ${results.totalTests}\n`;
    summary += `成功: ${results.totalPassed}\n`;
    summary += `失敗: ${results.totalFailed}\n`;
    summary += `成功率: ${results.overallSuccessRate.toFixed(1)}%\n\n`;
    
    // スイート別結果
    summary += `=== スイート別結果 ===\n`;
    results.testSuites.forEach(suite => {
      const suiteSuccessRate = suite.total > 0 ? (suite.passed / suite.total * 100) : 0;
      summary += `${suite.name}: ${suite.passed}/${suite.total} (${suiteSuccessRate.toFixed(1)}%) - ${suite.duration.toFixed(2)}秒\n`;
    });
    
    // エラー詳細
    if (results.errors.length > 0) {
      summary += `\n=== エラー詳細 ===\n`;
      results.errors.forEach((error, index) => {
        summary += `${index + 1}. ${error}\n`;
      });
    }
    
    // 推奨事項
    summary += `\n=== 推奨事項 ===\n`;
    if (results.overallSuccessRate === 100) {
      summary += `✅ すべてのテストが成功しました。統合テストに進んでください。\n`;
    } else if (results.overallSuccessRate >= 90) {
      summary += `⚠️ 大部分のテストが成功していますが、失敗したテストを確認してください。\n`;
    } else if (results.overallSuccessRate >= 70) {
      summary += `🔧 いくつかの重要な問題があります。修正後に再テストしてください。\n`;
    } else {
      summary += `❌ 多くのテストが失敗しています。基本機能を見直してください。\n`;
    }
    
    return summary;
  }

  /**
   * テスト結果を表示
   * @param {Object} results テスト結果
   */
  static displayTestResults(results) {
    console.log('\n📊 ===== 統合テスト結果 =====');
    console.log(`⏱️ 実行時間: ${results.duration.toFixed(2)}秒`);
    console.log(`📋 総テスト数: ${results.totalTests}`);
    console.log(`✅ 成功: ${results.totalPassed}`);
    console.log(`❌ 失敗: ${results.totalFailed}`);
    console.log(`📈 成功率: ${results.overallSuccessRate.toFixed(1)}%`);
    
    console.log('\n🔍 スイート別詳細:');
    results.testSuites.forEach(suite => {
      const suiteSuccessRate = suite.total > 0 ? (suite.passed / suite.total * 100) : 0;
      const statusIcon = suiteSuccessRate === 100 ? '✅' : 
                        suiteSuccessRate >= 90 ? '⚠️' : '❌';
      
      console.log(`${statusIcon} ${suite.name}: ${suite.passed}/${suite.total} (${suiteSuccessRate.toFixed(1)}%) - ${suite.duration.toFixed(2)}秒`);
      
      // 失敗したテストの詳細
      if (suite.failed > 0 && suite.details) {
        const failedTests = suite.details.filter(detail => detail.status !== 'passed');
        failedTests.forEach(test => {
          console.log(`    ❌ ${test.test}: ${test.error || 'エラー詳細なし'}`);
        });
      }
    });
    
    if (results.overallSuccessRate === 100) {
      console.log('\n🎉 すべてのテストが成功しました！');
    } else {
      console.log(`\n⚠️ ${results.totalFailed}件のテストが失敗しました。`);
    }
  }

  /**
   * 特定のテストスイートのみ実行
   * @param {string} suiteName テストスイート名
   * @returns {Object} テスト結果
   */
  static runSpecificTestSuite(suiteName) {
    console.log(`🔍 ${suiteName} テストスイート実行`);
    
    const suiteMap = {
      'GeminiFileAPI': TestGeminiFileAPI.runAllTests,
      'AnalysisManager': TestAnalysisManager.runAllTests
    };
    
    if (!suiteMap[suiteName]) {
      const error = `未知のテストスイート: ${suiteName}`;
      console.error(error);
      return {
        success: false,
        error: error,
        availableSuites: Object.keys(suiteMap)
      };
    }
    
    try {
      const result = suiteMap[suiteName]();
      console.log(`✅ ${suiteName} テストスイート完了`);
      return {
        success: true,
        suiteName: suiteName,
        ...result
      };
    } catch (error) {
      console.error(`❌ ${suiteName} テストスイート実行エラー:`, error);
      return {
        success: false,
        suiteName: suiteName,
        error: error.message
      };
    }
  }

  /**
   * テスト結果をスプレッドシートに出力
   * @param {Object} results テスト結果
   * @param {string} spreadsheetId 出力先スプレッドシートID（オプション）
   */
  static exportTestResultsToSheet(results, spreadsheetId = null) {
    try {
      console.log('📊 テスト結果をスプレッドシートに出力中...');
      
      // 設定からスプレッドシートID取得
      const config = ConfigManager.getConfig();
      const targetSpreadsheetId = spreadsheetId || config.spreadsheetId;
      
      if (!targetSpreadsheetId) {
        throw new Error('出力先スプレッドシートIDが設定されていません');
      }
      
      const spreadsheet = SpreadsheetApp.openById(targetSpreadsheetId);
      
      // テスト結果シートを作成または取得
      let testSheet;
      try {
        testSheet = spreadsheet.getSheetByName('Phase2_単体テスト結果');
      } catch {
        testSheet = spreadsheet.insertSheet('Phase2_単体テスト結果');
      }
      
      // シートをクリア
      testSheet.clear();
      
      // ヘッダー設定
      const headers = [
        ['Phase 2 単体テスト結果', '', '', '', '', ''],
        [`実行日時: ${results.endTime.toLocaleString()}`, '', '', '', '', ''],
        [`実行時間: ${results.duration.toFixed(2)}秒`, '', '', '', '', ''],
        [`成功率: ${results.overallSuccessRate.toFixed(1)}%`, '', '', '', '', ''],
        ['', '', '', '', '', ''],
        ['テストスイート', '成功/総数', '成功率', '実行時間', '失敗テスト', 'エラー詳細']
      ];
      
      testSheet.getRange(1, 1, headers.length, 6).setValues(headers);
      
      // スイート別結果
      let currentRow = headers.length + 1;
      
      results.testSuites.forEach(suite => {
        const suiteSuccessRate = suite.total > 0 ? (suite.passed / suite.total * 100) : 0;
        const failedTests = suite.details ? 
          suite.details.filter(d => d.status !== 'passed').map(d => d.test).join(', ') : '';
        const errors = suite.errors ? suite.errors.join('; ') : '';
        
        testSheet.getRange(currentRow, 1, 1, 6).setValues([[
          suite.name,
          `${suite.passed}/${suite.total}`,
          `${suiteSuccessRate.toFixed(1)}%`,
          `${suite.duration.toFixed(2)}秒`,
          failedTests,
          errors
        ]]);
        
        currentRow++;
      });
      
      // 書式設定
      testSheet.getRange(1, 1, 1, 6).setFontWeight('bold').setFontSize(14);
      testSheet.getRange(6, 1, 1, 6).setFontWeight('bold').setBackground('#f0f0f0');
      
      // 列幅調整
      testSheet.autoResizeColumns(1, 6);
      
      console.log('✅ テスト結果のスプレッドシート出力完了');
      
      return {
        success: true,
        sheetName: 'Phase2_単体テスト結果',
        url: spreadsheet.getUrl()
      };
      
    } catch (error) {
      console.error('❌ テスト結果スプレッドシート出力エラー:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 簡易テスト実行（主要機能のみ）
   * @returns {Object} 簡易テスト結果
   */
  static runQuickTests() {
    console.log('⚡ 簡易テスト実行開始');
    
    const quickTests = [
      {
        name: 'GeminiFileAPI 制限設定',
        test: () => TestGeminiFileAPI.testFileApiLimits()
      },
      {
        name: 'GeminiFileAPI チャットセッション作成',
        test: () => TestGeminiFileAPI.testChatSessionCreation()
      },
      {
        name: 'AnalysisManager セッション作成',
        test: () => TestAnalysisManager.testSessionCreation()
      },
      {
        name: 'AnalysisManager 統計機能',
        test: () => TestAnalysisManager.testSessionStats()
      }
    ];
    
    const results = {
      total: quickTests.length,
      passed: 0,
      failed: 0,
      duration: 0,
      details: []
    };
    
    const startTime = new Date();
    
    quickTests.forEach(test => {
      try {
        const result = test.test();
        if (result.success) {
          results.passed++;
          console.log(`✅ ${test.name}`);
          results.details.push({ test: test.name, status: 'passed' });
        } else {
          results.failed++;
          console.log(`❌ ${test.name}: ${result.error}`);
          results.details.push({ test: test.name, status: 'failed', error: result.error });
        }
      } catch (error) {
        results.failed++;
        console.error(`💥 ${test.name}:`, error);
        results.details.push({ test: test.name, status: 'error', error: error.message });
      }
    });
    
    const endTime = new Date();
    results.duration = (endTime - startTime) / 1000;
    results.successRate = (results.passed / results.total * 100);
    
    console.log(`⚡ 簡易テスト完了: ${results.passed}/${results.total} (${results.successRate.toFixed(1)}%) - ${results.duration.toFixed(2)}秒`);
    
    return results;
  }
}

// 公開関数
function runAllUnitTests() {
  return TestRunner.runAllUnitTests();
}

function runGeminiFileAPITests() {
  return TestRunner.runSpecificTestSuite('GeminiFileAPI');
}

function runAnalysisManagerTests() {
  return TestRunner.runSpecificTestSuite('AnalysisManager');
}

function runQuickTests() {
  return TestRunner.runQuickTests();
}

function exportTestResults(results, spreadsheetId = null) {
  return TestRunner.exportTestResultsToSheet(results, spreadsheetId);
}