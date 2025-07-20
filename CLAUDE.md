# デザイン事務所向け検索システム - Claude Code開発引継書


## ルール
- 作業終了後、GASに何をコピーすれば良いかガイドを示すこと
- 例
  # コピー順序（推奨）
  1. shared/Config.gs → GAS:Config
  2. shared/Utils.gs → GAS:Utils
  3. shared/ErrorHandler.gs → GAS:ErrorHandler
  4. core/SearchEngine.gs → GAS:SearchEngine
  5. core/DocumentProcessor.gs → GAS:DocumentProcessor
  6. core/DatabaseManager.gs → GAS:DatabaseManager
  7. main/Code.gs → GAS:Code
  8. ui/search.html → GAS:index
## 📋 プロジェクト概要

### 基本情報
- **プロジェクト名**: デザイン事務所向け非構造データ検索システム
- **目的**: 過去の設計ドキュメントをAIが要約して検索可能にする
- **対象ユーザー**: デザイン事務所の秘書（上司の依頼に応じてドキュメント検索）
- **解決する課題**: NAS検索の手間を削減、曖昧な依頼にもAIが対応

### ペインポイント
- 上司から「昔の設計ドキュメント検索してほしい」と依頼される
- NASに検索しに行くのが大変
- ファイル名だけでは内容が分からない
- 「田中邸の図面」のような曖昧な依頼への対応

## 🏗️ アーキテクチャ

```
[Google Drive] → [GAS] → [OCR: Vision API] → [AI: Gemini Flash 2.5] → [検索UI]
     ↓              ↓           ↓                    ↓                    ↓
  ファイル保存    バックエンド   テキスト抽出      AI要約生成         検索・表示
```

### 技術スタック
- **UI**: Google Apps Script (HTML + JavaScript)
- **バックエンド**: Google Apps Script
- **OCR**: Google Cloud Vision API
- **AI**: Gemini Flash 2.5 API
- **ストレージ**: Google Drive + Google Spreadsheet
- **デプロイ**: GAS Web App

## 📁 ファイル構成

```
/Users/manabu/python/zenbun_gas/
├── CLAUDE.md                               # この開発指示書
├── GAS_DEPLOY_GUIDE.md                     # デプロイガイド
├── LT.md                                   # ライトニングトーク用
├── README.md                               # プロジェクト概要
├── REFACTORING_GUIDE.md                    # リファクタリングガイド
├── plan.md                                 # 開発計画
├── history.md                              # 開発履歴
├── debug_chat_format.js                    # デバッグ用チャット形式
├── analysis/                               # Phase 2: AI解析モジュール
│   ├── AnalysisManager.gs                  # セッション管理・解析制御
│   └── GeminiFileAPI.gs                    # Gemini File API統合
├── backup/                                 # バックアップファイル
│   ├── code copy.gas                       # Code.gsバックアップ
│   ├── code.gas                            # 旧Code.gs
│   ├── index copy.html                     # index.htmlバックアップ
│   └── index.html                          # 旧index.html
├── core/                                   # Phase 1: 基本検索機能
│   ├── DatabaseManager.gs                 # スプレッドシート操作
│   ├── DocumentProcessor.gs               # ドキュメント処理・OCR
│   └── SearchEngine.gs                     # 検索エンジン
├── main/                                   # メインエントリーポイント
│   └── Code.gs                             # GAS Webアプリメインファイル
├── shared/                                 # 共通ユーティリティ
│   ├── Config.gs                           # 設定管理（APIキー、ID等）
│   ├── ErrorHandler.gs                     # エラーハンドリング
│   └── Utils.gs                            # 共通ユーティリティ関数
├── tests/                                  # テストモジュール
│   ├── IntegrationTest.gs                  # 統合テスト
│   ├── TestAnalysisManager.gs              # AnalysisManager単体テスト
│   ├── TestGeminiFileAPI.gs                # GeminiFileAPI単体テスト
│   └── TestRunner.gs                       # テスト実行ランナー
└── ui/                                     # ユーザーインターフェース
    ├── analysis.html                       # AI解析専用UI（非使用）
    └── search.html                         # 統合検索・解析UI（メイン）
```

### 🔗 依存関係マップ

```
main/Code.gs
├── analysis/AnalysisManager.gs
│   ├── shared/Config.gs
│   ├── shared/Utils.gs
│   ├── shared/ErrorHandler.gs
│   └── analysis/GeminiFileAPI.gs
│       ├── shared/Config.gs
│       ├── shared/Utils.gs
│       └── shared/ErrorHandler.gs
├── core/SearchEngine.gs
│   ├── shared/Config.gs
│   ├── shared/Utils.gs
│   ├── shared/ErrorHandler.gs
│   └── core/DatabaseManager.gs
├── core/DocumentProcessor.gs
│   ├── shared/Config.gs
│   ├── shared/Utils.gs
│   └── shared/ErrorHandler.gs
└── core/DatabaseManager.gs
    ├── shared/Config.gs
    ├── shared/Utils.gs
    └── shared/ErrorHandler.gs
```

### 📋 GASデプロイ時のファイルコピー順序

**正確なコピーが必要なファイル（7ファイル）**:

1. **Config.gs** (新規作成)
   ```
   /Users/manabu/python/zenbun_gas/shared/Config.gs
   ```

2. **Utils.gs** (新規作成)
   ```
   /Users/manabu/python/zenbun_gas/shared/Utils.gs
   ```

3. **ErrorHandler.gs** (新規作成)
   ```
   /Users/manabu/python/zenbun_gas/shared/ErrorHandler.gs
   ```

4. **GeminiFileAPI.gs** (新規作成)
   ```
   /Users/manabu/python/zenbun_gas/analysis/GeminiFileAPI.gs
   ```

5. **AnalysisManager.gs** (新規作成)
   ```
   /Users/manabu/python/zenbun_gas/analysis/AnalysisManager.gs
   ```

6. **Code.gs** (既存置き換え)
   ```
   /Users/manabu/python/zenbun_gas/main/Code.gs
   ```

7. **index.html** (既存置き換え)
   ```
   /Users/manabu/python/zenbun_gas/ui/search.html
   ```

**注意**: 上記順序でコピーすることで依存関係エラーを回避できます。

## 🚀 現在の実装状況

### ✅ 完成済み機能
1. **ドキュメント解析機能**
   - Google Driveからファイル自動取得
   - Vision APIによるOCR処理
   - Gemini Flash 2.5による要約生成
   - スプレッドシートへの自動保存

2. **検索機能**
   - ファイル名、OCRテキスト、AI要約での検索
   - 検索結果の詳細表示
   - ファイルへの直接アクセス

3. **UI/UX**
   - モダンなレスポンシブデザイン
   - リアルタイムステータス表示
   - 詳細ログ機能
   - デバッグ・テスト機能

4. **デバッグ機能**
   - 段階的ステータス表示
   - 詳細ログ出力
   - フロントエンド/バックエンド個別テスト
   - エラー原因の特定機能

### 対応ファイル形式
- PDF（簡易版）
- JPEG/JPG
- PNG  
- GIF

## ❌ 現在の問題

### 主要問題
**検索処理が「結果整形」段階で止まる**

#### 症状
```
✅ 検索準備 (1秒)
✅ データベース接続 (1秒)  
✅ データ検索 (4秒)
⏳ 結果整形 (無限ループ) ← ここで止まる
```

#### 推定原因
1. フロントエンドの結果表示処理でエラー
2. スプレッドシートのデータ構造不整合
3. 大量データでのJavaScript処理フリーズ
4. 日付や特殊文字の処理問題

## 🔧 設定情報

### 必要なAPIキー
```javascript
// Google Cloud Vision API
const visionApiKey = 'AIzaSy...';

// Gemini Flash 2.5 API (Google AI Studio)
const geminiApiKey = 'AIzaSy...';
```

### 設定済みID
```javascript
// Google Spreadsheet ID (データベース)
const spreadsheetId = '1ABC123...';

// Google Drive Folder ID (ファイル保存先)
const folderId = '1XYZ789...';
```

### スプレッドシート構造
```
A列: ファイル名
B列: 抽出テキスト
C列: AI概要
D列: ファイルID
E列: 更新日
F列: ファイル形式
```

## 🎯 次にやるべきこと

### 優先度: 高
1. **「結果整形」で止まる問題の解決**
   - フロントエンド表示処理のデバッグ
   - データ構造の検証と修正
   - エラーハンドリングの強化

2. **表示機能テスト実行**
   - `testDisplayFunction()` でフロントエンドテスト
   - `runStepByStepTest()` でバックエンドテスト
   - 問題箇所の特定

### 優先度: 中
3. **PDF処理の改善**
   - 現在は簡易版（ファイル名のみ）
   - Document AI APIの導入検討
   - PDF→画像変換での対応

4. **検索精度の向上**
   - 検索アルゴリズムの最適化
   - 類義語対応
   - 検索結果のランキング

### 優先度: 低
5. **UI/UX改善**
   - 検索履歴機能
   - お気に入り機能
   - 検索フィルター

## 🐛 デバッグ手順

### ステップ1: 問題の特定
```javascript
// 1. フロントエンドテスト
testDisplayFunction();

// 2. バックエンドテスト  
runStepByStepTest();

// 3. データ構造確認
debugSpreadsheetStructure();
```

### ステップ2: GASログ確認
```
GAS Editor > View > Logs
または
Executions tab > 最新の実行ログを確認
```

### ステップ3: ブラウザコンソール確認
```
F12 > Console tab > JavaScript エラーを確認
```

## 📝 重要な関数

### バックエンド (Code.gs)
```javascript
// 初期設定
setApiKeys()           // APIキー設定
setupIds()             // ID設定
checkSetup()           // 設定確認

// メイン機能
analyzeDocuments()     // ドキュメント解析
searchDocuments(query) // 検索実行
generateDocumentSummary() // AI要約生成

// デバッグ
debugSpreadsheetStructure() // データ構造確認
runStepByStepTest()    // 段階的テスト
testGemini()           // AI接続テスト
```

### フロントエンド (index.html)
```javascript
// 検索関連
performSearch()        // 検索実行
displaySearchResults() // 結果表示
searchExample()        // 検索例実行

// 管理機能
analyzeNewDocuments()  // 新規解析
showAllDocuments()     // 全データ表示
testGeminiConnection() // AI接続テスト

// デバッグ
runDebugTests()        // 詳細デバッグ
testDisplayFunction()  // 表示機能テスト
```

## 🚨 既知の問題と回避策

### 問題1: Vision API Rate Limit
```javascript
// 対策: 2秒間隔での処理
Utilities.sleep(2000);
```

### 問題2: Gemini API Error
```javascript
// 対策: エラーレスポンスのハンドリング
if (error.message.includes('429')) {
  return 'API使用制限に達しました。しばらく待ってから再試行してください。';
}
```

### 問題3: スプレッドシート構造の不整合
```javascript
// 対策: 構造修正関数
fixSpreadsheetStructure();
```

## 🎯 Claude Codeでの作業指示

### タスク1: 問題の特定
```bash
# 既存のコードを確認し、「結果整形」で止まる原因を特定
# フロントエンドのdisplaySearchResults()関数を重点的にチェック
```

### タスク2: デバッグ情報の収集
```bash
# testDisplayFunction()とrunStepByStepTest()を実行
# GASのログとブラウザコンソールの情報を分析
```

### タスク3: 問題の修正
```bash
# 特定された問題に応じて適切な修正を実施
# エラーハンドリングの強化
# データ構造の検証機能追加
```

### タスク4: テストの実行
```bash
# 修正後の動作確認
# 各機能の個別テスト
# エンドツーエンドのテスト
```

## 📚 参考情報

### API文書
- [Google Cloud Vision API](https://cloud.google.com/vision/docs)
- [Gemini API Documentation](https://developers.generativeai.google/)
- [Google Apps Script Reference](https://developers.google.com/apps-script/reference)

### プロンプト例
```
プロジェクト名: 全文検索システム  
設計内容: デザイン事務所向け文書検索システム
重要仕様: AI要約機能、OCR処理、セマンティック検索
特記事項: Gemini Flash 2.5使用、Vision API連携
用途: 設計ドキュメント管理・検索
```

## 🔄 継続的改善

### 運用開始後の改善項目
1. 検索パフォーマンスの最適化
2. AI要約の精度向上
3. ユーザーフィードバックに基づくUI改善
4. 新しいファイル形式への対応

---

**重要**: このシステムは「検索中に止まる問題」を解決することが最優先課題です。Claude Codeでの作業では、まず問題の特定と修正に集中してください。

## 🎯 次期大型開発計画: 対応ファイル形式拡張

### 📋 開発概要
現在のPDF、画像ファイル（JPEG/JPG、PNG、GIF）に加えて、Microsoft Office系ファイルとテキストファイルに対応する。

### 🎯 対象ファイル形式
#### 新規対応予定
- **Microsoft Word**: .docx, .doc
- **Microsoft Excel**: .xlsx, .xls
- **Microsoft PowerPoint**: .pptx, .ppt
- **テキストファイル**: .txt, .csv

### 🏗️ 技術アプローチ

#### 1. Google Apps Script API活用
```javascript
// DriveApp.getFileById() でファイル取得
// 各ファイル形式に応じた処理分岐
switch (mimeType) {
  case MimeType.MICROSOFT_WORD:
    return processWordDocument(file);
  case MimeType.MICROSOFT_EXCEL: 
    return processExcelDocument(file);
  case MimeType.MICROSOFT_POWERPOINT:
    return processPowerPointDocument(file);
  case MimeType.PLAIN_TEXT:
    return processTextDocument(file);
}
```

#### 2. ファイル形式別処理戦略

**Microsoft Word (.docx, .doc)**
- 手法A: Google Docs変換API使用
  ```javascript
  // Drive APIでGoogle Docsに変換
  const convertedDoc = Drive.Files.copy({
    title: fileName + '_converted',
    mimeType: MimeType.GOOGLE_DOCS
  }, fileId);
  
  // DocumentApp APIでテキスト抽出
  const docText = DocumentApp.openById(convertedDoc.id).getBody().getText();
  ```

- 手法B: 外部API活用（要検討）
  - Office365 API
  - Apache Tika（要GAS対応確認）

**Microsoft Excel (.xlsx, .xls)**
- 手法A: Google Sheets変換API使用
  ```javascript
  // Drive APIでGoogle Sheetsに変換
  const convertedSheet = Drive.Files.copy({
    title: fileName + '_converted',
    mimeType: MimeType.GOOGLE_SHEETS
  }, fileId);
  
  // SpreadsheetApp APIでデータ抽出
  const sheet = SpreadsheetApp.openById(convertedSheet.id);
  const data = sheet.getDataRange().getValues();
  ```

**Microsoft PowerPoint (.pptx, .ppt)**
- 手法A: Google Slides変換API使用
  ```javascript
  // Drive APIでGoogle Slidesに変換
  const convertedSlides = Drive.Files.copy({
    title: fileName + '_converted', 
    mimeType: MimeType.GOOGLE_SLIDES
  }, fileId);
  
  // SlidesApp APIでテキスト抽出
  const presentation = SlidesApp.openById(convertedSlides.id);
  const slides = presentation.getSlides();
  ```

**テキストファイル (.txt, .csv)**
- 手法A: 直接読み取り
  ```javascript
  // ファイルブロブから直接テキスト抽出
  const blob = file.getBlob();
  const content = blob.getDataAsString();
  ```

#### 3. 統合処理フロー
```javascript
function processDocument(file) {
  const mimeType = file.getBlob().getContentType();
  const fileName = file.getName();
  
  let extractedText = '';
  
  try {
    switch (mimeType) {
      case MimeType.MICROSOFT_WORD:
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        extractedText = await processWordDocument(file);
        break;
        
      case MimeType.MICROSOFT_EXCEL:
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        extractedText = await processExcelDocument(file);
        break;
        
      case MimeType.MICROSOFT_POWERPOINT:
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        extractedText = await processPowerPointDocument(file);
        break;
        
      case MimeType.PLAIN_TEXT:
      case 'text/csv':
        extractedText = await processTextDocument(file);
        break;
        
      default:
        // 既存の画像・PDF処理
        extractedText = await processImageOrPDF(file);
    }
    
    // 共通のAI要約処理
    const aiSummary = await generateDocumentSummary(extractedText, fileName);
    
    return {
      extractedText,
      aiSummary,
      fileType: getFileTypeFromMime(mimeType)
    };
    
  } catch (error) {
    console.error(`ファイル処理エラー: ${fileName}`, error);
    return {
      extractedText: `処理エラー: ${error.message}`,
      aiSummary: 'エラーのため要約を生成できませんでした',
      fileType: 'ERROR'
    };
  }
}
```

### 🚧 技術的課題と対策

#### 課題1: Google Drive API制限
- **問題**: 変換処理でAPI使用量増加
- **対策**: バッチ処理、キャッシュ機能、レート制限対応

#### 課題2: 一時ファイル管理
- **問題**: 変換時の一時ファイル蓄積
- **対策**: 処理後の自動削除、定期クリーンアップ

#### 課題3: 処理時間の増加
- **問題**: 変換処理で時間がかかる
- **対策**: 非同期処理、プログレス表示、タイムアウト対応

#### 課題4: エラーハンドリング
- **問題**: 変換失敗時の処理
- **対策**: フォールバック機能、詳細ログ、ユーザー通知

### 📊 実装フェーズ

#### Phase 1: 基盤整備（1-2週間）
1. **ファイル形式判定の拡張**
   - MIME Typeマッピング拡張
   - 拡張子による判定強化

2. **処理フロー設計**
   - 統合処理関数の設計
   - エラーハンドリング強化

3. **テスト環境構築**
   - 各ファイル形式のサンプル準備
   - 単体テスト関数作成

#### Phase 2: Microsoft Office対応（2-3週間）
1. **Word文書処理**
   - Google Docs変換API実装
   - テキスト抽出機能
   - 表・図表の処理

2. **Excel処理**
   - Google Sheets変換API実装
   - 複数シート対応
   - データ構造の理解

3. **PowerPoint処理**
   - Google Slides変換API実装
   - スライド別テキスト抽出
   - 画像・図表の処理

#### Phase 3: テキストファイル対応（1週間）
1. **プレーンテキスト処理**
   - 直接読み取り機能
   - 文字エンコーディング対応

2. **CSV処理**
   - 構造化データの処理
   - 列名・データの意味理解

#### Phase 4: 最適化・統合（1-2週間）
1. **パフォーマンス最適化**
   - 処理速度改善
   - メモリ使用量削減

2. **UI/UX改善**
   - 対応ファイル形式の表示
   - 処理進捗の詳細表示

3. **包括的テスト**
   - 全ファイル形式での動作確認
   - エラーケースの検証

### 🎯 成功指標

#### 技術指標
- 各ファイル形式で90%以上の処理成功率
- 平均処理時間: 1ファイル30秒以内
- エラー発生時の適切な通知とログ記録

#### 機能指標
- Word文書: 段落・表・箇条書きの正確な抽出
- Excel: 複数シート・数値・数式の適切な処理
- PowerPoint: 各スライドの内容とレイアウトの理解
- テキスト: 文字エンコーディングの正確な処理

#### ユーザー体験指標
- 処理完了の明確な通知
- エラー時の分かりやすい説明
- 各ファイル形式の処理状況の可視化

### 🔄 将来の拡張可能性

#### 追加対応検討ファイル形式
- **CAD図面**: .dwg, .dxf（AutoCAD）
- **画像形式**: .tiff, .bmp, .webp
- **アーカイブ**: .zip, .rar（内部ファイル処理）
- **3Dモデル**: .skp（SketchUp）、.3ds

#### 高度な機能
- **OCR + 文書解析**: 画像内の文字とOffice文書を統合分析
- **レイアウト理解**: 図表・表の位置関係の理解
- **メタデータ活用**: 作成者・更新日・コメント等の情報抽出

### 🚨 注意事項

#### セキュリティ
- 一時ファイルの確実な削除
- 変換処理中のファイル保護
- APIキーの適切な管理

#### 互換性
- 古いファイル形式（.doc、.xls、.ppt）の対応
- 文字エンコーディング問題の対策
- 破損ファイルの適切な処理

#### 運用
- 定期的なAPI使用量監視
- 一時ファイルの蓄積監視
- エラーレポートの集約と分析

---

---

## 🛡️ 防御的プログラミング・エラーハンドリング強化ガイドライン

### 📋 背景
2025年7月19日にprepareFileForAnalysis関数で「Cannot set properties of undefined (setting '0')」エラーが発生。配列のnull/undefined状態での代入エラーが原因。

### 🎯 横展開すべき改善パターン

#### **1. 配列操作時の安全チェック**
```javascript
// ❌ 危険な書き方
session.uploadedFiles[index] = data;

// ✅ 安全な書き方
if (!session.uploadedFiles) {
  console.log('📤 uploadedFiles配列を初期化');
  session.uploadedFiles = [];
}
session.uploadedFiles[index] = data;
```

#### **2. オブジェクトプロパティアクセスの安全化**
```javascript
// ❌ 危険な書き方
const value = obj.prop.subProp;

// ✅ 安全な書き方
const value = obj?.prop?.subProp || defaultValue;
```

#### **3. 配列メソッド実行前の存在確認**
```javascript
// ❌ 危険な書き方
array.forEach(item => {...});

// ✅ 安全な書き方
if (Array.isArray(array) && array.length > 0) {
  array.forEach(item => {...});
}
```

### 🔍 適用対象ファイル・関数

#### **即座に適用すべき箇所**
1. **AnalysisManager.gs**
   - `prepareFileForAnalysis()` ✅ 修正済み
   - `processQuestion()` - chatSessions配列アクセス
   - `getSessionHistory()` - uploadedFiles配列アクセス
   - `cleanupSession()` - chatSessions配列操作

2. **GeminiFileAPI.gs**
   - `buildChatContents()` - history配列操作
   - `askQuestion()` - セッション履歴追加処理

3. **DatabaseManager.gs**
   - スプレッドシート行データアクセス全般
   - 検索結果配列の操作

4. **SearchEngine.gs**
   - 検索結果配列の処理
   - フィルタリング結果の操作

#### **今後開発時の必須チェック項目**
- [ ] 配列への代入前に配列の存在確認
- [ ] オブジェクトプロパティアクセス時のnullチェック
- [ ] 配列メソッド実行前の型・長さ確認
- [ ] エラー発生時の詳細ログ出力
- [ ] 初期化処理での配列・オブジェクトの適切な初期化

### 🚨 優先度の高い修正箇所
1. **AnalysisManager.gs:processQuestion()** - chatSessions[targetIndex]アクセス
2. **GeminiFileAPI.gs:buildChatContents()** - chatSession.history配列操作
3. **DatabaseManager.gs** - スプレッドシート操作全般

### 📝 実装ルール
1. **配列操作前の必須チェック**:
   ```javascript
   if (!targetArray) targetArray = [];
   if (!Array.isArray(targetArray)) targetArray = [];
   ```

2. **ログ出力の標準化**:
   ```javascript
   console.log(`📤 配列状態確認: arrayName[${array?.length || 0}], targetIndex[${index}]`);
   ```

3. **エラーハンドリングの強化**:
   ```javascript
   try {
     // 危険な操作
   } catch (error) {
     console.error(`❌ 配列操作エラー: ${error.message}`);
     return { success: false, error: error.message };
   }
   ```

---

**開発開始前の準備事項**:
1. Google Drive API有効化確認
2. 各ファイル形式のサンプル収集
3. 変換処理のテスト実行
4. 処理時間・リソース使用量の計測
5. **防御的プログラミングチェックリストの実施**