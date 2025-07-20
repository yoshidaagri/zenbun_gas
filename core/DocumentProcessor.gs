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
    
    // 現在はPDFのみ処理（効率化）
    const result = this.processFilesByType(folder, sheet, config, supportedTypes[2]); // PDF
    
    return {
      success: true,
      processed: result.processed,
      skipped: result.skipped,
      errors: result.errors,
      log: result.log
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
   * PDFからテキストを抽出
   * @param {DriveApp.File} file PDFファイル
   * @param {string} apiKey APIキー
   * @returns {string} 抽出されたテキスト
   */
  static extractTextFromPDF(file, apiKey) {
    console.log('📄 PDF処理を開始します...');
    
    const fileName = file.getName();
    const fileSize = file.getSize();
    const lastModified = file.getLastUpdated();
    
    console.log(`📋 PDFファイル情報:`);
    console.log(`   ファイル名: ${fileName}`);
    console.log(`   サイズ: ${Utils.formatFileSize(fileSize)}`);
    console.log(`   更新日: ${lastModified.toLocaleDateString()}`);
    
    let extractedText = '';
    
    try {
      // PDFをVision APIで直接処理を試行
      const blob = file.getBlob();
      const base64 = Utilities.base64Encode(blob.getBytes());
      
      console.log('🔍 PDFをVision APIで直接処理を試行中...');
      
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
        console.log('✅ PDFから直接テキスト抽出成功');
      } else {
        throw new Error('Vision APIでPDF処理失敗');
      }
      
    } catch (visionError) {
      console.log('⚠️ Vision APIでのPDF処理に失敗:', visionError.message);
      
      // ファイル名ベースの情報生成
      extractedText = this.generateFileBasedInfo(fileName, fileSize, lastModified);
    }
    
    return extractedText;
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
        return 'Vision APIエラー: ' + response_data.error.message;
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
      
      if (extractedText) {
        extractedText = Utils.cleanText(extractedText);
        console.log(`📝 抽出されたテキスト長: ${extractedText.length}文字`);
        console.log(`📄 抽出内容プレビュー: ${extractedText.substring(0, 100)}...`);
        return extractedText;
      }
    }
    
    console.log('⚠️ テキストが検出されませんでした');
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