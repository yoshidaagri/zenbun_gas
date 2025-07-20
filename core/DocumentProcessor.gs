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
   * 画像からテキストを抽出
   * @param {DriveApp.File} file 画像ファイル
   * @param {string} apiKey APIキー
   * @returns {string} 抽出されたテキスト
   */
  static extractTextFromImage(file, apiKey) {
    const blob = file.getBlob();
    const base64 = Utilities.base64Encode(blob.getBytes());
    
    // 強化されたOCR設定
    const payload = {
      'requests': [{
        'image': {
          'content': base64
        },
        'features': [
          {
            'type': 'TEXT_DETECTION',
            'maxResults': 50
          },
          {
            'type': 'DOCUMENT_TEXT_DETECTION',
            'maxResults': 10
          },
          {
            'type': 'LABEL_DETECTION',
            'maxResults': 20
          },
          {
            'type': 'IMAGE_PROPERTIES',
            'maxResults': 5
          }
        ],
        'imageContext': {
          'languageHints': ['ja', 'en'],
          'textDetectionParams': {
            'enableTextDetectionConfidenceScore': true
          }
        }
      }]
    };
    
    console.log('🔍 Vision API リクエスト送信中...');
    
    const response = UrlFetchApp.fetch(
      'https://vision.googleapis.com/v1/images:annotate?key=' + apiKey,
      {
        'method': 'POST',
        'headers': { 'Content-Type': 'application/json' },
        'payload': JSON.stringify(payload)
      }
    );
    
    const result = JSON.parse(response.getContentText());
    console.log('📥 Vision API レスポンス受信完了');
    
    return this.parseVisionApiResponse(result);
  }

  /**
   * 高度なVision API段階的処理 (sample.gsベース)
   * @param {DriveApp.File} file PDFファイル
   * @param {string} apiKey Vision APIキー
   * @returns {string} 抽出されたテキスト
   */
  static tryAdvancedVisionAPIProcessing(file, apiKey) {
    const blob = file.getBlob();
    const base64 = Utilities.base64Encode(blob.getBytes());
    
    // 処理段階を配列で定義（sample.gsと同じ）
    const processingSteps = [
      {
        name: 'DOCUMENT_TEXT_DETECTION',
        payload: {
          'requests': [{
            'image': { 'content': base64 },
            'features': [{ 'type': 'DOCUMENT_TEXT_DETECTION', 'maxResults': 1 }],
            'imageContext': { 'languageHints': ['ja', 'en'] }
          }]
        }
      },
      {
        name: 'TEXT_DETECTION (高精度)',
        payload: {
          'requests': [{
            'image': { 'content': base64 },
            'features': [{ 'type': 'TEXT_DETECTION', 'maxResults': 10 }],
            'imageContext': { 
              'languageHints': ['ja', 'en'],
              'textDetectionParams': { 'enableTextDetectionConfidenceScore': true }
            }
          }]
        }
      },
      {
        name: 'TEXT_DETECTION (シンプル)',
        payload: {
          'requests': [{
            'image': { 'content': base64 },
            'features': [{ 'type': 'TEXT_DETECTION', 'maxResults': 1 }]
          }]
        }
      }
    ];
    
    // 各段階を順番に試行
    for (const step of processingSteps) {
      console.log(`🔍 ${step.name} を試行中...`);
      
      try {
        const response = UrlFetchApp.fetch(
          'https://vision.googleapis.com/v1/images:annotate?key=' + apiKey,
          {
            'method': 'POST',
            'headers': { 'Content-Type': 'application/json' },
            'payload': JSON.stringify(step.payload),
            'muteHttpExceptions': true
          }
        );
        
        const result = JSON.parse(response.getContentText());
        const extractedText = this.parseAdvancedVisionResponse(result);
        
        if (extractedText && extractedText !== '読み取れませんでした') {
          console.log(`✅ ${step.name} 成功`);
          return extractedText;
        }
        
      } catch (error) {
        console.log(`❌ ${step.name} エラー: ${error.message}`);
        continue;
      }
      
      // 処理間隔
      Utilities.sleep(500);
    }
    
    return null;
  }

  /**
   * 高度なVision APIレスポンス解析
   * @param {Object} result Vision APIレスポンス
   * @returns {string} 抽出されたテキスト
   */
  static parseAdvancedVisionResponse(result) {
    try {
      if (!result.responses || !result.responses[0]) {
        return '読み取れませんでした';
      }
      
      const response = result.responses[0];
      
      if (response.error) {
        console.log(`API エラー: ${response.error.message}`);
        return '読み取れませんでした';
      }
      
      // フルテキストアノテーション（最高精度）
      if (response.fullTextAnnotation && response.fullTextAnnotation.text) {
        return response.fullTextAnnotation.text.trim();
      }
      
      // テキストアノテーション
      if (response.textAnnotations && response.textAnnotations.length > 0) {
        return response.textAnnotations[0].description.trim();
      }
      
      return '読み取れませんでした';
      
    } catch (error) {
      console.error('レスポンス解析エラー:', error);
      return '読み取れませんでした';
    }
  }


  /**
   * PDFからテキストを抽出 (高度なVision API処理版)
   * @param {DriveApp.File} file PDFファイル
   * @param {string} apiKey Vision APIキー
   * @returns {string} 抽出されたテキスト
   */
  static extractTextFromPDF(file, apiKey) {
    console.log('📄 PDF処理を開始します... (高度なVision API処理版)');
    
    const fileName = file.getName();
    const fileSize = file.getSize();
    const lastModified = file.getLastUpdated();
    
    console.log(`📋 PDFファイル情報:`);
    console.log(`   ファイル名: ${fileName}`);
    console.log(`   サイズ: ${Utils.formatFileSize(fileSize)}`);
    console.log(`   更新日: ${lastModified.toLocaleDateString()}`);
    
    // Phase 1: 高度なVision API段階的処理 (sample.gsベース)
    console.log('🔍 Phase 1: 高度なPDF処理を試行...');
    
    try {
      const advancedResult = this.tryAdvancedVisionAPIProcessing(file, apiKey);
      
      if (advancedResult && advancedResult !== '読み取れませんでした') {
        console.log('✅ 高度なPDF処理成功');
        return advancedResult;
      } else {
        console.log('⚠️ 高度なPDF処理失敗 - 標準処理に移行...');
      }
    } catch (advancedError) {
      console.log('⚠️ 高度なPDF処理エラー:', advancedError.message);
      console.log('🔄 標準Vision API処理に移行...');
    }
    
    // Phase 2: Vision APIフォールバック処理
    let extractedText = '';
    
    // base64エンコードを事前に実行（フォールバック処理でも使用）
    const blob = file.getBlob();
    const base64 = Utilities.base64Encode(blob.getBytes());
    
    try {
      console.log('🔍 Phase 2: Vision APIでPDF処理を試行...');
      
      console.log('📄 Vision API最適化モード: 文書テキスト検出専用');
      
      const payload = {
        'requests': [{
          'image': {
            'content': base64
          },
          'features': [
            {
              'type': 'DOCUMENT_TEXT_DETECTION',
              'maxResults': 50
            },
            {
              'type': 'TEXT_DETECTION',
              'maxResults': 50
            }
          ],
          'imageContext': {
            'languageHints': ['ja', 'en'],
            'textDetectionParams': {
              'enableTextDetectionConfidenceScore': true
            }
          }
        }]
      };
      
      const response = UrlFetchApp.fetch(
        'https://vision.googleapis.com/v1/images:annotate?key=' + apiKey,
        {
          'method': 'POST',
          'headers': { 'Content-Type': 'application/json' },
          'payload': JSON.stringify(payload)
        }
      );
      
      const result = JSON.parse(response.getContentText());
      extractedText = this.parseVisionApiResponse(result);
      
      if (extractedText && extractedText !== '読み取れませんでした') {
        console.log('✅ Vision API処理成功');
        return extractedText;
      } else {
        throw new Error('Vision APIでPDF処理失敗');
      }
      
    } catch (visionError) {
      console.log('⚠️ Vision APIでのPDF処理に失敗:', visionError.message);
      
      // Vision API TEXT_DETECTIONフォールバック
      if (visionError.message.includes('Bad image data') || visionError.message.includes('image data')) {
        console.log('🔄 Phase 3: Vision API TEXT_DETECTIONフォールバック...');
        
        try {
          const pdfFallbackPayload = {
            'requests': [{
              'image': {
                'content': base64
              },
              'features': [
                {
                  'type': 'TEXT_DETECTION',
                  'maxResults': 50
                }
              ],
              'imageContext': {
                'languageHints': ['ja', 'en']
              }
            }]
          };
          
          const fallbackResponse = UrlFetchApp.fetch(
            'https://vision.googleapis.com/v1/images:annotate?key=' + apiKey,
            {
              'method': 'POST',
              'headers': { 'Content-Type': 'application/json' },
              'payload': JSON.stringify(pdfFallbackPayload)
            }
          );
          
          const fallbackResult = JSON.parse(fallbackResponse.getContentText());
          extractedText = this.parseVisionApiResponse(fallbackResult);
          
          if (extractedText && extractedText !== '読み取れませんでした') {
            console.log('✅ Vision API フォールバック処理成功');
            return extractedText;
          } else {
            throw new Error('Vision API フォールバック処理も失敗');
          }
          
        } catch (fallbackError) {
          console.log('⚠️ Vision API フォールバック処理も失敗:', fallbackError.message);
        }
      }
    }
    
    // Phase 4: 最終フォールバック - ファイル名ベース情報生成
    console.log('📝 Phase 4: ファイル名ベース情報生成 (最終フォールバック)');
    return this.generateFileBasedInfo(fileName, fileSize, lastModified);
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
    pdfInfo += `処理状況: Vision API処理失敗のためファイル名解析結果\n`;
    
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

      const response = UrlFetchApp.fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
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
   * AI要約用プロンプトを作成
   * @param {string} fileName ファイル名
   * @param {string} extractedText 抽出テキスト
   * @returns {string} プロンプト
   */
  static createSummaryPrompt(fileName, extractedText) {
    return `
あなたはデザイン事務所の秘書の検索アシスタントです。
以下のドキュメント情報から、デザイナーが欲しがる要点を簡潔にまとめてください。

ファイル名: ${fileName}
抽出テキスト: ${extractedText}

以下の観点でまとめてください：
1. プロジェクト名・建物名
2. 設計内容（平面図、立面図、詳細図など）
3. 重要な寸法や仕様
4. 特記事項
5. 用途・目的

簡潔で検索しやすい形式で200文字以内にまとめてください。
`;
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