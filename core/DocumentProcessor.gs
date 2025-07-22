// ===== ドキュメント処理モジュール =====

/**
 * ドキュメント処理クラス
 * OCR、AI要約生成、ファイル解析機能を提供
 */
class DocumentProcessor {

  /**
   * ドキュメント解析のメイン処理
   * @returns {Object} 処理結果
   */
  static analyzeDocuments() {
    const startTime = new Date();
    console.log('📊 ===== ドキュメント解析開始 =====');
    console.log(`開始時刻: ${startTime.toLocaleString()}`);
    
    try {
      // 設定確認
      const config = ConfigManager.getConfig();
      if (!ConfigManager.validateConfig()) {
        throw new Error('設定が不完全です。setApiKeys()とsetupIds()を実行してください');
      }
      
      console.log('🔧 設定確認:');
      console.log('Vision API:', config.visionApiKey ? '✅設定済み' : '❌未設定');
      console.log('Gemini API:', config.geminiApiKey ? '✅設定済み' : '❌未設定');
      console.log('スプレッドシート:', config.spreadsheetId ? '✅設定済み' : '❌未設定');
      console.log('フォルダ:', config.folderId ? '✅設定済み' : '❌未設定');

      const result = this.processDocumentsInFolder(config);
      
      const endTime = new Date();
      const totalTime = (endTime - startTime) / 1000;
      
      console.log('\n📊 ===== 処理結果サマリー =====');
      console.log(`処理ファイル数: ${result.processed}件`);
      console.log(`スキップファイル数: ${result.skipped}件`);
      console.log(`エラーファイル数: ${result.errors}件`);
      console.log(`総処理時間: ${totalTime}秒`);
      console.log(`平均処理時間: ${result.processed > 0 ? (totalTime / result.processed).toFixed(2) : 0}秒/ファイル`);
      console.log(`終了時刻: ${endTime.toLocaleString()}`);
      console.log('📊 ===== ドキュメント解析完了 =====');
      
      return result;
      
    } catch (error) {
      return ErrorHandler.handleError(error, 'ドキュメント解析', {
        logToConsole: true,
        returnResult: { success: false, error: error.message, processed: 0, skipped: 0, errors: 1 }
      });
    }
  }

  /**
   * フォルダ内のドキュメントを処理
   * @param {Object} config 設定オブジェクト
   * @returns {Object} 処理結果
   */
  static processDocumentsInFolder(config) {
    console.log('📁 ステップ1: フォルダアクセス');
    const folder = DriveApp.getFolderById(config.folderId);
    console.log(`✅ フォルダ接続成功: ${folder.getName()}`);
    
    console.log('📊 ステップ2: スプレッドシート準備');
    const sheet = DatabaseManager.getSheet(config.spreadsheetId);
    DatabaseManager.ensureHeaders(sheet);
    
    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    const processingLog = [];
    
    // 対応ファイル形式
    const supportedTypes = [
      { type: MimeType.JPEG, name: 'JPEG' },
      { type: MimeType.PNG, name: 'PNG' },
      { type: MimeType.PDF, name: 'PDF' }
    ];
    
    console.log('🔍 ステップ3: ファイル処理開始');
    console.log(`📋 対応ファイル形式: ${supportedTypes.map(t => t.name).join(', ')}`);
    
    // 全ファイル形式を順次処理
    const allResults = { processed: 0, skipped: 0, errors: 0, log: [] };
    
    for (let i = 0; i < supportedTypes.length; i++) {
      const fileType = supportedTypes[i];
      console.log(`🔄 ${fileType.name}ファイル処理開始...`);
      
      try {
        const result = this.processFilesByType(folder, sheet, config, fileType);
        
        allResults.processed += result.processed;
        allResults.skipped += result.skipped;
        allResults.errors += result.errors;
        allResults.log.push(...result.log);
        
        console.log(`✅ ${fileType.name}処理完了: 処理=${result.processed}, スキップ=${result.skipped}, エラー=${result.errors}`);
        
        // ファイル形式間の処理間隔
        if (i < supportedTypes.length - 1) {
          Utilities.sleep(1000);
        }
        
      } catch (error) {
        console.error(`❌ ${fileType.name}処理エラー:`, error);
        allResults.errors++;
        allResults.log.push(`${fileType.name}処理エラー: ${error.message}`);
      }
    }
    
    console.log(`🎯 全ファイル形式処理完了: 総処理=${allResults.processed}, 総スキップ=${allResults.skipped}, 総エラー=${allResults.errors}`);
    
    return {
      success: true,
      processed: allResults.processed,
      skipped: allResults.skipped,
      errors: allResults.errors,
      log: allResults.log
    };
  }

  /**
   * 特定のファイル形式を処理
   * @param {DriveApp.Folder} folder フォルダ
   * @param {SpreadsheetApp.Sheet} sheet スプレッドシート
   * @param {Object} config 設定
   * @param {Object} fileType ファイル形式
   * @returns {Object} 処理結果
   */
  static processFilesByType(folder, sheet, config, fileType) {
    console.log(`\n📄 ${fileType.name} 形式を処理中...`);
    
    let processed = 0;
    let skipped = 0;
    let errors = 0;
    const log = [];
    
    try {
      const files = folder.getFilesByType(fileType.type);
      const fileList = [];
      
      // ファイル一覧を作成
      while (files.hasNext()) {
        fileList.push(files.next());
      }
      
      console.log(`📋 ${fileType.name} ファイル数: ${fileList.length}件`);
      
      fileList.forEach((file, index) => {
        const fileName = file.getName();
        console.log(`\n📎 [${index + 1}/${fileList.length}] 処理中: ${fileName}`);
        
        try {
          // 既に処理済みかチェック
          if (DatabaseManager.isAlreadyProcessed(fileName, sheet)) {
            console.log(`⏭️ スキップ: ${fileName} (処理済み)`);
            skipped++;
            return;
          }
          
          // ファイル処理
          const result = this.processFile(file, config, fileType);
          
          // データベースに保存
          DatabaseManager.saveDocument(sheet, {
            fileName: fileName,
            extractedText: result.extractedText,
            aiSummary: result.aiSummary,
            fileId: file.getId(),
            updateDate: new Date().toLocaleDateString('ja-JP'),
            fileType: fileType.name
          });
          
          processed++;
          log.push({
            fileName: fileName,
            fileType: fileType.name,
            success: true,
            ...result.timing
          });
          
          // APIレート制限対策
          console.log('⏱️ 待機中...');
          Utils.sleep(ConfigManager.getApiLimits().visionApiDelay);
          
        } catch (fileError) {
          console.error(`❌ ファイル処理エラー: ${fileName}`, fileError);
          errors++;
          log.push({
            fileName: fileName,
            fileType: fileType.name,
            success: false,
            error: fileError.message
          });
        }
      });
      
      console.log(`📊 ${fileType.name} 処理完了: ${processed}件処理, ${skipped}件スキップ, ${errors}件エラー`);
      
    } catch (typeError) {
      console.log(`⚠️ ${fileType.name} 形式のファイルなし または エラー:`, typeError.message);
    }
    
    return { processed, skipped, errors, log };
  }

  /**
   * 単一ファイルを処理
   * @param {DriveApp.File} file ファイル
   * @param {Object} config 設定
   * @param {Object} fileType ファイル形式
   * @returns {Object} 処理結果
   */
  static processFile(file, config, fileType) {
    const fileName = file.getName();
    
    // OCR処理
    console.log('🔍 OCR処理開始...');
    const ocrStartTime = new Date();
    const extractedText = this.extractTextFromFile(file, config.visionApiKey, fileType.type);
    const ocrTime = (new Date() - ocrStartTime) / 1000;
    console.log(`✅ OCR完了 (${ocrTime}秒): ${extractedText.substring(0, 50)}...`);
    
    // AI要約生成
    console.log('🤖 AI要約生成開始...');
    const aiStartTime = new Date();
    const aiSummary = this.generateDocumentSummary(fileName, extractedText, config.geminiApiKey);
    const aiTime = (new Date() - aiStartTime) / 1000;
    console.log(`✅ AI要約完了 (${aiTime}秒): ${aiSummary.substring(0, 50)}...`);
    
    return {
      extractedText: extractedText,
      aiSummary: aiSummary,
      timing: {
        ocrTime: ocrTime,
        aiTime: aiTime
      }
    };
  }

  /**
   * ファイルからテキストを抽出
   * @param {DriveApp.File} file ファイル
   * @param {string} apiKey Vision APIキー
   * @param {string} mimeType MIMEタイプ
   * @returns {string} 抽出されたテキスト
   */
  static extractTextFromFile(file, apiKey, mimeType) {
    try {
      if (mimeType === MimeType.PDF) {
        return this.extractTextFromPDF(file, apiKey);
      }
      
      // JPEG/PNG画像処理
      const fileName = file.getName();
      const fileSize = file.getSize();
      
      if (mimeType === MimeType.JPEG) {
        console.log('📸 JPEG画像処理開始');
        console.log(`   ファイル名: ${fileName}`);
        console.log(`   ファイルサイズ: ${Utils.formatFileSize(fileSize)}`);
        console.log('   OCR最適化モード: JPEG画像専用');
      } else if (mimeType === MimeType.PNG) {
        console.log('🖼️ PNG画像処理開始');
        console.log(`   ファイル名: ${fileName}`);
        console.log(`   ファイルサイズ: ${Utils.formatFileSize(fileSize)}`);
      }
      
      return this.extractTextFromImage(file, apiKey);
      
    } catch (error) {
      console.error('❌ OCR処理エラー:', error);
      return ErrorHandler.handleApiError(error, 'Vision API');
    }
  }

  /**
   * 画像読み込み (Gemini 1.5 Flash方式)
   * @param {DriveApp.File} imageFile 画像ファイル
   * @param {string} geminiApiKey Gemini APIキー
   * @returns {string} 抽出されたキーワード情報
   */
  static extractTextFromImageViaGemini(imageFile, geminiApiKey) {
    console.log('🤖 画像読み込み (Gemini 1.5 Flash方式) 開始...');
    
    const fileName = imageFile.getName();
    const fileId = imageFile.getId();
    const fileSize = imageFile.getSize();
    const mimeType = imageFile.getBlob().getContentType();
    
    try {
      console.log(`📸 ファイル情報: ${fileName} (${Utils.formatFileSize(fileSize)}, ${mimeType})`);
      
      // Step 1: Gemini File APIにアップロード
      console.log('📤 Step 1: Gemini File APIアップロード...');
      const uploadResult = GeminiFileAPI.uploadFileToGemini(fileId);
      
      if (!uploadResult.success) {
        throw new Error(`File APIアップロード失敗: ${uploadResult.error}`);
      }
      
      console.log(`✅ アップロード成功: ${uploadResult.fileUri}`);
      
      // Step 2: 画像解析用プロンプト作成
      const imagePrompt = this.createImageAnalysisPrompt(fileName, mimeType);
      console.log('📝 画像解析プロンプト準備完了');
      
      // Step 3: チャットセッション作成 (システム指示付き)
      console.log('💬 Step 3: チャットセッション作成...');
      const chatSession = GeminiFileAPI.createChatSession(
        uploadResult.fileUri, 
        '画像解析・キーワード抽出システム',
        uploadResult.mimeType
      );
      
      if (!chatSession || !chatSession.sessionId) {
        throw new Error(`チャットセッション作成失敗: セッションオブジェクトが無効`);
      }
      
      console.log(`✅ チャットセッション作成成功: ${chatSession.sessionId}`);
      
      // Step 4: Gemini 1.5 Flashで画像解析実行
      console.log('🔍 Step 4: 画像解析実行...');
      const analysisResult = GeminiFileAPI.askQuestion(chatSession, imagePrompt);
      
      if (!analysisResult.success) {
        throw new Error(`画像解析失敗: ${analysisResult.error}`);
      }
      
      const extractedKeywords = analysisResult.response;
      console.log(`✅ 画像解析成功: ${extractedKeywords.length}文字`);
      console.log(`📋 キーワード内容: ${extractedKeywords.substring(0, 150)}...`);
      
      // Step 5: ファイルクリーンアップ (オプション)
      try {
        console.log('🧹 ファイルクリーンアップ...');
        this.cleanupGeminiFile(uploadResult.fileUri, geminiApiKey);
      } catch (cleanupError) {
        console.warn('⚠️ ファイルクリーンアップ警告:', cleanupError.message);
      }
      
      return extractedKeywords;
      
    } catch (error) {
      console.log('⚠️ Gemini 画像処理失敗:', error.message);
      return null;
    }
  }

  /**
   * 画像からテキストを抽出 (Gemini 1.5 Flash専用版)
   * @param {DriveApp.File} file 画像ファイル
   * @param {string} apiKey Vision APIキー（使用されません）
   * @returns {string} 抽出されたテキスト
   */
  static extractTextFromImage(file, apiKey) {
    console.log('📸 画像処理を開始します... (Gemini 1.5 Flash専用版)');
    
    const fileName = file.getName();
    const fileSize = file.getSize();
    const mimeType = file.getBlob().getContentType();
    
    console.log(`📋 画像ファイル情報:`);
    console.log(`   ファイル名: ${fileName}`);
    console.log(`   サイズ: ${Utils.formatFileSize(fileSize)}`);
    console.log(`   形式: ${mimeType}`);
    
    // Gemini 1.5 Flash処理のみ実行
    console.log('🤖 Gemini 1.5 Flash処理開始...');
    
    try {
      const config = ConfigManager.getConfig();
      if (!config.geminiApiKey) {
        throw new Error('Gemini APIキーが設定されていません');
      }
      
      const geminiResult = this.extractTextFromImageViaGemini(file, config.geminiApiKey);
      
      if (geminiResult && geminiResult.trim() !== '' && geminiResult !== '読み取れませんでした') {
        console.log('✅ Gemini 1.5 Flash処理成功');
        console.log(`📝 キーワード抽出結果: ${geminiResult.length}文字`);
        return geminiResult;
      } else {
        throw new Error('Gemini 1.5 Flash処理で有効な結果が得られませんでした');
      }
      
    } catch (geminiError) {
      console.log('⚠️ Gemini 1.5 Flash処理エラー:', geminiError.message);
      
      // 最終フォールバック - ファイル名ベース情報生成
      console.log('📝 最終フォールバック: ファイル名ベース情報生成');
      return this.generateImageBasedInfo(fileName, fileSize, mimeType);
    }
  }

  /**
   * PDF読み込み (Gemini 1.5 Flash方式)
   * @param {DriveApp.File} pdfFile PDFファイル
   * @param {string} geminiApiKey Gemini APIキー
   * @returns {string} 抽出されたキーワード情報
   */
  static extractTextFromPdfViaGemini(pdfFile, geminiApiKey) {
    console.log('🤖 PDF読み込み (Gemini 1.5 Flash方式) 開始...');
    
    const fileName = pdfFile.getName();
    const fileId = pdfFile.getId();
    const fileSize = pdfFile.getSize();
    
    try {
      console.log(`📄 ファイル情報: ${fileName} (${Utils.formatFileSize(fileSize)})`);
      
      // Step 1: Gemini File APIにアップロード
      console.log('📤 Step 1: Gemini File APIアップロード...');
      const uploadResult = GeminiFileAPI.uploadFileToGemini(fileId);
      
      if (!uploadResult.success) {
        throw new Error(`File APIアップロード失敗: ${uploadResult.error}`);
      }
      
      console.log(`✅ アップロード成功: ${uploadResult.fileUri}`);
      
      // Step 2: キーワード抽出用プロンプト作成
      const keywordPrompt = this.createPdfKeywordExtractionPrompt(fileName);
      console.log('📝 キーワード抽出プロンプト準備完了');
      
      // Step 3: チャットセッション作成 (システム指示付き)
      console.log('💬 Step 3: チャットセッション作成...');
      const chatSession = GeminiFileAPI.createChatSession(
        uploadResult.fileUri, 
        'PDF文書解析・キーワード抽出システム',
        uploadResult.mimeType
      );
      
      if (!chatSession || !chatSession.sessionId) {
        throw new Error(`チャットセッション作成失敗: セッションオブジェクトが無効`);
      }
      
      console.log(`✅ チャットセッション作成成功: ${chatSession.sessionId}`);
      
      // Step 4: Gemini 1.5 FlashでPDF解析実行
      console.log('🔍 Step 4: PDF解析実行...');
      const analysisResult = GeminiFileAPI.askQuestion(chatSession, keywordPrompt);
      
      if (!analysisResult.success) {
        throw new Error(`PDF解析失敗: ${analysisResult.error}`);
      }
      
      const extractedKeywords = analysisResult.response;
      console.log(`✅ PDF解析成功: ${extractedKeywords.length}文字`);
      console.log(`📋 キーワード内容: ${extractedKeywords.substring(0, 150)}...`);
      
      // Step 5: ファイルクリーンアップ (オプション)
      try {
        console.log('🧹 ファイルクリーンアップ...');
        this.cleanupGeminiFile(uploadResult.fileUri, geminiApiKey);
      } catch (cleanupError) {
        console.warn('⚠️ ファイルクリーンアップ警告:', cleanupError.message);
      }
      
      return extractedKeywords;
      
    } catch (error) {
      console.log('⚠️ Gemini PDF処理失敗:', error.message);
      return null;
    }
  }



  /**
   * PDFからテキストを抽出 (Gemini 1.5 Flash専用版)
   * @param {DriveApp.File} file PDFファイル
   * @param {string} apiKey Vision APIキー（使用されません）
   * @returns {string} 抽出されたテキスト
   */
  static extractTextFromPDF(file, apiKey) {
    console.log('📄 PDF処理を開始します... (Gemini 1.5 Flash専用版)');
    
    const fileName = file.getName();
    const fileSize = file.getSize();
    const lastModified = file.getLastUpdated();
    
    console.log(`📋 PDFファイル情報:`);
    console.log(`   ファイル名: ${fileName}`);
    console.log(`   サイズ: ${Utils.formatFileSize(fileSize)}`);
    console.log(`   更新日: ${lastModified.toLocaleDateString()}`);
    
    // Gemini 1.5 Flash処理のみ実行
    console.log('🤖 Gemini 1.5 Flash処理開始...');
    
    try {
      const config = ConfigManager.getConfig();
      if (!config.geminiApiKey) {
        throw new Error('Gemini APIキーが設定されていません');
      }
      
      const geminiResult = this.extractTextFromPdfViaGemini(file, config.geminiApiKey);
      
      if (geminiResult && geminiResult.trim() !== '' && geminiResult !== '読み取れませんでした') {
        console.log('✅ Gemini 1.5 Flash処理成功');
        console.log(`📝 キーワード抽出結果: ${geminiResult.length}文字`);
        return geminiResult;
      } else {
        throw new Error('Gemini 1.5 Flash処理で有効な結果が得られませんでした');
      }
      
    } catch (geminiError) {
      console.log('⚠️ Gemini 1.5 Flash処理エラー:', geminiError.message);
      
      // 最終フォールバック - ファイル名ベース情報生成
      console.log('📝 最終フォールバック: ファイル名ベース情報生成');
      return this.generateFileBasedInfo(fileName, fileSize, lastModified);
    }
  }

  /**
   * Vision APIレスポンスを解析
   * @param {Object} result Vision APIレスポンス
   * @returns {string} 抽出されたテキスト
   */
  static parseVisionApiResponse(result) {
    if (result.responses && result.responses[0]) {
      const response_data = result.responses[0];
      
      if (response_data.error) {
        console.error('Vision API エラー:', response_data.error);
        // エラーの場合は例外をスローしてcatch文で適切にハンドリング
        throw new Error('Vision API エラー: ' + response_data.error.message);
      }
      
      let extractedText = '';
      
      // 文書テキスト検出を優先使用
      if (response_data.fullTextAnnotation && response_data.fullTextAnnotation.text) {
        extractedText = response_data.fullTextAnnotation.text;
        console.log('✅ 文書テキスト検出で抽出成功');
      }
      // 通常のテキスト検出をフォールバック
      else if (response_data.textAnnotations && response_data.textAnnotations.length > 0) {
        extractedText = response_data.textAnnotations[0].description || '';
        console.log('✅ 通常テキスト検出で抽出成功');
      }
      
      // ラベル検出情報を追加（画像認識強化）
      let labelInfo = '';
      if (response_data.labelAnnotations && response_data.labelAnnotations.length > 0) {
        console.log('🏷️ ラベル検出情報を追加');
        const labels = response_data.labelAnnotations
          .filter(label => label.score > 0.7) // 信頼度70%以上
          .slice(0, 10) // 上位10件
          .map(label => `${label.description}(${Math.round(label.score * 100)}%)`)
          .join(', ');
        
        if (labels) {
          labelInfo = `\n\n画像内容: ${labels}`;
          console.log(`🏷️ 検出ラベル: ${labels}`);
        }
      }
      
      // 色情報を追加（IMAGE_PROPERTIES）
      let colorInfo = '';
      if (response_data.imagePropertiesAnnotation && response_data.imagePropertiesAnnotation.dominantColors) {
        const colors = response_data.imagePropertiesAnnotation.dominantColors.colors
          .slice(0, 3) // 上位3色
          .map(color => {
            const r = Math.round(color.color.red || 0);
            const g = Math.round(color.color.green || 0);
            const b = Math.round(color.color.blue || 0);
            return `RGB(${r},${g},${b})`;
          })
          .join(', ');
        
        if (colors) {
          colorInfo = `\n主要色: ${colors}`;
          console.log(`🎨 主要色情報: ${colors}`);
        }
      }
      
      // テキスト + ラベル + 色情報を統合
      const finalText = extractedText + labelInfo + colorInfo;
      
      if (finalText && finalText.trim() !== '') {
        const cleanedText = Utils.cleanText(finalText);
        console.log(`📝 統合テキスト長: ${cleanedText.length}文字`);
        console.log(`📄 統合内容プレビュー: ${cleanedText.substring(0, 100)}...`);
        
        // テキストが少ない場合はラベル情報を重視
        if (extractedText.length < 50 && labelInfo) {
          console.log('📸 テキスト少量 - ラベル情報を重視した画像認識結果');
        }
        
        return cleanedText;
      }
    }
    
    console.log('⚠️ テキスト・画像内容が検出されませんでした');
    return '読み取れませんでした';
  }

  /**
   * 画像ベースの情報を生成
   * @param {string} fileName ファイル名
   * @param {number} fileSize ファイルサイズ
   * @param {string} mimeType MIMEタイプ
   * @returns {string} 生成された情報
   */
  static generateImageBasedInfo(fileName, fileSize, mimeType) {
    console.log('📝 画像情報ベースでテキスト生成します...');
    
    let imageInfo = `画像ファイル: ${fileName}\n`;
    imageInfo += `形式: ${mimeType}\n`;
    imageInfo += `サイズ: ${Utils.formatFileSize(fileSize)}\n`;
    imageInfo += `処理状況: Gemini API処理失敗のためファイル名解析結果\n`;
    
    const keywords = Utils.extractKeywordsFromFilename(fileName);
    if (keywords.length > 0) {
      imageInfo += `推定キーワード: ${keywords.join(', ')}\n`;
    }
    
    const detailedInfo = Utils.extractDetailedInfoFromFilename(fileName);
    if (detailedInfo.length > 0) {
      imageInfo += `詳細情報: ${detailedInfo.join(', ')}\n`;
    }
    
    // 画像形式特有の情報
    if (mimeType === MimeType.JPEG || mimeType === 'image/jpeg') {
      imageInfo += `画像種別: JPEG写真・図面画像\n`;
    } else if (mimeType === MimeType.PNG || mimeType === 'image/png') {
      imageInfo += `画像種別: PNG図面・スクリーンショット\n`;
    }
    
    return imageInfo;
  }

  /**
   * ファイル名ベースの情報を生成
   * @param {string} fileName ファイル名
   * @param {number} fileSize ファイルサイズ
   * @param {Date} lastModified 最終更新日
   * @returns {string} 生成された情報
   */
  static generateFileBasedInfo(fileName, fileSize, lastModified) {
    console.log('📝 ファイル情報ベースでテキスト生成します...');
    
    let pdfInfo = `PDFファイル: ${fileName}\n`;
    pdfInfo += `サイズ: ${Utils.formatFileSize(fileSize)}\n`;
    pdfInfo += `更新日: ${Utils.formatDate(lastModified)}\n`;
    pdfInfo += `処理状況: Gemini API処理失敗のためファイル名解析結果\n`;
    
    const keywords = Utils.extractKeywordsFromFilename(fileName);
    if (keywords.length > 0) {
      pdfInfo += `推定キーワード: ${keywords.join(', ')}\n`;
    }
    
    const detailedInfo = Utils.extractDetailedInfoFromFilename(fileName);
    if (detailedInfo.length > 0) {
      pdfInfo += `詳細情報: ${detailedInfo.join(', ')}\n`;
    }
    
    return pdfInfo;
  }

  /**
   * Gemini Flash 2.5による概要生成
   * @param {string} fileName ファイル名
   * @param {string} extractedText 抽出テキスト
   * @param {string} geminiApiKey Gemini APIキー
   * @returns {string} AI生成概要
   */
  static generateDocumentSummary(fileName, extractedText, geminiApiKey) {
    const startTime = new Date();
    console.log(`🤖 AI要約生成開始: ${fileName}`);
    console.log(`入力テキスト長: ${extractedText.length}文字`);
    
    try {
      const prompt = this.createSummaryPrompt(fileName, extractedText);
      
      console.log('📤 Gemini APIリクエスト送信中...');
      
      const payload = {
        "contents": [{
          "parts": [{
            "text": prompt
          }]
        }],
        "generationConfig": {
          "temperature": 0.1,
          "topK": 1,
          "topP": 1,
          "maxOutputTokens": 200
        }
      };

      // 設定可能なGeminiモデルエンドポイントを使用
      const apiEndpoint = `${ConfigManager.getGeminiApiEndpoint()}?key=${geminiApiKey}`;
      console.log(`🤖 使用モデル: ${ConfigManager.getGeminiModel()}`);
      
      const response = UrlFetchApp.fetch(
        apiEndpoint,
        {
          'method': 'POST',
          'headers': { 'Content-Type': 'application/json' },
          'payload': JSON.stringify(payload)
        }
      );

      console.log(`📥 Gemini APIレスポンス受信: ${response.getResponseCode()}`);
      
      const result = JSON.parse(response.getContentText());
      
      if (result.candidates && result.candidates[0]) {
        const generatedText = result.candidates[0].content.parts[0].text;
        const cleanedText = generatedText.replace(/\n/g, ' ').trim();
        
        const endTime = new Date();
        const processingTime = (endTime - startTime) / 1000;
        
        console.log(`✅ AI要約生成成功 (${processingTime}秒)`);
        console.log(`出力テキスト長: ${cleanedText.length}文字`);
        console.log(`要約内容: ${cleanedText.substring(0, 100)}...`);
        
        return cleanedText;
      }
      
      console.error('❌ Gemini APIレスポンスが空です');
      return 'AI概要生成に失敗しました';
      
    } catch (error) {
      console.error('❌ Gemini API エラー詳細:', error);
      return ErrorHandler.handleApiError(error, 'Gemini API');
    }
  }

  /**
   * 画像解析用プロンプトを作成
   * @param {string} fileName ファイル名
   * @param {string} mimeType MIMEタイプ
   * @returns {string} プロンプト
   */
  static createImageAnalysisPrompt(fileName, mimeType) {
    return `
あなたはGemini 2.0 Flashを使用したデザイン事務所検索システムです。この画像から検索用キーワードを抽出してください。

ファイル名: ${fileName}
画像形式: ${mimeType}

【Gemini 2.0 Flash最適化指示】
- 高精度な画像認識機能を活用し、細部まで詳細に解析してください
- 建築・デザイン専門用語の理解を活用し、正確な分類を行ってください
- 文字認識の向上を活用し、図面内の文字情報を正確に抽出してください

【抽出すべき項目】
1. 図面種別（平面図、立面図、断面図、詳細図、外観パース、内観パース、配置図など）
2. 建物・空間情報（建物名、部屋名、エリア名、住所、プロジェクト名など）
3. 用途・機能（住宅、店舗、オフィス、会議室、キッチン、寝室、リビングなど）
4. 視覚的特徴（色調、材質、形状、レイアウト、スタイル、デザインテーマなど）
5. 文字情報（看板、ラベル、寸法、注釈、タイトル、図面番号など）
6. 人物・物体（家具、設備、装飾、植栽、照明器具など）
7. 建築要素（柱、梁、階段、窓、扉、壁、屋根、構造要素など）
8. 数値情報（寸法、面積、階数、縮尺、レベルなど）
9. 地名・住所・固有名詞（クライアント名、設計者名、施工会社名など）

【出力形式】
- 300文字以内で簡潔に
- 検索しやすいキーワード形式で出力
- 重要度順に並べる（最重要項目を先頭に）
- 建築・デザイン専門用語を積極的に含める
- 画像から読み取れる文字は正確に抽出
- Gemini 2.0の高精度認識を活用した詳細分析

この画像の内容をGemini 2.0 Flashの高度な画像解析能力で詳細に分析し、上記の観点でキーワードを抽出してください。
`;
  }

  /**
   * PDFキーワード抽出用プロンプトを作成
   * @param {string} fileName ファイル名
   * @returns {string} プロンプト
   */
  static createPdfKeywordExtractionPrompt(fileName) {
    return `
あなたはGemini 2.0 Flashを使用したデザイン事務所検索システムです。このPDF文書から検索用キーワードを抽出してください。

【Gemini 2.0 Flash最適化指示】
- 高度な文書理解機能を活用し、PDF内容を詳細に解析してください
- 建築・デザイン分野の専門知識を活用し、技術的内容を正確に理解してください
- 長文処理能力の向上を活用し、複数ページの文書も包括的に分析してください

ファイル名: ${fileName}

【抽出すべき項目】
1. プロジェクト名・建物名・施設名
2. 設計種別（平面図、立面図、詳細図、配置図など）
3. 建物用途（住宅、店舗、オフィス、病院など）
4. 構造・仕様（RC造、木造、鉄骨造など）
5. 重要な寸法・数値・面積
6. 地名・住所・場所
7. 設計者・施主・関係者名
8. 日付・年月
9. 特徴的な設備・要素

【出力形式】
- 300文字以内で簡潔に
- 検索しやすいキーワード形式
- 重要度順に並べる
- 建築・設計専門用語を含める

このPDF文書の内容を解析し、上記の観点でキーワードを抽出してください。
`;
  }

  /**
   * AI要約用プロンプトを作成
   * @param {string} fileName ファイル名
   * @param {string} extractedText 抽出テキスト
   * @returns {string} プロンプト
   */
  static createSummaryPrompt(fileName, extractedText) {
    try {
      // 現在の業種設定からAIプロンプトを取得
      const industryConfig = ConfigManager.getIndustryConfig();
      const industryPrompt = industryConfig.aiPrompt || 'あなたは文書解析の専門AIです。';
      
      console.log(`🤖 業種特化プロンプト使用: ${industryConfig.name}`);
      
      return `
${industryPrompt}

以下のドキュメント情報から、重要なポイントを簡潔にまとめてください。

ファイル名: ${fileName}
抽出テキスト: ${extractedText}

400文字以内で簡潔に、専門用語を使って検索しやすい形式でまとめてください。
`;
    } catch (error) {
      console.error('❌ 業種設定取得エラー - デフォルトプロンプト使用:', error);
      
      // フォールバック: デフォルトプロンプト
      return `
あなたは文書解析の専門AIです。
以下のドキュメント情報から、重要なポイントを簡潔にまとめてください。

ファイル名: ${fileName}
抽出テキスト: ${extractedText}

400文字以内で簡潔に、検索しやすい形式でまとめてください。
`;
    }
  }

  /**
   * Geminiファイルクリーンアップ
   * @param {string} fileUri ファイルURI
   * @param {string} apiKey APIキー
   */
  static cleanupGeminiFile(fileUri, apiKey) {
    try {
      console.log(`🗑️ Geminiファイル削除: ${fileUri}`);
      
      const deleteUrl = `https://generativelanguage.googleapis.com/v1beta/${fileUri}?key=${apiKey}`;
      const response = UrlFetchApp.fetch(deleteUrl, {
        method: 'DELETE',
        muteHttpExceptions: true
      });
      
      const responseCode = response.getResponseCode();
      if (responseCode === 200 || responseCode === 204) {
        console.log('✅ Geminiファイル削除成功');
      } else {
        console.log(`⚠️ Geminiファイル削除警告: ${responseCode}`);
      }
      
    } catch (error) {
      console.warn('⚠️ Geminiファイルクリーンアップエラー:', error.message);
    }
  }

  /**
   * MIME TypeからファイルタイプNameを取得
   * @param {string} mimeType MIMEタイプ
   * @returns {string} ファイルタイプ名
   */
  static getFileTypeFromMime(mimeType) {
    switch (mimeType) {
      case MimeType.JPEG: return 'JPEG';
      case MimeType.PNG: return 'PNG';
      case MimeType.PDF: return 'PDF';
      default: return 'Unknown';
    }
  }

  /**
   * ファイル形式に応じたアイコンを取得
   * @param {string} mimeType MIMEタイプ
   * @returns {string} アイコン文字
   */
  static getFileTypeIcon(mimeType) {
    switch (mimeType) {
      case MimeType.JPEG: return '📸';
      case MimeType.PNG: return '🖼️';
      case MimeType.PDF: return '📄';
      default: return '📁';
    }
  }
}

// 後方互換性のための関数エクスポート
function analyzeDocuments() {
  return DocumentProcessor.analyzeDocuments();
}

function analyzeDrawings() {
  return DocumentProcessor.analyzeDocuments();
}

function generateDocumentSummary(fileName, extractedText, geminiApiKey) {
  return DocumentProcessor.generateDocumentSummary(fileName, extractedText, geminiApiKey);
}