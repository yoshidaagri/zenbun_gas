// ===== GeminiFileAPI 単体テストモジュール =====

/**
 * GeminiFileAPI クラスの単体テスト
 * ファイルアップロード、チャット機能、エラーハンドリングをテスト
 */
class TestGeminiFileAPI {

  /**
   * すべてのテストを実行
   * @returns {Object} テスト結果
   */
  static runAllTests() {
    console.log('🧪 ===== GeminiFileAPI 単体テスト開始 =====');
    
    const testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: [],
      details: []
    };
    
    const tests = [
      { name: 'File API制限設定テスト', method: TestGeminiFileAPI.testFileApiLimits },
      { name: 'ファイル検証テスト', method: TestGeminiFileAPI.testFileValidation },
      { name: 'システム指示取得テスト', method: TestGeminiFileAPI.testSystemInstruction },
      { name: 'チャットセッション作成テスト', method: TestGeminiFileAPI.testChatSessionCreation },
      { name: 'マルチパート作成テスト', method: TestGeminiFileAPI.testMultipartCreation },
      { name: 'チャットコンテンツ構築テスト', method: TestGeminiFileAPI.testChatContentsBuilding },
      { name: 'セッションクリーンアップテスト', method: TestGeminiFileAPI.testSessionCleanup }
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
    
    console.log('🧪 ===== GeminiFileAPI 単体テスト完了 =====');
    
    return testResults;
  }

  /**
   * File API制限設定テスト
   */
  static testFileApiLimits() {
    try {
      const limits = GeminiFileAPI.getFileApiLimits();
      
      // 必要なプロパティが存在するかチェック
      const requiredProps = ['maxFileSize', 'supportedMimeTypes', 'maxFilesPerRequest', 'sessionTimeoutMs'];
      const missingProps = requiredProps.filter(prop => !(prop in limits));
      
      if (missingProps.length > 0) {
        return {
          success: false,
          error: `必要なプロパティが不足: ${missingProps.join(', ')}`
        };
      }
      
      // データ型チェック
      if (typeof limits.maxFileSize !== 'number' || limits.maxFileSize <= 0) {
        return {
          success: false,
          error: 'maxFileSizeが無効な値です'
        };
      }
      
      if (!Array.isArray(limits.supportedMimeTypes) || limits.supportedMimeTypes.length === 0) {
        return {
          success: false,
          error: 'supportedMimeTypesが無効です'
        };
      }
      
      return {
        success: true,
        message: `制限設定正常 (最大ファイルサイズ: ${Utils.formatFileSize(limits.maxFileSize)}, 対応形式: ${limits.supportedMimeTypes.length}種類)`
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * ファイル検証テスト
   */
  static testFileValidation() {
    try {
      // モックファイルオブジェクト作成
      const createMockFile = (size, mimeType) => ({
        getSize: () => size,
        getBlob: () => ({ getContentType: () => mimeType })
      });
      
      const limits = GeminiFileAPI.getFileApiLimits();
      
      // 正常なファイル
      const validFile = createMockFile(1024 * 1024, 'image/jpeg'); // 1MB JPEG
      
      try {
        GeminiFileAPI.validateFileForUpload(validFile);
        console.log('  ✓ 正常ファイル検証成功');
      } catch (error) {
        return {
          success: false,
          error: `正常ファイルでエラー: ${error.message}`
        };
      }
      
      // ファイルサイズ超過
      const oversizeFile = createMockFile(limits.maxFileSize + 1, 'image/jpeg');
      
      try {
        GeminiFileAPI.validateFileForUpload(oversizeFile);
        return {
          success: false,
          error: 'ファイルサイズ超過が検出されませんでした'
        };
      } catch (error) {
        console.log('  ✓ ファイルサイズ超過検出成功');
      }
      
      // 非対応形式
      const unsupportedFile = createMockFile(1024, 'application/octet-stream');
      
      try {
        GeminiFileAPI.validateFileForUpload(unsupportedFile);
        return {
          success: false,
          error: '非対応形式が検出されませんでした'
        };
      } catch (error) {
        console.log('  ✓ 非対応形式検出成功');
      }
      
      return {
        success: true,
        message: 'ファイル検証機能正常'
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * システム指示取得テスト
   */
  static testSystemInstruction() {
    try {
      const instruction = GeminiFileAPI.getDefaultSystemInstruction();
      
      if (typeof instruction !== 'string' || instruction.length === 0) {
        return {
          success: false,
          error: 'システム指示が文字列ではないか空です'
        };
      }
      
      // キーワードチェック
      const requiredKeywords = ['デザイン事務所', '建築図面', 'AI', '分析'];
      const missingKeywords = requiredKeywords.filter(keyword => 
        !instruction.includes(keyword)
      );
      
      if (missingKeywords.length > 0) {
        return {
          success: false,
          error: `必要なキーワードが不足: ${missingKeywords.join(', ')}`
        };
      }
      
      return {
        success: true,
        message: `システム指示正常 (${instruction.length}文字)`
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * チャットセッション作成テスト
   */
  static testChatSessionCreation() {
    try {
      const testFileUri = 'files/test-file-uri-12345';
      const customInstruction = 'カスタムシステム指示のテスト';
      
      // デフォルト指示でセッション作成
      const session1 = GeminiFileAPI.createChatSession(testFileUri);
      
      if (!session1.sessionId || typeof session1.sessionId !== 'string') {
        return {
          success: false,
          error: 'セッションIDが無効です'
        };
      }
      
      if (session1.fileUri !== testFileUri) {
        return {
          success: false,
          error: 'ファイルURIが保存されていません'
        };
      }
      
      if (!Array.isArray(session1.history)) {
        return {
          success: false,
          error: '履歴配列が初期化されていません'
        };
      }
      
      if (!session1.isActive) {
        return {
          success: false,
          error: 'セッションがアクティブではありません'
        };
      }
      
      // カスタム指示でセッション作成
      const session2 = GeminiFileAPI.createChatSession(testFileUri, customInstruction, 'image/jpeg');
      
      if (session2.systemInstruction !== customInstruction) {
        return {
          success: false,
          error: 'カスタムシステム指示が設定されていません'
        };
      }
      
      if (session2.originalMimeType !== 'image/jpeg') {
        return {
          success: false,
          error: 'MIMEタイプが保存されていません'
        };
      }
      
      return {
        success: true,
        message: `チャットセッション作成正常 (ID: ${session1.sessionId.substring(0, 8)}...)`
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * マルチパート作成テスト
   */
  static testMultipartCreation() {
    try {
      const testFileName = 'test-image.jpg';
      const testContent = 'テストファイル内容';
      const testBlob = Utilities.newBlob(testContent, 'image/jpeg', testFileName);
      const boundary = 'test-boundary-12345';
      
      const multipart = GeminiFileAPI.createMultipartPayload(testFileName, testBlob, boundary);
      
      if (!multipart || typeof multipart.getBytes !== 'function') {
        return {
          success: false,
          error: 'マルチパートペイロードが正しく作成されていません'
        };
      }
      
      const payloadBytes = multipart.getBytes();
      const payloadText = Utilities.newBlob(payloadBytes).getDataAsString();
      
      // 基本構造チェック
      if (!payloadText.includes(boundary)) {
        return {
          success: false,
          error: 'バウンダリが含まれていません'
        };
      }
      
      if (!payloadText.includes(testFileName)) {
        return {
          success: false,
          error: 'ファイル名が含まれていません'
        };
      }
      
      if (!payloadText.includes('Content-Type: application/json')) {
        return {
          success: false,
          error: 'メタデータ部分が正しくありません'
        };
      }
      
      return {
        success: true,
        message: `マルチパート作成正常 (サイズ: ${payloadBytes.length}バイト)`
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * チャットコンテンツ構築テスト
   */
  static testChatContentsBuilding() {
    try {
      const testFileUri = 'files/test-file-uri-67890';
      const session = GeminiFileAPI.createChatSession(testFileUri, null, 'image/png');
      
      // 初回質問のコンテンツ構築
      const firstQuestion = '最初の質問です';
      const firstContents = GeminiFileAPI.buildChatContents(session, firstQuestion);
      
      if (!Array.isArray(firstContents) || firstContents.length !== 1) {
        return {
          success: false,
          error: '初回質問のコンテンツ構築が不正です'
        };
      }
      
      const firstContent = firstContents[0];
      if (firstContent.role !== 'user') {
        return {
          success: false,
          error: '初回質問のロールが不正です'
        };
      }
      
      if (!firstContent.parts || !Array.isArray(firstContent.parts) || firstContent.parts.length !== 2) {
        return {
          success: false,
          error: '初回質問のパーツ構成が不正です'
        };
      }
      
      // ファイル参照とテキストの確認
      const hasFileData = firstContent.parts.some(part => part.fileData);
      const hasText = firstContent.parts.some(part => part.text === firstQuestion);
      
      if (!hasFileData || !hasText) {
        return {
          success: false,
          error: 'ファイル参照またはテキストが不足しています'
        };
      }
      
      // 履歴ありの場合のテスト
      session.history = [
        { question: '前の質問', response: '前の回答', timestamp: new Date() }
      ];
      
      const secondQuestion = '2回目の質問です';
      const secondContents = GeminiFileAPI.buildChatContents(session, secondQuestion);
      
      // 履歴 + 現在の質問 = 3エントリ（user, model, user）
      if (secondContents.length !== 3) {
        return {
          success: false,
          error: `履歴ありコンテンツの長さが不正: ${secondContents.length}`
        };
      }
      
      // 最初のユーザーメッセージと現在の質問の両方にファイル参照があるかチェック
      const userMessages = secondContents.filter(c => c.role === 'user');
      const messagesWithFile = userMessages.filter(msg => 
        msg.parts.some(part => part.fileData)
      );
      
      if (messagesWithFile.length !== 2) {
        return {
          success: false,
          error: `ファイル参照を含むメッセージ数が不正: ${messagesWithFile.length} (期待値: 2)`
        };
      }
      
      return {
        success: true,
        message: 'チャットコンテンツ構築正常'
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * セッションクリーンアップテスト
   */
  static testSessionCleanup() {
    try {
      const testFileUri = 'files/test-cleanup-uri';
      const session = GeminiFileAPI.createChatSession(testFileUri, null, 'image/jpeg');
      
      // セッションがアクティブであることを確認
      if (!session.isActive) {
        return {
          success: false,
          error: 'セッションが初期状態でアクティブではありません'
        };
      }
      
      // クリーンアップ実行
      GeminiFileAPI.cleanupSession(session);
      
      // セッションが非アクティブになったかチェック
      if (session.isActive) {
        return {
          success: false,
          error: 'セッションがクリーンアップ後もアクティブです'
        };
      }
      
      // 終了時刻が設定されたかチェック
      if (!session.endedAt || !(session.endedAt instanceof Date)) {
        return {
          success: false,
          error: '終了時刻が設定されていません'
        };
      }
      
      return {
        success: true,
        message: 'セッションクリーンアップ正常'
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * ファイルアップロード統合テスト（実際のAPIは呼ばない）
   */
  static testFileUploadIntegration() {
    try {
      // 注意: 実際のAPIは呼ばずに内部ロジックのみテスト
      console.log('📝 注意: 実際のGemini File APIは呼ばれません（統合テストで実行）');
      
      const limits = GeminiFileAPI.getFileApiLimits();
      
      if (!limits.supportedMimeTypes.includes('image/jpeg')) {
        return {
          success: false,
          error: 'JPEG形式がサポートされていません'
        };
      }
      
      return {
        success: true,
        message: 'ファイルアップロード統合テスト準備完了'
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// 簡易テスト実行関数
function runGeminiFileAPITests() {
  return TestGeminiFileAPI.runAllTests();
}

// 個別テスト実行関数
function testFileApiLimits() {
  return TestGeminiFileAPI.testFileApiLimits();
}

function testFileValidation() {
  return TestGeminiFileAPI.testFileValidation();
}

function testChatSessionCreation() {
  return TestGeminiFileAPI.testChatSessionCreation();
}