// ===== Gemini File API 統合モジュール =====

/**
 * Gemini File API クラス
 * Google Drive ファイルをGemini File APIにアップロードし、画像解析・質問応答を提供
 */
class GeminiFileAPI {

  /**
   * Gemini File API の制限・設定
   */
  static getFileApiLimits() {
    return {
      maxFileSize: 20 * 1024 * 1024,  // 20MB
      supportedMimeTypes: [
        'image/jpeg',
        'image/png', 
        'image/gif',
        'image/webp',
        'application/pdf'
      ],
      maxFilesPerRequest: 16,         // 最大16ファイル同時
      sessionTimeoutMs: 30 * 60 * 1000  // 30分
    };
  }

  /**
   * Google Drive ファイルをGemini File APIにアップロード
   * @param {string} driveFileId Google Drive ファイルID
   * @returns {Object} アップロード結果 {success, fileUri, displayName, error}
   */
  static uploadFileToGemini(driveFileId) {
    const startTime = new Date();
    console.log(`📤 File API アップロード開始: ${driveFileId}`);
    
    try {
      // 設定取得
      const config = ConfigManager.getConfig();
      if (!config.geminiApiKey) {
        throw new Error('Gemini APIキーが設定されていません');
      }

      // Google Drive ファイル取得
      const driveFile = DriveApp.getFileById(driveFileId);
      const fileName = driveFile.getName();
      const fileSize = driveFile.getSize();
      const mimeType = driveFile.getBlob().getContentType();
      
      console.log(`📄 ファイル情報: ${fileName} (${Utils.formatFileSize(fileSize)}, ${mimeType})`);
      
      // ファイル制限チェック
      this.validateFileForUpload(driveFile);
      
      // Gemini File API にアップロード
      const uploadResult = this.performFileUpload(driveFile, config.geminiApiKey);
      
      const endTime = new Date();
      const uploadTime = (endTime - startTime) / 1000;
      
      console.log(`✅ File API アップロード完了 (${uploadTime}秒)`);
      console.log(`📍 File URI: ${uploadResult.uri}`);
      
      return {
        success: true,
        fileUri: uploadResult.uri,
        displayName: uploadResult.displayName,
        fileName: fileName,
        fileSize: fileSize,
        mimeType: mimeType,
        uploadTime: uploadTime
      };
      
    } catch (error) {
      console.error('❌ File API アップロードエラー:', error);
      return {
        success: false,
        error: ErrorHandler.handleApiError(error, 'Gemini File API'),
        fileId: driveFileId
      };
    }
  }

  /**
   * アップロードファイルの検証
   * @param {DriveApp.File} driveFile Google Drive ファイル
   */
  static validateFileForUpload(driveFile) {
    const limits = this.getFileApiLimits();
    const fileSize = driveFile.getSize();
    const mimeType = driveFile.getBlob().getContentType();
    
    // ファイルサイズチェック
    if (fileSize > limits.maxFileSize) {
      throw new Error(`ファイルサイズが制限を超えています (${Utils.formatFileSize(fileSize)} > ${Utils.formatFileSize(limits.maxFileSize)})`);
    }
    
    // MIME タイプチェック
    if (!limits.supportedMimeTypes.includes(mimeType)) {
      throw new Error(`サポートされていないファイル形式です: ${mimeType}`);
    }
    
    console.log('✅ ファイル検証完了');
  }

  /**
   * 実際のファイルアップロード処理
   * @param {DriveApp.File} driveFile Google Drive ファイル
   * @param {string} apiKey Gemini APIキー
   * @returns {Object} アップロード結果
   */
  static performFileUpload(driveFile, apiKey) {
    const fileName = driveFile.getName();
    const blob = driveFile.getBlob();
    
    console.log('📤 Gemini File API リクエスト送信中...');
    
    // Gemini File API エンドポイント
    const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;
    
    // マルチパート形式でアップロード
    const boundary = '----formdata-gas-' + Utilities.getUuid();
    const payload = this.createMultipartPayload(fileName, blob, boundary);
    
    console.log(`🔗 Boundary: ${boundary}`);
    console.log(`📤 アップロードURL: ${uploadUrl}`);
    
    const response = UrlFetchApp.fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      payload: payload,
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    console.log(`📥 File API レスポンス: ${responseCode}`);
    
    if (responseCode !== 200) {
      console.error('File API エラーレスポンス:', responseText);
      console.error('リクエストヘッダー:', response.getAllHeaders());
      console.error('ペイロードサイズ:', payload.getBytes().length);
      throw new Error(`File API エラー (${responseCode}): ${responseText}`);
    }
    
    const result = JSON.parse(response.getContentText());
    
    if (!result.file || !result.file.uri) {
      console.error('File API 不正レスポンス:', result);
      throw new Error('File API から不正なレスポンスを受信しました');
    }
    
    console.log('✅ File API アップロード成功');
    console.log(`ファイル URI: ${result.file.uri}`);
    console.log(`表示名: ${result.file.displayName}`);
    console.log(`ファイル状態: ${result.file.state}`);
    
    // ファイル処理完了待ち
    if (result.file.state === 'PROCESSING') {
      console.log('⏳ ファイル処理中、完了を待機...');
      const waitResult = this.waitForFileProcessing(result.file.uri, apiKey);
      if (!waitResult) {
        console.warn('⚠️ ファイル処理完了の確認ができませんでした');
      }
    } else if (result.file.state === 'ACTIVE') {
      console.log('✅ ファイルは既にACTIVE状態です');
    } else {
      console.log(`ℹ️ ファイル状態: ${result.file.state}`);
    }
    
    // 追加の安全待機 - チャット使用前の確認
    console.log('🔍 ファイル状態の最終確認...');
    Utilities.sleep(2000);
    this.verifyFileIsReady(result.file.uri, apiKey);
    
    return {
      uri: result.file.uri,
      displayName: result.file.displayName,
      state: result.file.state
    };
  }

  /**
   * ファイル処理完了を待機
   * @param {string} fileUri ファイルURI
   * @param {string} apiKey APIキー
   */
  static waitForFileProcessing(fileUri, apiKey, maxWaitTime = 30000) {
    const startTime = new Date();
    const maxWait = maxWaitTime; // 30秒
    
    console.log(`⏳ ファイル処理完了待機開始: ${fileUri}`);
    
    while ((new Date() - startTime) < maxWait) {
      try {
        // ファイル状態確認
        const statusUrl = `https://generativelanguage.googleapis.com/v1beta/${fileUri}?key=${apiKey}`;
        const response = UrlFetchApp.fetch(statusUrl, {
          method: 'GET',
          muteHttpExceptions: true
        });
        
        if (response.getResponseCode() === 200) {
          const fileInfo = JSON.parse(response.getContentText());
          console.log(`📊 ファイル状態: ${fileInfo.state}`);
          
          if (fileInfo.state === 'ACTIVE') {
            console.log('✅ ファイル処理完了');
            return true;
          } else if (fileInfo.state === 'FAILED') {
            console.error('❌ ファイル処理失敗');
            throw new Error('ファイル処理が失敗しました');
          }
        }
        
        // 2秒待機
        console.log('⏱️ 2秒待機...');
        Utilities.sleep(2000);
        
      } catch (error) {
        console.error('ファイル状態確認エラー:', error);
        Utilities.sleep(2000);
      }
    }
    
    console.warn('⚠️ ファイル処理完了のタイムアウト');
    return false;
  }

  /**
   * ファイルがチャット準備完了かを確認
   * @param {string} fileUri ファイルURI
   * @param {string} apiKey APIキー
   */
  static verifyFileIsReady(fileUri, apiKey) {
    try {
      console.log(`🔍 ファイル準備状態確認: ${fileUri}`);
      
      const statusUrl = `https://generativelanguage.googleapis.com/v1beta/${fileUri}?key=${apiKey}`;
      const response = UrlFetchApp.fetch(statusUrl, {
        method: 'GET',
        muteHttpExceptions: true
      });
      
      const responseCode = response.getResponseCode();
      console.log(`📥 ファイル状態確認レスポンス: ${responseCode}`);
      
      if (responseCode === 200) {
        const fileInfo = JSON.parse(response.getContentText());
        console.log(`📊 最終ファイル状態: ${fileInfo.state}`);
        console.log(`📊 ファイル詳細: ${JSON.stringify(fileInfo, null, 2)}`);
        
        if (fileInfo.state === 'ACTIVE') {
          console.log('✅ ファイルはチャット使用準備完了');
          return true;
        } else {
          console.warn(`⚠️ ファイル状態が不適切: ${fileInfo.state}`);
          return false;
        }
      } else if (responseCode === 404) {
        // 404エラーは一般的（ファイルアップロード直後に発生しやすい）
        console.warn(`⚠️ ファイル状態確認で404エラー（一般的な現象）: ${fileUri}`);
        console.log('💡 ファイルはアップロード成功しているため、チャットは試行可能です');
        return true; // 404でもtrueを返してチャットを続行
      } else {
        console.error(`❌ ファイル状態確認失敗: ${responseCode}`);
        console.error(`レスポンス内容: ${response.getContentText()}`);
        return false;
      }
      
    } catch (error) {
      console.error('❌ ファイル準備状態確認エラー:', error);
      return false;
    }
  }

  /**
   * マルチパート形式のペイロード作成（修正版）
   * @param {string} fileName ファイル名
   * @param {Blob} blob ファイルデータ
   * @param {string} boundary バウンダリ文字列
   * @returns {Blob} マルチパートペイロード
   */
  static createMultipartPayload(fileName, blob, boundary) {
    console.log('📋 マルチパート作成開始');
    console.log(`📄 ファイル名: ${fileName}`);
    console.log(`📄 MIME Type: ${blob.getContentType()}`);
    console.log(`🔗 Boundary: ${boundary}`);
    
    // RFC 7578に準拠したマルチパート形式
    const parts = [];
    
    // メタデータ部分
    const metadata = {
      file: {
        displayName: fileName
      }
    };
    
    const metadataJson = JSON.stringify(metadata);
    console.log('📋 メタデータ JSON:', metadataJson);
    
    // Part 1: メタデータ
    let part1 = `--${boundary}\r\n`;
    part1 += 'Content-Disposition: form-data; name="metadata"\r\n';
    part1 += 'Content-Type: application/json; charset=UTF-8\r\n';
    part1 += '\r\n';
    part1 += metadataJson + '\r\n';
    
    parts.push(Utilities.newBlob(part1, 'text/plain').getBytes());
    
    // Part 2: ファイル
    let part2Header = `--${boundary}\r\n`;
    part2Header += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
    part2Header += `Content-Type: ${blob.getContentType()}\r\n`;
    part2Header += '\r\n';
    
    parts.push(Utilities.newBlob(part2Header, 'text/plain').getBytes());
    parts.push(blob.getBytes());
    
    // 終了部分
    const footer = `\r\n--${boundary}--\r\n`;
    parts.push(Utilities.newBlob(footer, 'text/plain').getBytes());
    
    // 合計サイズ計算
    const totalSize = parts.reduce((sum, part) => sum + part.length, 0);
    console.log(`📏 合計サイズ: ${totalSize} bytes`);
    
    // 効率的な結合
    const allBytes = new Array(totalSize);
    let offset = 0;
    
    for (const part of parts) {
      for (let i = 0; i < part.length; i++) {
        allBytes[offset + i] = part[i];
      }
      offset += part.length;
    }
    
    console.log('✅ マルチパート作成完了');
    return Utilities.newBlob(allBytes);
  }

  /**
   * アップロードされたファイルでチャットセッション作成
   * @param {string} uploadedFileUri Gemini File API ファイル URI
   * @param {string} systemInstruction システム指示（オプション）
   * @param {string} originalMimeType 元のMIMEタイプ（オプション）
   * @returns {Object} チャットセッション
   */
  static createChatSession(uploadedFileUri, systemInstruction = null, originalMimeType = null) {
    console.log(`💬 チャットセッション作成: ${uploadedFileUri}`);
    
    try {
      const sessionId = Utils.generateId(12);
      const session = {
        sessionId: sessionId,
        fileUri: uploadedFileUri,
        originalMimeType: originalMimeType,
        systemInstruction: systemInstruction || this.getDefaultSystemInstruction(),
        createdAt: new Date(),
        history: [],
        isActive: true
      };
      
      console.log(`✅ チャットセッション作成完了: ${sessionId}`);
      return session;
      
    } catch (error) {
      console.error('❌ チャットセッション作成エラー:', error);
      throw error;
    }
  }

  /**
   * デフォルトのシステム指示を取得
   * @returns {string} システム指示
   */
  static getDefaultSystemInstruction() {
    return `あなたはデザイン事務所の専門AIチャットボットです。
建築図面、設計ドキュメント、画像を分析し、**400文字以内**で簡潔に回答してください。

## 回答ルール
- **必ず400文字以内で要点を絞って回答**
- マークダウン記法を使用（見出し、箇条書き、太字等）
- チャットボット形式で親しみやすく
- 専門用語は分かりやすく説明

## 回答観点（重要度順）
1. **基本情報**: 用途、規模、構造
2. **主要特徴**: デザイン、レイアウトのポイント
3. **技術仕様**: 寸法、材料（必要に応じて）
4. **改善提案**: 簡潔な提案（質問されたら）

**例外**: 概要質問は詳細回答OK、その他は400文字厳守`;
  }

  /**
   * ファイルに対して質問を実行
   * @param {Object} chatSession チャットセッション
   * @param {string} question 質問内容
   * @returns {Object} 回答結果
   */
  static askQuestion(chatSession, question) {
    const startTime = new Date();
    console.log(`❓ 質問実行: "${question.substring(0, 50)}..."`);
    
    try {
      if (!chatSession || !chatSession.isActive) {
        throw new Error('無効なチャットセッションです');
      }
      
      const config = ConfigManager.getConfig();
      if (!config.geminiApiKey) {
        throw new Error('Gemini APIキーが設定されていません');
      }
      
      // Gemini API チャット実行
      const response = this.performChatRequest(chatSession, question, config.geminiApiKey);
      
      // セッション履歴に追加
      const historyEntry = {
        question: question,
        response: response,
        timestamp: new Date()
      };
      chatSession.history.push(historyEntry);
      
      const endTime = new Date();
      const responseTime = (endTime - startTime) / 1000;
      
      console.log(`✅ 質問応答完了 (${responseTime}秒)`);
      console.log(`📝 回答: ${response.substring(0, 100)}...`);
      
      return {
        success: true,
        question: question,
        response: response,
        responseTime: responseTime,
        sessionId: chatSession.sessionId
      };
      
    } catch (error) {
      console.error('❌ 質問応答エラー:', error);
      return {
        success: false,
        question: question,
        error: ErrorHandler.handleApiError(error, 'Gemini Chat API'),
        sessionId: chatSession.sessionId
      };
    }
  }

  /**
   * Gemini Chat API リクエスト実行
   * @param {Object} chatSession チャットセッション
   * @param {string} question 質問
   * @param {string} apiKey APIキー
   * @returns {string} AI回答
   */
  static performChatRequest(chatSession, question, apiKey) {
    console.log('🤖 Gemini Chat API リクエスト送信中...');
    
    // Chat API エンドポイント
    const chatUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    // リクエストペイロード構築
    const contents = this.buildChatContents(chatSession, question);
    const payload = {
      systemInstruction: {
        parts: [{
          text: chatSession.systemInstruction
        }]
      },
      contents: contents,
      generationConfig: {
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048
      }
    };
    
    // デバッグ用の詳細ログ
    console.log(`🔍 Chat API URL: ${chatUrl}`);
    console.log(`🔍 セッション情報: ファイルURI=${chatSession.fileUri}, MIME=${chatSession.originalMimeType}`);
    console.log(`🔍 コンテンツ数: ${contents.length}`);
    console.log(`🔍 ペイロード構造:`, JSON.stringify(payload, null, 2));
    
    const response = UrlFetchApp.fetch(chatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log(`📥 Chat API レスポンス: ${responseCode}`);
    console.log(`📥 レスポンス内容: ${responseText.substring(0, 500)}...`);
    
    if (responseCode !== 200) {
      console.error('Chat API エラーレスポンス詳細:', responseText);
      console.error('リクエストペイロード:', JSON.stringify(payload, null, 2));
      throw new Error(`Chat API エラー (${responseCode}): ${responseText}`);
    }
    
    const result = JSON.parse(responseText);
    
    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
      console.error('Chat API 不正レスポンス:', result);
      console.error('送信したペイロード:', JSON.stringify(payload, null, 2));
      throw new Error('Chat API から不正なレスポンスを受信しました');
    }
    
    const generatedText = result.candidates[0].content.parts[0].text;
    
    console.log('✅ Chat API 応答取得成功');
    console.log(`📝 生成されたテキスト: ${generatedText.substring(0, 100)}...`);
    return generatedText;
  }

  /**
   * チャット用コンテンツ配列を構築
   * @param {Object} chatSession チャットセッション  
   * @param {string} currentQuestion 現在の質問
   * @returns {Array} コンテンツ配列
   */
  static buildChatContents(chatSession, currentQuestion) {
    const contents = [];
    
    console.log(`📋 チャットコンテンツ構築: ファイルURI=${chatSession.fileUri}`);
    console.log(`📋 履歴数: ${chatSession.history.length}`);
    
    // ファイル参照オブジェクトを作成（毎回使用）
    const fileRef = {
      fileData: {
        mimeType: this.getMimeTypeForGemini(chatSession.fileUri, chatSession.originalMimeType),
        fileUri: chatSession.fileUri
      }
    };
    
    console.log(`📋 ファイル参照: ${JSON.stringify(fileRef)}`);
    
    if (chatSession.history.length === 0) {
      // 初回質問 - ファイルと質問を組み合わせ
      contents.push({
        role: 'user',
        parts: [
          fileRef,
          {
            text: currentQuestion
          }
        ]
      });
    } else {
      // 履歴がある場合 - 最初の質問にファイル参照を再追加
      let isFirstUserMessage = true;
      
      chatSession.history.forEach(entry => {
        // ユーザーメッセージ
        const userParts = [{ text: entry.question }];
        
        // 最初のユーザーメッセージにはファイル参照を含める
        if (isFirstUserMessage) {
          userParts.unshift(fileRef);
          isFirstUserMessage = false;
        }
        
        contents.push({
          role: 'user',
          parts: userParts
        });
        
        // AIの応答
        contents.push({
          role: 'model', 
          parts: [{ text: entry.response }]
        });
      });
      
      // 現在の質問を追加（ファイル参照も含める）
      contents.push({
        role: 'user',
        parts: [
          fileRef,
          { text: currentQuestion }
        ]
      });
    }
    
    console.log(`📋 生成されたコンテンツ数: ${contents.length}`);
    console.log(`📋 ファイル参照を含む質問数: ${contents.filter(c => c.role === 'user' && c.parts.some(p => p.fileData)).length}`);
    return contents;
  }

  /**
   * Gemini用のMIMEタイプを取得
   * @param {string} fileUri ファイルURI
   * @param {string} originalMimeType 元のMIMEタイプ（オプション）
   * @returns {string} MIMEタイプ
   */
  static getMimeTypeForGemini(fileUri, originalMimeType = null) {
    // 元のMIMEタイプが提供されている場合はそれを使用
    if (originalMimeType) {
      return originalMimeType;
    }
    
    // ファイルURIから推測
    const uri = fileUri.toLowerCase();
    
    if (uri.includes('pdf')) {
      return 'application/pdf';
    } else if (uri.includes('jpeg') || uri.includes('jpg')) {
      return 'image/jpeg';
    } else if (uri.includes('png')) {
      return 'image/png';
    } else if (uri.includes('gif')) {
      return 'image/gif';
    } else if (uri.includes('webp')) {
      return 'image/webp';
    }
    
    // デフォルトはapplication/pdf
    return 'application/pdf';
  }

  /**
   * チャットセッションをクリーンアップ
   * @param {Object} chatSession チャットセッション
   */
  static cleanupSession(chatSession) {
    try {
      console.log(`🧹 セッションクリーンアップ: ${chatSession.sessionId}`);
      
      chatSession.isActive = false;
      chatSession.endedAt = new Date();
      
      console.log('✅ セッションクリーンアップ完了');
      
    } catch (error) {
      console.error('❌ セッションクリーンアップエラー:', error);
    }
  }

  /**
   * File API ファイル削除（オプション）
   * @param {string} fileUri Gemini File API ファイル URI
   * @param {string} apiKey APIキー
   */
  static deleteFileFromGemini(fileUri, apiKey) {
    try {
      console.log(`🗑️ File API ファイル削除: ${fileUri}`);
      
      const deleteUrl = `https://generativelanguage.googleapis.com/v1beta/${fileUri}?key=${apiKey}`;
      
      const response = UrlFetchApp.fetch(deleteUrl, {
        method: 'DELETE'
      });
      
      const responseCode = response.getResponseCode();
      if (responseCode === 200) {
        console.log('✅ ファイル削除完了');
      } else if (responseCode === 404) {
        console.log('✅ ファイル削除完了（既に削除済み）');
      } else {
        console.warn(`⚠️ ファイル削除エラー (${responseCode})`);
      }
      
    } catch (error) {
      console.warn('⚠️ ファイル削除エラー:', error);
      // 削除エラーは致命的でないため警告のみ
    }
  }
}

// 後方互換性・テスト用の関数エクスポート
function uploadFileToGemini(driveFileId) {
  return GeminiFileAPI.uploadFileToGemini(driveFileId);
}

function createChatSession(uploadedFileUri, systemInstruction, originalMimeType) {
  return GeminiFileAPI.createChatSession(uploadedFileUri, systemInstruction, originalMimeType);
}

function askQuestion(chatSession, question) {
  return GeminiFileAPI.askQuestion(chatSession, question);
}