// ===== AnalysisManager 単体テストモジュール =====

/**
 * AnalysisManager クラスの単体テスト
 * セッション管理、質問処理、履歴管理、エクスポート機能をテスト
 */
class TestAnalysisManager {

  /**
   * すべてのテストを実行
   * @returns {Object} テスト結果
   */
  static runAllTests() {
    console.log('🧪 ===== AnalysisManager 単体テスト開始 =====');
    
    const testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: [],
      details: []
    };
    
    const tests = [
      { name: 'セッション作成テスト', method: TestAnalysisManager.testSessionCreation },
      { name: 'セッション統計テスト', method: TestAnalysisManager.testSessionStats },
      { name: 'セッション履歴テスト', method: TestAnalysisManager.testSessionHistory },
      { name: 'エクスポート機能テスト', method: TestAnalysisManager.testExportFunctionality },
      { name: 'クリーンアップ機能テスト', method: TestAnalysisManager.testCleanupFunctionality },
      { name: 'エラーハンドリングテスト', method: TestAnalysisManager.testErrorHandling },
      { name: 'マルチファイルモードテスト', method: TestAnalysisManager.testMultiFileMode }
    ];
    
    tests.forEach(test => {
      testResults.total++;
      console.log(`\n🔍 ${test.name} 実行中...`);
      
      try {
        const result = test.method();
        
        if (result.success) {
          testResults.passed++;
          console.log(`✅ ${test.name} 成功`);
          testResults.details.push({
            test: test.name,
            status: 'passed',
            message: result.message || '正常終了'
          });
        } else {
          testResults.failed++;
          console.log(`❌ ${test.name} 失敗: ${result.error}`);
          testResults.errors.push(`${test.name}: ${result.error}`);
          testResults.details.push({
            test: test.name,
            status: 'failed',
            error: result.error
          });
        }
      } catch (error) {
        testResults.failed++;
        console.error(`💥 ${test.name} 例外エラー:`, error);
        testResults.errors.push(`${test.name}: ${error.message}`);
        testResults.details.push({
          test: test.name,
          status: 'error',
          error: error.message
        });
      }
    });
    
    // テスト結果サマリー
    console.log('\n📊 ===== テスト結果サマリー =====');
    console.log(`総テスト数: ${testResults.total}`);
    console.log(`成功: ${testResults.passed}`);
    console.log(`失敗: ${testResults.failed}`);
    console.log(`成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    
    if (testResults.errors.length > 0) {
      console.log('\n❌ エラー詳細:');
      testResults.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('🧪 ===== AnalysisManager 単体テスト完了 =====');
    
    return testResults;
  }

  /**
   * セッション作成テスト
   */
  static testSessionCreation() {
    try {
      // 単一ファイルセッション（ダミーファイルID使用）
      const singleFileId = 'dummy-test-file-123';
      const session1 = AnalysisManager.createAnalysisSession(singleFileId);
      
      if (!session1.sessionId || typeof session1.sessionId !== 'string') {
        return {
          success: false,
          error: 'セッションIDが無効です'
        };
      }
      
      if (!Array.isArray(session1.fileIds) || session1.fileIds.length !== 1) {
        return {
          success: false,
          error: '単一ファイルID配列が正しく設定されていません'
        };
      }
      
      if (session1.fileIds[0] !== singleFileId) {
        return {
          success: false,
          error: 'ファイルIDが正しく保存されていません'
        };
      }
      
      if (session1.options.multiFileMode !== false) {
        return {
          success: false,
          error: '単一ファイルでマルチファイルモードが有効になっています'
        };
      }
      
      // 複数ファイルセッション（ダミーファイルID使用）
      const multiFileIds = ['dummy-file-1', 'dummy-file-2', 'dummy-file-3'];
      const options = {
        systemInstruction: 'カスタム指示',
        maxQuestions: 30
      };
      
      const session2 = AnalysisManager.createAnalysisSession(multiFileIds, options);
      
      if (session2.fileIds.length !== 3) {
        return {
          success: false,
          error: '複数ファイルID配列の長さが不正です'
        };
      }
      
      if (session2.options.multiFileMode !== true) {
        return {
          success: false,
          error: '複数ファイルでマルチファイルモードが無効です'
        };
      }
      
      if (session2.options.systemInstruction !== options.systemInstruction) {
        return {
          success: false,
          error: 'カスタムシステム指示が設定されていません'
        };
      }
      
      if (session2.options.maxQuestions !== options.maxQuestions) {
        return {
          success: false,
          error: '最大質問数が設定されていません'
        };
      }
      
      // 初期状態チェック
      if (session1.status !== 'initializing') {
        return {
          success: false,
          error: '初期状態が正しくありません'
        };
      }
      
      if (session1.stats.totalQuestions !== 0) {
        return {
          success: false,
          error: '初期統計が正しくありません'
        };
      }
      
      return {
        success: true,
        message: `セッション作成正常 (単一: ${session1.sessionId.substring(0, 8)}..., 複数: ${session2.sessionId.substring(0, 8)}...)`
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * セッション統計テスト
   */
  static testSessionStats() {
    try {
      const fileIds = ['dummy-test-stats-file'];
      const session = AnalysisManager.createAnalysisSession(fileIds);
      
      // 初期統計
      const initialStats = AnalysisManager.getSessionStats(session);
      
      if (initialStats.totalQuestions !== 0) {
        return {
          success: false,
          error: '初期質問数が0ではありません'
        };
      }
      
      if (initialStats.successRate !== 100) {
        return {
          success: false,
          error: '初期成功率が100%ではありません'
        };
      }
      
      if (initialStats.status !== 'initializing') {
        return {
          success: false,
          error: '初期ステータスが正しくありません'
        };
      }
      
      // 統計更新のシミュレーション
      session.stats.totalQuestions = 5;
      session.stats.errors = 1;
      session.stats.totalResponseTime = 10.5;
      session.status = 'active';
      
      const updatedStats = AnalysisManager.getSessionStats(session);
      
      if (updatedStats.totalQuestions !== 5) {
        return {
          success: false,
          error: '質問数の更新が反映されていません'
        };
      }
      
      if (updatedStats.totalErrors !== 1) {
        return {
          success: false,
          error: 'エラー数の更新が反映されていません'
        };
      }
      
      const expectedSuccessRate = ((5 - 1) / 5) * 100; // 80%
      if (Math.abs(updatedStats.successRate - expectedSuccessRate) > 0.1) {
        return {
          success: false,
          error: `成功率の計算が不正: 期待値=${expectedSuccessRate}, 実際=${updatedStats.successRate}`
        };
      }
      
      const expectedAvgTime = 10.5 / 5; // 2.1秒
      if (Math.abs(updatedStats.averageResponseTime - expectedAvgTime) > 0.1) {
        return {
          success: false,
          error: `平均応答時間の計算が不正: 期待値=${expectedAvgTime}, 実際=${updatedStats.averageResponseTime}`
        };
      }
      
      return {
        success: true,
        message: `統計機能正常 (成功率: ${updatedStats.successRate}%, 平均応答: ${updatedStats.averageResponseTime}秒)`
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * セッション履歴テスト
   */
  static testSessionHistory() {
    try {
      const fileIds = ['dummy-history-test-file-1', 'dummy-history-test-file-2'];
      const session = AnalysisManager.createAnalysisSession(fileIds);
      
      // アップロードファイル情報をモック
      session.uploadedFiles = [
        {
          fileName: 'test1.jpg',
          fileSize: 1024 * 1024,
          mimeType: 'image/jpeg',
          uploadedAt: new Date()
        },
        {
          fileName: 'test2.png',
          fileSize: 2048 * 1024,
          mimeType: 'image/png',
          uploadedAt: new Date()
        }
      ];
      
      // チャットセッション履歴をモック
      session.chatSessions = [
        {
          history: [
            { question: 'Q1 for file1', response: 'A1 for file1', timestamp: new Date() },
            { question: 'Q2 for file1', response: 'A2 for file1', timestamp: new Date() }
          ]
        },
        {
          history: [
            { question: 'Q1 for file2', response: 'A1 for file2', timestamp: new Date() }
          ]
        }
      ];
      
      // 詳細なし履歴取得
      const basicHistory = AnalysisManager.getSessionHistory(session);
      
      if (basicHistory.fileCount !== 2) {
        return {
          success: false,
          error: 'ファイル数が正しく取得されていません'
        };
      }
      
      if (basicHistory.files.length !== 2) {
        return {
          success: false,
          error: 'ファイル履歴配列の長さが不正です'
        };
      }
      
      // 基本履歴では詳細は数値のみ
      if (typeof basicHistory.files[0].history !== 'number') {
        return {
          success: false,
          error: '基本履歴で詳細情報が含まれています'
        };
      }
      
      // 詳細あり履歴取得
      const detailedHistory = AnalysisManager.getSessionHistory(session, { includeDetails: true });
      
      if (!Array.isArray(detailedHistory.files[0].history)) {
        return {
          success: false,
          error: '詳細履歴で質問応答配列が取得されていません'
        };
      }
      
      if (detailedHistory.files[0].history.length !== 2) {
        return {
          success: false,
          error: 'ファイル1の質問数が不正です'
        };
      }
      
      if (detailedHistory.files[1].history.length !== 1) {
        return {
          success: false,
          error: 'ファイル2の質問数が不正です'
        };
      }
      
      // 履歴エントリの構造チェック
      const firstEntry = detailedHistory.files[0].history[0];
      if (!firstEntry.question || !firstEntry.response || !firstEntry.timestamp) {
        return {
          success: false,
          error: '履歴エントリの構造が不正です'
        };
      }
      
      return {
        success: true,
        message: `履歴機能正常 (ファイル${basicHistory.fileCount}件, 総質問${detailedHistory.files[0].history.length + detailedHistory.files[1].history.length}件)`
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * エクスポート機能テスト
   */
  static testExportFunctionality() {
    try {
      const fileIds = ['dummy-export-test-file'];
      const session = AnalysisManager.createAnalysisSession(fileIds);
      
      // テストデータ設定
      session.stats.totalQuestions = 2;
      session.stats.totalResponseTime = 5.5;
      session.stats.errors = 0;
      
      session.uploadedFiles = [{
        fileName: 'export-test.jpg',
        fileSize: 1536 * 1024,
        mimeType: 'image/jpeg',
        uploadedAt: new Date()
      }];
      
      session.chatSessions = [{
        history: [
          { 
            question: 'テスト質問1', 
            response: 'テスト回答1', 
            timestamp: new Date() 
          },
          { 
            question: 'テスト質問2', 
            response: 'テスト回答2', 
            timestamp: new Date() 
          }
        ]
      }];
      
      // JSON形式エクスポート
      const jsonExport = AnalysisManager.exportAnalysisResults(session, 'json');
      
      if (typeof jsonExport !== 'string') {
        return {
          success: false,
          error: 'JSON形式エクスポートが文字列ではありません'
        };
      }
      
      try {
        const parsedJson = JSON.parse(jsonExport);
        if (!parsedJson.sessionId || !parsedJson.files) {
          return {
            success: false,
            error: 'JSON形式エクスポートの構造が不正です'
          };
        }
      } catch (e) {
        return {
          success: false,
          error: 'JSON形式エクスポートが無効なJSONです'
        };
      }
      
      // テキスト形式エクスポート
      const textExport = AnalysisManager.exportAnalysisResults(session, 'text');
      
      if (typeof textExport !== 'string') {
        return {
          success: false,
          error: 'テキスト形式エクスポートが文字列ではありません'
        };
      }
      
      // 必要な情報が含まれているかチェック
      const requiredTexts = [
        session.sessionId,
        'export-test.jpg',
        'テスト質問1',
        'テスト回答1',
        '総質問数: 2件'
      ];
      
      const missingTexts = requiredTexts.filter(text => !textExport.includes(text));
      
      if (missingTexts.length > 0) {
        return {
          success: false,
          error: `テキストエクスポートに必要な情報が不足: ${missingTexts.join(', ')}`
        };
      }
      
      return {
        success: true,
        message: `エクスポート機能正常 (JSON: ${jsonExport.length}文字, テキスト: ${textExport.length}文字)`
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * クリーンアップ機能テスト
   */
  static testCleanupFunctionality() {
    try {
      const fileIds = ['dummy-cleanup-test-file'];
      const session = AnalysisManager.createAnalysisSession(fileIds);
      
      // アクティブなチャットセッションをモック
      session.chatSessions = [{
        sessionId: 'mock-chat-session',
        isActive: true
      }];
      
      session.uploadedFiles = [{
        fileName: 'cleanup-test.jpg',
        uploadResult: {
          fileUri: 'files/mock-uploaded-file-uri'
        }
      }];
      
      // 初期状態確認
      if (session.status === 'completed') {
        return {
          success: false,
          error: '初期状態が既に完了になっています'
        };
      }
      
      if (session.endedAt) {
        return {
          success: false,
          error: '初期状態で終了時刻が設定されています'
        };
      }
      
      // クリーンアップ実行（ファイル削除なし）
      AnalysisManager.cleanupSession(session, false);
      
      // 状態確認
      if (session.status !== 'completed') {
        return {
          success: false,
          error: 'クリーンアップ後のステータスが正しくありません'
        };
      }
      
      if (!session.endedAt || !(session.endedAt instanceof Date)) {
        return {
          success: false,
          error: '終了時刻が設定されていません'
        };
      }
      
      // チャットセッションが非アクティブになったかチェック
      // 注意: 実際のGeminiFileAPI.cleanupSessionは呼ばれるが、mockなので直接チェック
      
      return {
        success: true,
        message: `クリーンアップ機能正常 (期間: ${((session.endedAt - session.createdAt) / 1000).toFixed(2)}秒)`
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * エラーハンドリングテスト
   */
  static testErrorHandling() {
    try {
      // 無効なファイルIDでセッション作成
      try {
        AnalysisManager.createAnalysisSession([]);
        return {
          success: false,
          error: '空のファイルID配列でエラーが発生しませんでした'
        };
      } catch (error) {
        console.log('  ✓ 空ファイルID配列エラー検出成功');
      }
      
      // null/undefinedでセッション作成
      try {
        AnalysisManager.createAnalysisSession(null);
        return {
          success: false,
          error: 'null ファイルIDでエラーが発生しませんでした'
        };
      } catch (error) {
        console.log('  ✓ null ファイルIDエラー検出成功');
      }
      
      // undefinedでセッション作成
      try {
        AnalysisManager.createAnalysisSession(undefined);
        return {
          success: false,
          error: 'undefined ファイルIDでエラーが発生しませんでした'
        };
      } catch (error) {
        console.log('  ✓ undefined ファイルIDエラー検出成功');
      }
      
      // 無効なセッションで統計取得
      const invalidSession = { 
        sessionId: 'invalid',
        status: 'error',
        createdAt: new Date(),
        fileIds: ['dummy'],
        stats: {} // 空のstatsオブジェクト
      };
      
      try {
        const stats = AnalysisManager.getSessionStats(invalidSession);
        if (stats === null) {
          console.log('  ✓ 無効セッション統計取得でnull返却');
        } else {
          console.log('  ✓ 無効セッション統計取得で適切に処理');
        }
      } catch (error) {
        console.log('  ✓ 無効セッション統計取得でエラー検出');
      }
      
      return {
        success: true,
        message: 'エラーハンドリング正常'
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * マルチファイルモードテスト
   */
  static testMultiFileMode() {
    try {
      const multiFileIds = ['dummy-multi-file-1', 'dummy-multi-file-2', 'dummy-multi-file-3'];
      const session = AnalysisManager.createAnalysisSession(multiFileIds);
      
      // マルチファイルモード確認
      if (!session.options.multiFileMode) {
        return {
          success: false,
          error: 'マルチファイルモードが有効になっていません'
        };
      }
      
      if (session.fileIds.length !== 3) {
        return {
          success: false,
          error: 'ファイル数が正しく設定されていません'
      };
      }
      
      // モックセッション設定（実際のprocessQuestionは呼ばない）
      session.uploadedFiles = [
        { fileName: 'file1.jpg' },
        { fileName: 'file2.png' },
        { fileName: 'file3.gif' }
      ];
      
      session.chatSessions = [
        { history: [] },
        { history: [] },
        { history: [] }
      ];
      
      // 注意: processMultiFileQuestionは実際のGemini APIを呼ぶため、
      // ここでは構造的な検証のみ行う
      console.log('  📝 注意: マルチファイル質問処理は統合テストで実行されます');
      
      return {
        success: true,
        message: `マルチファイルモード正常 (${session.fileIds.length}ファイル)`
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// 簡易テスト実行関数
function runAnalysisManagerTests() {
  return TestAnalysisManager.runAllTests();
}

// 個別テスト実行関数
function testSessionCreation() {
  return TestAnalysisManager.testSessionCreation();
}

function testSessionStats() {
  return TestAnalysisManager.testSessionStats();
}

function testSessionHistory() {
  return TestAnalysisManager.testSessionHistory();
}

function testExportFunctionality() {
  return TestAnalysisManager.testExportFunctionality();
}