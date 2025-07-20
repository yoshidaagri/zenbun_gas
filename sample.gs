// 最終版: PDF処理統合ソリューション
static extractTextFromPDF(file, apiKey) {
  console.log('📄 統合版PDF処理を開始...');
  
  const fileName = file.getName();
  const fileSize = file.getSize();
  const lastModified = file.getLastUpdated();
  
  console.log(`📋 ファイル情報: ${fileName} (${this.formatFileSize(fileSize)})`);
  
  // ファイルサイズチェック
  if (fileSize > 20 * 1024 * 1024) {
    console.log('⚠️ ファイルサイズ制限超過');
    return this.generateEnhancedFileInfo(fileName, fileSize, lastModified, 'サイズ制限');
  }
  
  // Vision API処理を試行
  let visionResult = this.tryVisionAPIProcessing(file, apiKey);
  
  if (visionResult && visionResult !== '読み取れませんでした') {
    console.log('✅ Vision API処理成功');
    return visionResult;
  }
  
  console.log('⚠️ Vision API処理失敗 - 代替情報を生成');
  return this.generateEnhancedFileInfo(fileName, fileSize, lastModified, 'OCR失敗');
}

// Vision API処理試行
static tryVisionAPIProcessing(file, apiKey) {
  const blob = file.getBlob();
  const base64 = Utilities.base64Encode(blob.getBytes());
  
  // 処理段階を配列で定義
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
      const extractedText = this.parseVisionResponse(result);
      
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

// Vision APIレスポンス解析
static parseVisionResponse(result) {
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

// 強化されたファイル情報生成
static generateEnhancedFileInfo(fileName, fileSize, lastModified, reason) {
  let info = '';
  
  // ヘッダー
  info += `📄 PDF文書: ${fileName}\n`;
  info += `${'='.repeat(50)}\n\n`;
  
  // 基本情報
  info += `📊 基本情報\n`;
  info += `   サイズ: ${this.formatFileSize(fileSize)}\n`;
  info += `   更新: ${lastModified.toLocaleDateString('ja-JP')} ${lastModified.toLocaleTimeString('ja-JP')}\n`;
  info += `   状態: OCR処理${reason === 'OCR失敗' ? '失敗' : '未実行'}\n\n`;
  
  // 検索キーワード
  const keywords = this.extractComprehensiveKeywords(fileName);
  if (keywords.length > 0) {
    info += `🔍 検索キーワード\n`;
    info += `   ${keywords.join(' | ')}\n\n`;
  }
  
  // 数値・日付情報
  const numbers = this.extractNumbersAndDates(fileName);
  if (numbers.length > 0) {
    info += `🔢 数値・日付情報\n`;
    info += `   ${numbers.join(' | ')}\n\n`;
  }
  
  // ファイル分類
  const category = this.categorizeDocument(fileName);
  if (category) {
    info += `📂 推定文書種別\n`;
    info += `   ${category}\n\n`;
  }
  
  // 改善提案
  info += `💡 検索精度向上のための提案\n`;
  info += `   1. ファイル名に詳細情報を追加\n`;
  info += `      例: "${fileName}" → "会議室A_座席配置_20名_2025年.pdf"\n`;
  info += `   2. PDFをJPEG/PNG画像として保存し直す\n`;
  info += `   3. 重要ページのみ個別ファイル化\n\n`;
  
  // 現在の検索可能項目
  info += `✅ 現在検索可能な項目\n`;
  info += `   • ファイル名: ${fileName}\n`;
  if (keywords.length > 0) {
    info += `   • キーワード: ${keywords.slice(0, 3).join(', ')}など\n`;
  }
  if (numbers.length > 0) {
    info += `   • 数値情報: ${numbers.slice(0, 2).join(', ')}など\n`;
  }
  
  return info;
}

// 包括的キーワード抽出
static extractComprehensiveKeywords(fileName) {
  const keywords = new Set();
  
  // キーワード辞書
  const dictionary = {
    // 建築・設計
    '図面': ['図面', 'plan', 'drawing', 'blueprint', 'プラン'],
    '設計': ['設計', 'design', 'デザイン'],
    '配置': ['配置', 'layout', 'レイアウト', 'arrangement'],
    '平面': ['平面', 'floor', 'フロア'],
    
    // 施設・場所
    '会議室': ['会議', 'meeting', 'conference', 'ミーティング'],
    'オフィス': ['オフィス', 'office', '事務所'],
    '店舗': ['店舗', 'shop', 'store', 'ショップ'],
    'レストラン': ['レストラン', 'restaurant', 'cafe', 'カフェ'],
    'ハウス': ['ハウス', 'house', 'home', 'ホーム'],
    
    // 設備
    '座席': ['座席', 'seat', 'シート', 'chair', 'チェア'],
    'テーブル': ['テーブル', 'table', 'desk', 'デスク'],
    'キッチン': ['キッチン', 'kitchen', '厨房'],
    'テラス': ['テラス', 'terrace', 'テラス'],
    
    // その他
    'メロン': ['メロン', 'melon'],
    'とみた': ['とみた', 'tomita', 'トミタ']
  };
  
  const lowerFileName = fileName.toLowerCase();
  
  Object.entries(dictionary).forEach(([key, patterns]) => {
    if (patterns.some(pattern => lowerFileName.includes(pattern.toLowerCase()))) {
      keywords.add(key);
    }
  });
  
  return Array.from(keywords);
}

// 数値・日付抽出
static extractNumbersAndDates(fileName) {
  const items = [];
  
  // 年
  const years = fileName.match(/20\d{2}/g);
  if (years) items.push(...years.map(y => y + '年'));
  
  // 月
  const months = fileName.match(/(\d{1,2})月/g);
  if (months) items.push(...months);
  
  // 日
  const days = fileName.match(/(\d{1,2})日/g);
  if (days) items.push(...days);
  
  // 階
  const floors = fileName.match(/(\d+)[階F]/gi);
  if (floors) items.push(...floors);
  
  // 座席数
  const seats = fileName.match(/(\d+)[人名席]/g);
  if (seats) items.push(...seats);
  
  // 6桁の数字（日付っぽい）
  const dates = fileName.match(/\d{6}/g);
  if (dates) items.push(...dates.map(d => `${d.slice(0,2)}${d.slice(2,4)}${d.slice(4,6)}`));
  
  return [...new Set(items)];
}

// 文書分類
static categorizeDocument(fileName) {
  const categories = [
    { name: '平面図・レイアウト図', keywords: ['平面', 'layout', 'plan', '配置'] },
    { name: '設計図面', keywords: ['設計', 'design', '図面', 'drawing'] },
    { name: '店舗・施設図面', keywords: ['店舗', 'ハウス', 'house', 'restaurant'] },
    { name: '会議室・オフィス図面', keywords: ['会議', 'office', 'オフィス'] }
  ];
  
  const lowerFileName = fileName.toLowerCase();
  
  for (const category of categories) {
    if (category.keywords.some(keyword => lowerFileName.includes(keyword.toLowerCase()))) {
      return category.name;
    }
  }
  
  return 'その他PDF文書';
}

// ファイルサイズフォーマット
static formatFileSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}