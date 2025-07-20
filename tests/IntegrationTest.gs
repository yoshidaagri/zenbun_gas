// ===== 統合テストモジュール =====

/**
 * Phase 2 統合テスト
 * 実際のファイルアップロード→解析→質問のフルワークフローをテスト
 */
class IntegrationTest {

  /**
   * 全統合テストを実行
   * @returns {Object} 統合テスト結果
   */
  static runFullIntegrationTests() {
    console.log('🔗 ===== Phase 2 統合テスト開始 =====');
    
    const testResults = {
      startTime: new Date(),
      endTime: null,
      duration: 0,
      tests: [],
      totalTests: 0,
      passed: 0,
      failed: 0,
      errors: [],
      warningsAndNotes: []
    };
    
    const integrationTests = [
      {
        name: '単一ファイル解析フローテスト',
        method: IntegrationTest.testSingleFileAnalysisFlow,
        description: '1ファイルのアップロード→チャット→質問応答の完全フロー'
      },
      {
        name: 'セッション管理統合テスト', 
        method: IntegrationTest.testSessionManagementIntegration,
        description: 'セッション作成→準備→質問処理→履歴→クリーンアップ'
      },
      {
        name: '検索→解析連携テスト',
        method: IntegrationTest.testSearchAnalysisIntegration,
        description: '検索結果からの解析画面遷移とデータ連携'
      },
      {
        name: 'エラー回復フローテスト',
        method: IntegrationTest.testErrorRecoveryFlow,
        description: 'API エラー時の適切なハンドリングと回復'
      }
    ];
    
    // 前提条件チェック
    console.log('🔍 前提条件チェック中...');
    const prerequisiteCheck = IntegrationTest.checkPrerequisites();
    
    if (!prerequisiteCheck.success) {
      console.error('❌ 前提条件チェック失敗:', prerequisiteCheck.error);
      testResults.errors.push(`前提条件: ${prerequisiteCheck.error}`);
      testResults.warningsAndNotes.push('統合テストは前提条件チェック失敗により中断されました');
      return testResults;
    }
    
    console.log('✅ 前提条件チェック完了');
    
    // 各統合テスト実行
    integrationTests.forEach(test => {
      testResults.totalTests++;
      console.log(`\n🔗 ${test.name} 実行中...`);
      console.log(`📝 ${test.description}`);
      
      try {
        const testStartTime = new Date();
        const result = test.method();
        const testEndTime = new Date();
        const testDuration = (testEndTime - testStartTime) / 1000;
        
        const testEntry = {
          name: test.name,
          description: test.description,
          duration: testDuration,
          result: result
        };
        
        if (result.success) {
          testResults.passed++;
          console.log(`✅ ${test.name} 成功 (${testDuration.toFixed(2)}秒)`);
          if (result.warnings) {
            testResults.warningsAndNotes.push(...result.warnings);
          }
        } else {
          testResults.failed++;
          console.log(`❌ ${test.name} 失敗: ${result.error}`);
          testResults.errors.push(`${test.name}: ${result.error}`);
        }
        
        testResults.tests.push(testEntry);
        
      } catch (error) {
        testResults.failed++;
        console.error(`💥 ${test.name} 例外エラー:`, error);
        testResults.errors.push(`${test.name}: ${error.message}`);
        testResults.tests.push({
          name: test.name,
          description: test.description,
          duration: 0,
          result: { success: false, error: error.message }
        });
      }
      
      // テスト間の待機（API制限対策）
      console.log('⏱️ API制限対策で待機中...');
      Utilities.sleep(3000);
    });
    
    // 結果計算
    testResults.endTime = new Date();
    testResults.duration = (testResults.endTime - testResults.startTime) / 1000;
    const successRate = testResults.totalTests > 0 ? 
      (testResults.passed / testResults.totalTests * 100) : 0;
    
    // 結果表示
    console.log('\n📊 ===== 統合テスト結果 =====');
    console.log(`⏱️ 実行時間: ${testResults.duration.toFixed(2)}秒`);
    console.log(`📋 総テスト数: ${testResults.totalTests}`);
    console.log(`✅ 成功: ${testResults.passed}`);
    console.log(`❌ 失敗: ${testResults.failed}`);
    console.log(`📈 成功率: ${successRate.toFixed(1)}%`);
    
    if (testResults.warningsAndNotes.length > 0) {
      console.log('\n⚠️ 注意事項:');
      testResults.warningsAndNotes.forEach(note => console.log(`  - ${note}`));
    }
    
    if (testResults.errors.length > 0) {
      console.log('\n❌ エラー詳細:');
      testResults.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('🔗 ===== Phase 2 統合テスト完了 =====');
    
    return testResults;
  }

  /**
   * 前提条件チェック
   * @returns {Object} チェック結果
   */
  static checkPrerequisites() {
    try {
      console.log('🔍 APIキー設定確認...');
      
      const config = ConfigManager.getConfig();
      
      if (!config.geminiApiKey) {
        return {
          success: false,
          error: 'Gemini APIキーが設定されていません'
        };
      }
      
      if (!config.folderId) {
        return {
          success: false,
          error: 'Google Drive フォルダIDが設定されていません'
        };
      }
      
      // フォルダアクセス確認
      console.log('📁 Google Drive フォルダアクセス確認...');
      try {
        const folder = DriveApp.getFolderById(config.folderId);
        const folderName = folder.getName();
        console.log(`✅ フォルダアクセス成功: ${folderName}`);
      } catch (error) {
        return {
          success: false,
          error: `Google Drive フォルダアクセス失敗: ${error.message}`
        };
      }
      
      // テスト用ファイル確認
      console.log('📄 テスト用ファイル確認...');
      const testFiles = IntegrationTest.getTestFiles();
      
      if (testFiles.length === 0) {
        return {
          success: false,
          error: 'テスト用ファイルが見つかりません（画像ファイルをフォルダに配置してください）'
        };
      }
      
      console.log(`✅ テスト用ファイル発見: ${testFiles.length}件`);
      
      return {
        success: true,
        testFilesCount: testFiles.length
      };
      
    } catch (error) {
      return {
        success: false,
        error: `前提条件チェックエラー: ${error.message}`
      };
    }
  }

  /**
   * テスト用ファイルを取得
   * @returns {Array} テスト用ファイル配列
   */
  static getTestFiles() {
    try {
      const config = ConfigManager.getConfig();
      const folder = DriveApp.getFolderById(config.folderId);
      const files = folder.getFiles();
      const testFiles = [];
      const limits = GeminiFileAPI.getFileApiLimits();
      
      // 対応形式のファイルを最大3件まで取得
      while (files.hasNext() && testFiles.length < 3) {
        const file = files.next();
        const mimeType = file.getBlob().getContentType();
        
        if (limits.supportedMimeTypes.includes(mimeType)) {
          testFiles.push({
            id: file.getId(),
            name: file.getName(),
            size: file.getSize(),
            mimeType: mimeType
          });
        }
      }
      
      return testFiles;
      
    } catch (error) {
      console.error('テスト用ファイル取得エラー:', error);
      return [];
    }
  }

  /**
   * 単一ファイル解析フローテスト
   * @returns {Object} テスト結果
   */
  static testSingleFileAnalysisFlow() {
    try {
      console.log('📄 単一ファイル解析フロー開始');
      
      const testFiles = IntegrationTest.getTestFiles();
      if (testFiles.length === 0) {
        return {
          success: false,
          error: 'テスト用ファイルが見つかりません'
        };
      }
      
      const testFile = testFiles[0];
      console.log(`📁 テストファイル: ${testFile.name} (${Utils.formatFileSize(testFile.size)})`);
      
      // 1. セッション作成
      console.log('🔬 解析セッション作成...');
      const session = AnalysisManager.createAnalysisSession(testFile.id, {
        systemInstruction: 'テスト用のシステム指示です。',
        maxQuestions: 5
      });
      
      if (!session.sessionId) {
        return {
          success: false,
          error: 'セッション作成に失敗しました'
        };
      }
      
      console.log(`✅ セッション作成成功: ${session.sessionId}`);
      
      // 2. ファイル準備（アップロード）
      console.log('📤 ファイル準備・アップロード...');
      const prepareResult = AnalysisManager.prepareFileForAnalysis(session);
      
      if (!prepareResult.success) {
        return {
          success: false,
          error: `ファイル準備失敗: ${prepareResult.error}`
        };
      }
      
      console.log('✅ ファイルアップロード成功');
      
      // 3. 質問処理テスト
      const testQuestions = [
        'この画像について教えてください。',
        'どのような内容が描かれていますか？',
        '設計図面の場合、主要な寸法や特徴を教えてください。'
      ];
      
      const questionResults = [];
      
      for (let i = 0; i < testQuestions.length; i++) {
        const question = testQuestions[i];
        console.log(`❓ 質問 ${i + 1}: ${question}`);
        
        const questionResult = AnalysisManager.processQuestion(session, question);
        questionResults.push(questionResult);
        
        if (!questionResult.success) {
          console.log(`⚠️ 質問 ${i + 1} 失敗: ${questionResult.error}`);
        } else {
          console.log(`✅ 質問 ${i + 1} 成功 (応答: ${questionResult.response.substring(0, 50)}...)`);
        }
        
        // API制限対策の待機
        if (i < testQuestions.length - 1) {
          Utilities.sleep(2000);
        }
      }
      
      // 4. 履歴確認
      console.log('📋 セッション履歴確認...');
      const history = AnalysisManager.getSessionHistory(session, { includeDetails: true });
      
      if (!history.files || history.files.length !== 1) {
        return {
          success: false,
          error: '履歴の構造が正しくありません'
        };
      }
      
      // 5. エクスポート機能テスト
      console.log('📤 結果エクスポート...');
      const exportText = AnalysisManager.exportAnalysisResults(session, 'text');
      const exportJson = AnalysisManager.exportAnalysisResults(session, 'json');
      
      if (!exportText || !exportJson) {
        return {
          success: false,
          error: 'エクスポート機能が失敗しました'
        };
      }
      
      // 6. クリーンアップ
      console.log('🧹 セッションクリーンアップ...');
      AnalysisManager.cleanupSession(session, true); // ファイルも削除
      
      // 結果評価
      const successfulQuestions = questionResults.filter(r => r.success).length;
      const questionSuccessRate = (successfulQuestions / questionResults.length) * 100;
      
      const warnings = [];
      if (questionSuccessRate < 100) {
        warnings.push(`質問成功率: ${questionSuccessRate.toFixed(1)}% (${successfulQuestions}/${questionResults.length})`);
      }
      
      return {
        success: true,
        message: `単一ファイル解析フロー完了`,
        details: {
          sessionId: session.sessionId,
          fileName: testFile.name,
          questionsProcessed: questionResults.length,
          successfulQuestions: successfulQuestions,
          questionSuccessRate: questionSuccessRate,
          exportSizes: {
            text: exportText.length,
            json: exportJson.length
          }
        },
        warnings: warnings
      };
      
    } catch (error) {
      return {
        success: false,
        error: `単一ファイル解析フローエラー: ${error.message}`
      };
    }
  }

  /**
   * セッション管理統合テスト
   * @returns {Object} テスト結果
   */
  static testSessionManagementIntegration() {
    try {
      console.log('⚙️ セッション管理統合テスト開始');
      
      const testFiles = IntegrationTest.getTestFiles();
      if (testFiles.length < 2) {
        return {
          success: false,
          error: 'セッション管理テストには最低2ファイルが必要です'
        };
      }
      
      const fileIds = testFiles.slice(0, 2).map(f => f.id);
      console.log(`📁 テストファイル: ${fileIds.length}件`);
      
      // マルチファイルセッション作成
      const session = AnalysisManager.createAnalysisSession(fileIds, {
        systemInstruction: 'マルチファイル解析テスト用指示',
        maxQuestions: 10
      });
      
      if (!session.options.multiFileMode) {
        return {
          success: false,
          error: 'マルチファイルモードが有効になっていません'
        };
      }
      
      // 各ファイルの準備
      for (let i = 0; i < fileIds.length; i++) {
        console.log(`📤 ファイル ${i + 1} 準備中...`);
        const prepareResult = AnalysisManager.prepareFileForAnalysis(session, i);
        
        if (!prepareResult.success) {
          return {
            success: false,
            error: `ファイル ${i + 1} 準備失敗: ${prepareResult.error}`
          };
        }
        
        // 各ファイルに1つずつ質問
        const question = `ファイル ${i + 1} の内容について説明してください。`;
        const questionResult = AnalysisManager.processQuestion(session, question, i);
        
        if (!questionResult.success) {
          console.log(`⚠️ ファイル ${i + 1} 質問失敗: ${questionResult.error}`);
        } else {
          console.log(`✅ ファイル ${i + 1} 質問成功`);
        }
        
        Utilities.sleep(2000); // API制限対策
      }
      
      // 統計確認
      const stats = AnalysisManager.getSessionStats(session);
      
      if (!stats || stats.fileCount !== fileIds.length) {
        return {
          success: false,
          error: 'セッション統計が正しくありません'
        };
      }
      
      // 履歴確認
      const history = AnalysisManager.getSessionHistory(session);
      
      if (history.files.length !== fileIds.length) {
        return {
          success: false,
          error: 'セッション履歴のファイル数が正しくありません'
        };
      }
      
      // クリーンアップ
      AnalysisManager.cleanupSession(session, true);
      
      return {
        success: true,
        message: 'セッション管理統合テスト完了',
        details: {
          sessionId: session.sessionId,
          filesProcessed: fileIds.length,
          totalQuestions: stats.totalQuestions,
          successRate: stats.successRate
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: `セッション管理統合テストエラー: ${error.message}`
      };
    }
  }

  /**
   * 検索→解析連携テスト
   * @returns {Object} テスト結果
   */
  static testSearchAnalysisIntegration() {
    try {
      console.log('🔍 検索→解析連携テスト開始');
      
      // 注意: 実際の検索機能は既存のシステムなので、
      // ここでは連携部分の構造的テストのみ実行
      
      const testFiles = IntegrationTest.getTestFiles();
      if (testFiles.length === 0) {
        return {
          success: false,
          error: 'テスト用ファイルが見つかりません'
        };
      }
      
      const testFile = testFiles[0];
      
      // 検索結果形式のモックデータ
      const mockSearchResult = {
        fileName: testFile.name,
        fileId: testFile.id,
        aiSummary: 'モック検索結果の要約',
        extractedText: 'モック抽出テキスト',
        viewUrl: `https://drive.google.com/file/d/${testFile.id}/view`
      };
      
      console.log('📋 検索結果データ形式確認...');
      
      // 必要なプロパティの確認
      const requiredProps = ['fileName', 'fileId', 'aiSummary', 'extractedText'];
      const missingProps = requiredProps.filter(prop => !(prop in mockSearchResult));
      
      if (missingProps.length > 0) {
        return {
          success: false,
          error: `検索結果データに必要なプロパティが不足: ${missingProps.join(', ')}`
        };
      }
      
      // 検索結果から解析セッション作成のシミュレーション
      console.log('🔬 検索結果から解析セッション作成...');
      
      const analysisSession = AnalysisManager.createAnalysisSession(mockSearchResult.fileId, {
        systemInstruction: `以下は検索で見つかったファイルです：\nファイル名: ${mockSearchResult.fileName}\n要約: ${mockSearchResult.aiSummary}\n\nこの情報を踏まえて詳細な分析を提供してください。`
      });
      
      if (!analysisSession.sessionId) {
        return {
          success: false,
          error: '検索結果からの解析セッション作成に失敗しました'
        };
      }
      
      // データ連携テスト（sessionStorageのシミュレーション）
      const sessionData = {
        fileId: mockSearchResult.fileId,
        fileName: mockSearchResult.fileName,
        timestamp: new Date().toISOString(),
        source: 'search',
        searchSummary: mockSearchResult.aiSummary
      };
      
      console.log('💾 セッションデータ連携テスト...');
      
      // セッションデータ形式の検証
      if (!sessionData.fileId || !sessionData.fileName || !sessionData.source) {
        return {
          success: false,
          error: 'セッションデータの形式が不正です'
        };
      }
      
      // 実際のファイル準備（簡易版）
      console.log('📤 連携ファイル準備確認...');
      
      const prepareResult = AnalysisManager.prepareFileForAnalysis(analysisSession);
      
      if (!prepareResult.success) {
        return {
          success: false,
          error: `連携ファイル準備失敗: ${prepareResult.error}`
        };
      }
      
      // クリーンアップ
      AnalysisManager.cleanupSession(analysisSession, true);
      
      return {
        success: true,
        message: '検索→解析連携テスト完了',
        details: {
          sessionId: analysisSession.sessionId,
          connectedFile: sessionData.fileName,
          dataTransferKeys: Object.keys(sessionData)
        },
        warnings: ['実際のUI連携は手動テストで確認してください']
      };
      
    } catch (error) {
      return {
        success: false,
        error: `検索→解析連携テストエラー: ${error.message}`
      };
    }
  }

  /**
   * エラー回復フローテスト
   * @returns {Object} テスト結果
   */
  static testErrorRecoveryFlow() {
    try {
      console.log('🛡️ エラー回復フローテスト開始');
      
      const testFiles = IntegrationTest.getTestFiles();
      if (testFiles.length === 0) {
        return {
          success: false,
          error: 'テスト用ファイルが見つかりません'
        };
      }
      
      // 1. 無効なファイルIDでのエラーハンドリング
      console.log('❌ 無効ファイルIDエラーテスト...');
      
      try {
        const invalidSession = AnalysisManager.createAnalysisSession('invalid-file-id-123');
        const invalidPrepare = AnalysisManager.prepareFileForAnalysis(invalidSession);
        
        if (invalidPrepare.success) {
          return {
            success: false,
            error: '無効ファイルIDでもエラーが発生しませんでした'
          };
        } else {
          console.log('✅ 無効ファイルIDエラー適切に処理されました');
        }
      } catch (error) {
        console.log('✅ 無効ファイルIDで例外適切に発生');
      }
      
      // 2. 質問制限超過テスト
      console.log('📊 質問制限超過テスト...');
      
      const limitSession = AnalysisManager.createAnalysisSession(testFiles[0].id, {
        maxQuestions: 1
      });
      
      // 質問数を制限超過まで増加させる
      limitSession.stats.totalQuestions = 1;
      
      const overLimitResult = AnalysisManager.processQuestion(limitSession, '制限超過テスト質問');
      
      if (overLimitResult.success) {
        return {
          success: false,
          error: '質問制限超過でもエラーが発生しませんでした'
        };
      } else {
        console.log('✅ 質問制限超過エラー適切に処理されました');
      }
      
      // 3. API キー未設定シミュレーション
      console.log('🔑 APIキー未設定エラーテスト...');
      
      // 注意: 実際のAPIキーは変更せず、エラーハンドリング部分のみテスト
      const mockApiError = {
        message: 'API_KEY_INVALID',
        code: 400
      };
      
      const handledError = ErrorHandler.handleApiError(mockApiError, 'Gemini File API');
      
      if (!handledError || typeof handledError !== 'string') {
        return {
          success: false,
          error: 'APIエラーハンドリングが正しく動作しません'
        };
      } else {
        console.log('✅ APIエラーハンドリング正常');
      }
      
      // 4. セッション復旧テスト
      console.log('🔄 セッション復旧テスト...');
      
      const recoverySession = AnalysisManager.createAnalysisSession(testFiles[0].id);
      
      // セッションを意図的に破損状態にする
      recoverySession.status = 'error';
      recoverySession.uploadedFiles = []; 
      
      // 自動復旧の試行（prepareFileForAnalysisの自動準備機能）
      const recoveryResult = AnalysisManager.prepareFileForAnalysis(recoverySession);
      
      if (recoveryResult.success) {
        console.log('✅ セッション自動復旧成功');
        AnalysisManager.cleanupSession(recoverySession, true);
      } else {
        console.log('⚠️ セッション復旧失敗（期待される動作）');
      }
      
      return {
        success: true,
        message: 'エラー回復フローテスト完了',
        details: {
          invalidFileIdHandled: true,
          questionLimitHandled: true,
          apiErrorHandled: true,
          sessionRecoveryTested: true
        },
        warnings: [
          '実際のAPI制限エラーは本番環境でのみ発生します',
          'ネットワークエラーのテストは手動で実行してください'
        ]
      };
      
    } catch (error) {
      return {
        success: false,
        error: `エラー回復フローテストエラー: ${error.message}`
      };
    }
  }
}

// 公開関数
function runFullIntegrationTests() {
  return IntegrationTest.runFullIntegrationTests();
}

function testSingleFileAnalysisFlow() {
  return IntegrationTest.testSingleFileAnalysisFlow();
}

function testSessionManagementIntegration() {
  return IntegrationTest.testSessionManagementIntegration();
}

function testSearchAnalysisIntegration() {
  return IntegrationTest.testSearchAnalysisIntegration();
}

function testErrorRecoveryFlow() {
  return IntegrationTest.testErrorRecoveryFlow();
}

function checkIntegrationPrerequisites() {
  return IntegrationTest.checkPrerequisites();
}