// ===== 解析セッション管理モジュール =====

/**
 * 解析セッション管理クラス
 * ファイル解析セッションの作成・管理・履歴保持を提供
 */
class AnalysisManager {

  /**
   * 新しい解析セッションを作成
   * @param {Array|string} fileIds ファイルIDの配列または単一ファイルID
   * @param {Object} options オプション設定
   * @returns {Object} 解析セッション
   */
  static createAnalysisSession(fileIds, options = {}) {
    const startTime = new Date();
    console.log('🔬 解析セッション作成開始');
    
    try {
      // ファイルIDの基本チェック
      if (fileIds === null || fileIds === undefined) {
        throw new Error('ファイルIDが指定されていません');
      }
      
      // ファイルIDを配列に正規化
      const normalizedFileIds = Array.isArray(fileIds) ? fileIds : [fileIds];
      
      if (normalizedFileIds.length === 0) {
        throw new Error('ファイルIDが指定されていません');
      }
      
      // 配列内のnull/undefinedチェック
      const validFileIds = normalizedFileIds.filter(id => id !== null && id !== undefined && id !== '');
      if (validFileIds.length === 0) {
        throw new Error('有効なファイルIDが指定されていません');
      }
      
      console.log(`📁 対象ファイル数: ${validFileIds.length}件`);
      
      // セッション基本情報
      const sessionId = Utils.generateId(16);
      const session = {
        sessionId: sessionId,
        createdAt: startTime,
        fileIds: validFileIds,
        uploadedFiles: [],
        chatSessions: [],
        currentFileIndex: 0,
        options: {
          systemInstruction: options.systemInstruction || null,
          multiFileMode: validFileIds.length > 1,
          autoCleanup: options.autoCleanup !== false, // デフォルトtrue
          maxQuestions: options.maxQuestions || 50
        },
        status: 'initializing',
        stats: {
          totalQuestions: 0,
          totalResponseTime: 0,
          errors: 0
        }
      };
      
      console.log(`✅ 解析セッション作成完了: ${sessionId}`);
      console.log(`設定: マルチファイル=${session.options.multiFileMode}, 自動クリーンアップ=${session.options.autoCleanup}`);
      
      return session;
      
    } catch (error) {
      console.error('❌ 解析セッション作成エラー:', error);
      throw error;
    }
  }

  /**
   * ファイルをアップロードしてチャットセッション準備
   * @param {Object} analysisSession 解析セッション
   * @param {number} fileIndex ファイルインデックス（オプション）
   * @returns {Object} アップロード結果
   */
  static prepareFileForAnalysis(analysisSession, fileIndex = null) {
    console.log('📤 ファイル解析準備開始');
    
    try {
      // デフォルトインデックスの修正
      const defaultIndex = analysisSession.currentFileIndex ?? 0;
      const targetIndex = fileIndex !== null && fileIndex !== undefined ? fileIndex : defaultIndex;
      
      console.log(`📤 対象インデックス: ${targetIndex}, ファイル総数: ${analysisSession.fileIds.length}`);
      
      const fileId = analysisSession.fileIds[targetIndex];
      
      if (!fileId) {
        throw new Error(`ファイルインデックス ${targetIndex} は範囲外です (ファイル総数: ${analysisSession.fileIds.length})`);
      }
      
      console.log(`📁 ファイル準備: ${fileId} (${targetIndex + 1}/${analysisSession.fileIds.length})`);
      
      // File API にアップロード
      const uploadResult = GeminiFileAPI.uploadFileToGemini(fileId);
      
      if (!uploadResult.success) {
        throw new Error(`ファイルアップロード失敗: ${uploadResult.error}`);
      }
      
      // チャットセッション作成
      const chatSession = GeminiFileAPI.createChatSession(
        uploadResult.fileUri,
        analysisSession.options.systemInstruction,
        uploadResult.mimeType
      );
      
      // セッションに追加
      const fileEntry = {
        fileId: fileId,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        uploadResult: uploadResult,
        chatSession: chatSession,
        uploadedAt: new Date(),
        isActive: true
      };
      
      // 配列の安全な初期化（防御的プログラミング）
      if (!analysisSession.uploadedFiles) {
        console.log('📤 uploadedFiles配列を初期化');
        analysisSession.uploadedFiles = [];
      }
      if (!analysisSession.chatSessions) {
        console.log('📤 chatSessions配列を初期化');
        analysisSession.chatSessions = [];
      }
      
      console.log(`📤 配列状態確認: uploadedFiles[${analysisSession.uploadedFiles.length}], chatSessions[${analysisSession.chatSessions.length}], targetIndex[${targetIndex}]`);
      
      analysisSession.uploadedFiles[targetIndex] = fileEntry;
      analysisSession.chatSessions[targetIndex] = chatSession;
      analysisSession.status = 'ready';
      
      console.log(`✅ ファイル解析準備完了: ${uploadResult.fileName}`);
      
      return {
        success: true,
        fileEntry: fileEntry,
        chatSession: chatSession
      };
      
    } catch (error) {
      console.error('❌ ファイル解析準備エラー:', error);
      analysisSession.stats.errors++;
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 質問を処理
   * @param {Object} analysisSession 解析セッション
   * @param {string} question 質問内容
   * @param {number} fileIndex 対象ファイルインデックス（オプション）
   * @returns {Object} 質問応答結果
   */
  static processQuestion(analysisSession, question, fileIndex = null) {
    const startTime = new Date();
    console.log(`❓ 質問処理開始: "${question.substring(0, 30)}..."`);
    
    try {
      // 入力値の詳細検証
      console.log(`❓ 入力値検証: session=${!!analysisSession}, question="${question}", fileIndex=${fileIndex}`);
      console.log(`❓ セッション詳細: currentFileIndex=${analysisSession?.currentFileIndex}, fileIds長=${analysisSession?.fileIds?.length}`);
      
      // currentFileIndexの安全な取得
      const defaultIndex = analysisSession?.currentFileIndex ?? 0;
      const targetIndex = (fileIndex !== null && fileIndex !== undefined) ? fileIndex : defaultIndex;
      
      console.log(`❓ 算出されたtargetIndex: ${targetIndex}`);
      
      // chatSessions配列の安全チェック
      if (!analysisSession.chatSessions) {
        console.log('❓ chatSessions配列を初期化');
        analysisSession.chatSessions = [];
      }
      
      console.log(`❓ chatSessions配列長: ${analysisSession.chatSessions.length}`);
      console.log(`❓ targetIndex範囲チェック: ${targetIndex} < ${analysisSession.chatSessions.length}`);
      
      const chatSession = analysisSession.chatSessions[targetIndex];
      console.log(`❓ 取得したchatSession: ${!!chatSession}`);
      
      if (!chatSession || !chatSession.isActive) {
        // ファイルがまだ準備されていない場合、自動準備
        console.log('📤 ファイルが未準備のため自動準備を実行');
        const prepareResult = this.prepareFileForAnalysis(analysisSession, targetIndex);
        
        if (!prepareResult.success) {
          throw new Error(`ファイル準備失敗: ${prepareResult.error}`);
        }
      }
      
      // 質問制限チェック
      if (analysisSession.stats.totalQuestions >= analysisSession.options.maxQuestions) {
        throw new Error(`質問数制限に達しました (${analysisSession.options.maxQuestions}件)`);
      }
      
      // Gemini API で質問実行
      const currentChatSession = analysisSession.chatSessions[targetIndex];
      const questionResult = GeminiFileAPI.askQuestion(currentChatSession, question);
      
      if (!questionResult.success) {
        throw new Error(`質問処理失敗: ${questionResult.error}`);
      }
      
      // 統計更新
      const responseTime = (new Date() - startTime) / 1000;
      analysisSession.stats.totalQuestions++;
      analysisSession.stats.totalResponseTime += responseTime;
      
      // 結果構築
      const result = {
        success: true,
        sessionId: analysisSession.sessionId,
        fileIndex: targetIndex,
        fileName: analysisSession.uploadedFiles[targetIndex]?.fileName || 'Unknown',
        question: question,
        response: questionResult.response,
        responseTime: responseTime,
        questionNumber: analysisSession.stats.totalQuestions,
        timestamp: new Date()
      };
      
      console.log(`✅ 質問処理完了 (${responseTime}秒)`);
      console.log(`📊 累計質問数: ${analysisSession.stats.totalQuestions}件`);
      
      return result;
      
    } catch (error) {
      console.error('❌ 質問処理エラー:', error);
      analysisSession.stats.errors++;
      
      return {
        success: false,
        sessionId: analysisSession.sessionId,
        question: question,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * マルチファイル質問処理
   * @param {Object} analysisSession 解析セッション
   * @param {string} question 質問内容
   * @returns {Array} 各ファイルの応答結果配列
   */
  static processMultiFileQuestion(analysisSession, question) {
    console.log(`📁 マルチファイル質問処理: "${question.substring(0, 30)}..."`);
    
    try {
      if (!analysisSession.options.multiFileMode) {
        throw new Error('マルチファイルモードが有効になっていません');
      }
      
      const results = [];
      
      for (let i = 0; i < analysisSession.fileIds.length; i++) {
        console.log(`📄 ファイル ${i + 1}/${analysisSession.fileIds.length} の処理中...`);
        
        const result = this.processQuestion(analysisSession, question, i);
        results.push(result);
        
        // API制限対策の待機
        if (i < analysisSession.fileIds.length - 1) {
          console.log('⏱️ API制限対策で待機中...');
          Utilities.sleep(2000);
        }
      }
      
      console.log(`✅ マルチファイル質問処理完了: ${results.length}件`);
      
      return results;
      
    } catch (error) {
      console.error('❌ マルチファイル質問処理エラー:', error);
      throw error;
    }
  }

  /**
   * セッション履歴を取得
   * @param {Object} analysisSession 解析セッション
   * @param {Object} options 取得オプション
   * @returns {Object} セッション履歴
   */
  static getSessionHistory(analysisSession, options = {}) {
    console.log(`📋 セッション履歴取得: ${analysisSession.sessionId}`);
    
    try {
      const history = {
        sessionId: analysisSession.sessionId,
        createdAt: analysisSession.createdAt,
        fileCount: analysisSession.fileIds.length,
        files: [],
        stats: analysisSession.stats,
        status: analysisSession.status
      };
      
      // ファイル別履歴
      analysisSession.uploadedFiles.forEach((fileEntry, index) => {
        if (fileEntry && analysisSession.chatSessions[index]) {
          const chatSession = analysisSession.chatSessions[index];
          
          history.files.push({
            fileIndex: index,
            fileName: fileEntry.fileName,
            fileSize: fileEntry.fileSize,
            mimeType: fileEntry.mimeType,
            uploadedAt: fileEntry.uploadedAt,
            questionCount: chatSession.history.length,
            history: options.includeDetails ? chatSession.history : chatSession.history.length
          });
        }
      });
      
      console.log(`✅ セッション履歴取得完了: ${history.files.length}ファイル`);
      
      return history;
      
    } catch (error) {
      console.error('❌ セッション履歴取得エラー:', error);
      throw error;
    }
  }

  /**
   * 分析結果をエクスポート
   * @param {Object} analysisSession 解析セッション
   * @param {string} format エクスポート形式（'text', 'json'）
   * @returns {string} エクスポートデータ
   */
  static exportAnalysisResults(analysisSession, format = 'text') {
    console.log(`📤 分析結果エクスポート: ${format}形式`);
    
    try {
      const history = this.getSessionHistory(analysisSession, { includeDetails: true });
      
      if (format === 'json') {
        return JSON.stringify(history, null, 2);
      }
      
      // テキスト形式
      let export_text = `=== 分析セッション結果 ===\n`;
      export_text += `セッションID: ${history.sessionId}\n`;
      export_text += `作成日時: ${history.createdAt.toLocaleString()}\n`;
      export_text += `ファイル数: ${history.fileCount}件\n`;
      export_text += `総質問数: ${history.stats.totalQuestions}件\n`;
      export_text += `平均応答時間: ${(history.stats.totalResponseTime / history.stats.totalQuestions || 0).toFixed(2)}秒\n`;
      export_text += `エラー数: ${history.stats.errors}件\n\n`;
      
      history.files.forEach((file, index) => {
        export_text += `--- ファイル ${index + 1}: ${file.fileName} ---\n`;
        export_text += `サイズ: ${Utils.formatFileSize(file.fileSize)}\n`;
        export_text += `形式: ${file.mimeType}\n`;
        export_text += `質問数: ${file.questionCount}件\n\n`;
        
        if (file.history && Array.isArray(file.history)) {
          file.history.forEach((qa, qaIndex) => {
            export_text += `Q${qaIndex + 1}: ${qa.question}\n`;
            export_text += `A${qaIndex + 1}: ${qa.response}\n`;
            export_text += `時刻: ${qa.timestamp.toLocaleString()}\n\n`;
          });
        }
      });
      
      console.log('✅ テキスト形式エクスポート完了');
      return export_text;
      
    } catch (error) {
      console.error('❌ 分析結果エクスポートエラー:', error);
      throw error;
    }
  }

  /**
   * 解析セッションをクリーンアップ
   * @param {Object} analysisSession 解析セッション
   * @param {boolean} deleteFiles File APIからファイルを削除するか
   */
  static cleanupSession(analysisSession, deleteFiles = false) {
    console.log(`🧹 解析セッションクリーンアップ: ${analysisSession.sessionId}`);
    
    try {
      const config = ConfigManager.getConfig();
      
      // チャットセッションのクリーンアップ
      analysisSession.chatSessions.forEach((chatSession, index) => {
        if (chatSession && chatSession.isActive) {
          GeminiFileAPI.cleanupSession(chatSession);
          
          // File API からファイル削除（オプション）
          if (deleteFiles && analysisSession.uploadedFiles[index]) {
            const fileEntry = analysisSession.uploadedFiles[index];
            if (fileEntry.uploadResult && fileEntry.uploadResult.fileUri) {
              GeminiFileAPI.deleteFileFromGemini(
                fileEntry.uploadResult.fileUri,
                config.geminiApiKey
              );
            }
          }
        }
      });
      
      // セッション状態更新
      analysisSession.status = 'completed';
      analysisSession.endedAt = new Date();
      
      const sessionDuration = (analysisSession.endedAt - analysisSession.createdAt) / 1000;
      
      console.log(`✅ 解析セッションクリーンアップ完了`);
      console.log(`📊 セッション期間: ${sessionDuration}秒`);
      console.log(`📊 処理統計: 質問${analysisSession.stats.totalQuestions}件, エラー${analysisSession.stats.errors}件`);
      
    } catch (error) {
      console.error('❌ 解析セッションクリーンアップエラー:', error);
    }
  }

  /**
   * セッション統計情報を取得
   * @param {Object} analysisSession 解析セッション
   * @returns {Object} 統計情報
   */
  static getSessionStats(analysisSession) {
    try {
      const currentTime = new Date();
      const sessionDuration = analysisSession.endedAt ?
        (analysisSession.endedAt - analysisSession.createdAt) / 1000 :
        (currentTime - analysisSession.createdAt) / 1000;
      
      const stats = {
        sessionId: analysisSession.sessionId,
        status: analysisSession.status,
        duration: sessionDuration,
        totalQuestions: analysisSession.stats.totalQuestions,
        totalErrors: analysisSession.stats.errors,
        averageResponseTime: analysisSession.stats.totalQuestions > 0 ?
          (analysisSession.stats.totalResponseTime / analysisSession.stats.totalQuestions) : 0,
        fileCount: analysisSession.fileIds.length,
        successRate: analysisSession.stats.totalQuestions > 0 ?
          ((analysisSession.stats.totalQuestions - analysisSession.stats.errors) / analysisSession.stats.totalQuestions * 100) : 100
      };
      
      return stats;
      
    } catch (error) {
      console.error('❌ セッション統計取得エラー:', error);
      return null;
    }
  }
}

// 後方互換性・テスト用の関数エクスポート（削除）
// 混乱を避けるため、この関数は削除
// フロントエンドはCode.gsのcreateAnalysisSession()を直接呼び出す

function processQuestion(analysisSession, question, fileIndex) {
  return AnalysisManager.processQuestion(analysisSession, question, fileIndex);
}

function getSessionHistory(analysisSession, options) {
  return AnalysisManager.getSessionHistory(analysisSession, options);
}