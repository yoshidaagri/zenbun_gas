// ===== AI解析機能 直接テストモジュール =====

/**
 * AI解析機能の直接テスト
 * GAS内部で直接createAnalysisSessionを呼び出してテスト
 */

/**
 * テスト用ファイル管理ヘルパー
 */
function testFileManagement() {
  console.log('📁 ===== テスト用ファイル管理確認 =====');
  
  try {
    console.log('📋 現在のテスト用ファイル状況:');
    
    // 1. 保存済みテストファイルID確認
    const properties = PropertiesService.getScriptProperties().getProperties();
    console.log('保存済みTEST_FILE_ID:', properties.TEST_FILE_ID || '未設定');
    
    // 2. フォルダ内ファイル一覧確認
    const config = ConfigManager.getConfig();
    if (config.folderId) {
      const folder = DriveApp.getFolderById(config.folderId);
      const files = folder.getFiles();
      let fileCount = 0;
      console.log('📁 フォルダ内ファイル一覧:');
      
      while (files.hasNext()) {
        const file = files.next();
        fileCount++;
        console.log(`  ${fileCount}. ${file.getName()} (ID: ${file.getId()})`);
        if (fileCount >= 5) {
          console.log('  ... (最初の5件のみ表示)');
          break;
        }
      }
      
      if (fileCount === 0) {
        console.log('  ファイルなし - 新規作成が必要');
      }
    }
    
    // 3. 動的ファイル取得テスト
    console.log('📋 動的ファイル取得テスト:');
    const testFileId = ConfigManager.getTestFileId();
    console.log('取得されたテストファイルID:', testFileId);
    
    if (testFileId) {
      const file = DriveApp.getFileById(testFileId);
      console.log('✅ ファイル情報:');
      console.log('  名前:', file.getName());
      console.log('  形式:', file.getBlob().getContentType());
      console.log('  サイズ:', Math.round(file.getSize() / 1024) + 'KB');
    }
    
    console.log('📁 ===== テスト用ファイル管理確認完了 =====');
    return { success: true, testFileId: testFileId };
    
  } catch (error) {
    console.error('❌ テスト用ファイル管理エラー:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * createAnalysisSession関数の直接テスト
 */
function testCreateAnalysisSessionDirect() {
  console.log('🧪 ===== AI解析直接テスト開始 =====');
  
  try {
    // テスト用ファイルIDを動的に取得
    const testFileId = ConfigManager.getTestFileId();
    
    if (!testFileId) {
      console.error('❌ テスト用ファイルIDが取得できませんでした');
      return { success: false, error: 'テストファイル取得失敗' };
    }
    
    console.log('📋 テスト1: 動的取得ファイルIDでセッション作成');
    console.log('ファイルID:', testFileId);
    
    // createAnalysisSession関数を直接呼び出し
    const result = createAnalysisSession(testFileId);
    
    console.log('📊 結果分析:');
    console.log('- 結果の型:', typeof result);
    console.log('- null/undefined:', result === null || result === undefined);
    console.log('- sessionId存在:', !!(result && result.sessionId));
    console.log('- success値:', result ? result.success : 'N/A');
    console.log('- error値:', result ? result.error : 'N/A');
    
    if (result && result.sessionId) {
      console.log('✅ セッション作成成功');
      console.log('sessionId:', result.sessionId);
      console.log('fileIds:', result.fileIds);
      console.log('status:', result.status);
      console.log('multiFileMode:', result.options ? result.options.multiFileMode : 'N/A');
    } else if (result && result.error) {
      console.log('❌ セッション作成エラー');
      console.log('エラー:', result.error);
      console.log('詳細:', result.details);
    } else {
      console.log('❓ 不明な結果');
      console.log('結果:', result);
    }
    
    console.log('🧪 ===== AI解析直接テスト完了 =====');
    return result;
    
  } catch (error) {
    console.error('❌ テスト中に例外エラー:', error);
    console.error('エラーメッセージ:', error.message);
    console.error('スタック:', error.stack);
    console.log('🧪 ===== AI解析直接テスト異常終了 =====');
    return null;
  }
}

/**
 * AnalysisManager の直接テスト
 */
function testAnalysisManagerDirect() {
  console.log('🔍 ===== AnalysisManager直接テスト開始 =====');
  
  try {
    // 1. クラス存在確認
    console.log('📋 ステップ1: AnalysisManager存在確認');
    console.log('typeof AnalysisManager:', typeof AnalysisManager);
    
    if (typeof AnalysisManager === 'undefined') {
      console.error('❌ AnalysisManagerクラスが見つかりません');
      return { success: false, error: 'AnalysisManager未定義' };
    }
    
    // 2. メソッド存在確認
    console.log('📋 ステップ2: createAnalysisSessionメソッド確認');
    console.log('typeof AnalysisManager.createAnalysisSession:', typeof AnalysisManager.createAnalysisSession);
    
    if (typeof AnalysisManager.createAnalysisSession !== 'function') {
      console.error('❌ createAnalysisSessionメソッドが関数ではありません');
      return { success: false, error: 'createAnalysisSessionメソッド未定義' };
    }
    
    // 3. 実際の呼び出し
    console.log('📋 ステップ3: AnalysisManager.createAnalysisSession直接呼び出し');
    const testFileId = 'test-direct-call-file-id';
    const result = AnalysisManager.createAnalysisSession(testFileId);
    
    console.log('📊 直接呼び出し結果:');
    console.log('- 結果の型:', typeof result);
    console.log('- sessionId存在:', !!(result && result.sessionId));
    console.log('- sessionId値:', result ? result.sessionId : 'N/A');
    console.log('- ファイルID配列:', result ? result.fileIds : 'N/A');
    
    if (result && result.sessionId) {
      console.log('✅ AnalysisManager直接呼び出し成功');
      return { success: true, sessionId: result.sessionId };
    } else {
      console.log('❌ AnalysisManager直接呼び出し失敗');
      return { success: false, error: '無効な結果', result: result };
    }
    
  } catch (error) {
    console.error('❌ AnalysisManager直接テスト例外:', error);
    console.error('エラーメッセージ:', error.message);
    console.error('スタック:', error.stack);
    return { success: false, error: error.message };
  } finally {
    console.log('🔍 ===== AnalysisManager直接テスト完了 =====');
  }
}

/**
 * 依存関係の詳細確認
 */
function testDependenciesDirect() {
  console.log('🔧 ===== 依存関係詳細確認開始 =====');
  
  const dependencies = [
    'ConfigManager',
    'Utils', 
    'ErrorHandler',
    'GeminiFileAPI',
    'AnalysisManager'
  ];
  
  const results = {};
  
  dependencies.forEach(dep => {
    try {
      const exists = typeof eval(dep) !== 'undefined';
      results[dep] = exists;
      console.log(`${dep}: ${exists ? '✅' : '❌'}`);
      
      if (exists && dep === 'ConfigManager') {
        // ConfigManagerの詳細確認
        try {
          const config = ConfigManager.getConfig();
          console.log('ConfigManager.getConfig()成功:', !!config);
          console.log('geminiApiKey存在:', !!(config && config.geminiApiKey));
        } catch (configError) {
          console.error('ConfigManager.getConfig()エラー:', configError.message);
        }
      }
      
    } catch (error) {
      results[dep] = false;
      console.log(`${dep}: ❌ (評価エラー: ${error.message})`);
    }
  });
  
  console.log('🔧 ===== 依存関係詳細確認完了 =====');
  return results;
}

/**
 * processAnalysisQuestion関数の直接テスト
 */
function testProcessAnalysisQuestionDirect() {
  console.log('💬 ===== processAnalysisQuestion直接テスト開始 =====');
  
  try {
    // まずセッションを作成
    console.log('📋 ステップ1: テスト用セッション作成');
    const testFileId = ConfigManager.getTestFileId();
    
    if (!testFileId) {
      console.error('❌ テスト用ファイルIDが取得できませんでした');
      return { success: false, error: 'テストファイル取得失敗' };
    }
    
    const session = createAnalysisSession(testFileId);
    
    if (!session || !session.sessionId) {
      console.error('❌ セッション作成に失敗しました');
      return { success: false, error: 'セッション作成失敗' };
    }
    
    console.log('✅ セッション作成成功:', session.sessionId);
    
    // processAnalysisQuestion関数存在確認
    console.log('📋 ステップ2: processAnalysisQuestion関数確認');
    console.log('typeof processAnalysisQuestion:', typeof processAnalysisQuestion);
    
    if (typeof processAnalysisQuestion !== 'function') {
      console.error('❌ processAnalysisQuestion関数が見つかりません');
      return { success: false, error: 'processAnalysisQuestion関数未定義' };
    }
    
    // 実際に質問実行
    console.log('📋 ステップ3: processAnalysisQuestion直接呼び出し');
    const testQuestion = 'このドキュメントの概要を教えてください';
    console.log('質問:', testQuestion);
    
    const result = processAnalysisQuestion(session, testQuestion);
    
    console.log('📊 processAnalysisQuestion結果分析:');
    console.log('- 結果の型:', typeof result);
    console.log('- null/undefined:', result === null || result === undefined);
    console.log('- success存在:', result && typeof result.success !== 'undefined');
    console.log('- success値:', result ? result.success : 'N/A');
    console.log('- error値:', result ? result.error : 'N/A');
    console.log('- response存在:', !!(result && result.response));
    
    if (result === null || result === undefined) {
      console.log('❌ processAnalysisQuestionがnull/undefinedを返しました');
      return { success: false, error: 'null/undefinedレスポンス' };
    } else if (result && result.success === false) {
      console.log('❌ processAnalysisQuestionがエラーを返しました');
      console.log('エラー詳細:', result.error);
      return { success: false, error: result.error, details: result };
    } else if (result && result.success === true) {
      console.log('✅ processAnalysisQuestion成功');
      return { success: true, response: result.response, sessionId: result.sessionId };
    } else {
      console.log('❓ processAnalysisQuestionが不明な結果を返しました');
      console.log('結果詳細:', JSON.stringify(result, null, 2));
      return { success: false, error: '不明な結果形式', result: result };
    }
    
  } catch (error) {
    console.error('❌ processAnalysisQuestion直接テスト例外:', error);
    console.error('エラーメッセージ:', error.message);
    console.error('スタック:', error.stack);
    return { success: false, error: error.message };
  } finally {
    console.log('💬 ===== processAnalysisQuestion直接テスト完了 =====');
  }
}

/**
 * 包括的テスト実行
 */
function runAIComprehensiveTest() {
  console.log('🚀 ===== AI機能包括的テスト開始 =====');
  
  const results = {
    fileManagement: null,
    dependencies: null,
    analysisManager: null,
    createSession: null,
    processQuestion: null,
    timestamp: new Date().toISOString()
  };
  
  try {
    // 0. テスト用ファイル管理確認
    console.log('\n📋 フェーズ0: テスト用ファイル管理確認');
    results.fileManagement = testFileManagement();
    
    // 1. 依存関係確認
    console.log('\n📋 フェーズ1: 依存関係確認');
    results.dependencies = testDependenciesDirect();
    
    // 2. AnalysisManager確認
    console.log('\n📋 フェーズ2: AnalysisManager確認');
    results.analysisManager = testAnalysisManagerDirect();
    
    // 3. createAnalysisSession確認
    console.log('\n📋 フェーズ3: createAnalysisSession確認');
    results.createSession = testCreateAnalysisSessionDirect();
    
    // 4. processAnalysisQuestion確認
    console.log('\n📋 フェーズ4: processAnalysisQuestion確認');
    results.processQuestion = testProcessAnalysisQuestionDirect();
    
    // 5. 結果サマリー
    console.log('\n📊 ===== 包括的テスト結果サマリー =====');
    console.log('テストファイル管理:', results.fileManagement.success ? '✅' : '❌');
    console.log('依存関係:', Object.values(results.dependencies).every(Boolean) ? '✅' : '❌');
    console.log('AnalysisManager:', results.analysisManager.success ? '✅' : '❌');
    console.log('createSession:', results.createSession ? '✅' : '❌');
    console.log('processQuestion:', results.processQuestion ? results.processQuestion.success ? '✅' : '❌' : '❌');
    
    if (!results.fileManagement.success) {
      console.log('🚨 テストファイル管理で問題発生 - ファイルアクセスを確認してください');
    } else if (!results.createSession) {
      console.log('🚨 createAnalysisSessionで問題発生');
    } else if (!results.processQuestion || !results.processQuestion.success) {
      console.log('🚨 processAnalysisQuestionで問題発生 - これがフロントエンドnull問題の原因');
      console.log('processQuestionエラー:', results.processQuestion ? results.processQuestion.error : 'N/A');
    } else {
      console.log('✅ 全機能正常 - フロントエンド側に問題がある可能性');
    }
    
  } catch (error) {
    console.error('❌ 包括的テスト中に例外:', error);
    results.error = error.message;
  }
  
  console.log('🚀 ===== AI機能包括的テスト完了 =====');
  return results;
}