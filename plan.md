# Gemini画像解析機能 - 現実的な作業計画

## 🎯 目標機能
検索で見つけた資料をGeminiで画像解析し、質問応答できるシステム

## ✅ 実現可能な機能範囲

### 基本機能
- 検索結果からファイルを選択
- 選択したファイルをGemini Vision APIで解析
- ファイルに関する質問応答
- 解析履歴の保存・表示

### UI/UX
- ファイル選択→解析→Q&A の流れ
- チャット風インターフェース
- 解析結果の保存・閲覧

## ✅ **実現可能な技術アプローチ**

### File API利用
```javascript
// ✅ 実現可能（修正後）
// Google Drive → File API → Gemini
const file = DriveApp.getFileById(fileId);
const uploadedFile = uploadToGeminiFileAPI(file);
const conversation = startGeminiChat(uploadedFile);
```

### セッション管理
```javascript
// ✅ 1セッション内での永続参照
const fileReference = uploadedFile.uri;
// セッション中は同じファイルに対して複数質問可能
// セッション終了で自動クリーンアップ
```

## ⚠️ 制約として受け入れ可能な部分

### セッション永続性
- **1回のセッション**でファイル解析完結
- セッション間での文脈継続なし
- → **実用上は全く問題なし**

### リアルタイム機能
```javascript
// ❌ 真のリアルタイムは不可能
WebSocket, Server-Sent Events

// ✅ 十分実用的な代替
ターン制Q&A + 履歴保存
```

## 📁 提案するファイル構成

```
project/
├── main/
│   ├── Code.gs              # 既存メイン機能
│   └── index.html           # 既存検索UI
├── analysis/
│   ├── GeminiAnalysis.gs    # 新: Gemini解析機能
│   ├── AnalysisHistory.gs   # 新: 履歴管理
│   ├── analysis.html        # 新: 解析UI
│   └── chat.html           # 新: チャットUI
└── shared/
    ├── Utils.gs            # 共通ユーティリティ
    ├── Config.gs           # 設定管理
    └── styles.css          # 共通スタイル
```

## 🚀 段階的実装計画

### Phase 1: ファイル分割・リファクタリング
**期間**: 1-2日  
**難易度**: ⭐⭐☆☆☆

```javascript
// 1. 既存コードの分割
main/Code.gs → 機能別に分離
main/index.html → UI部分の分離

// 2. 共通機能の抽出
shared/Utils.gs → getConfig(), checkSetup()等
shared/Config.gs → API設定・ID管理
```

### Phase 2: File API統合・基本解析機能
**期間**: 2-3日  
**難易度**: ⭐⭐⭐☆☆

```javascript
// 1. Gemini File API統合
analysis/GeminiFileAPI.gs
- uploadFileToGemini(driveFileId)
- createChatSession(uploadedFileUri)
- askQuestion(chatSession, question)
- cleanupFileSession(fileUri)

// 2. 基本UI
analysis/analysis.html
- ファイル選択インターフェース
- File APIアップロード状況表示
- 質問入力フォーム
- リアルタイム応答表示
```

### Phase 3: 真のスレッド機能・チャット
**期間**: 2-3日  
**難易度**: ⭐⭐⭐☆☆

```javascript
// 1. スレッド管理（セッション内）
analysis/ThreadManager.gs
- createNewThread(fileUri)
- addMessageToThread(threadId, message, response)
- getThreadHistory(threadId)
- endThread(threadId)

// 2. 真のチャットUI
analysis/chat.html
- 連続的な質問応答
- 文脈を理解した回答
- スレッド履歴表示
- ファイル切り替え機能
```

### Phase 4: 高度な機能
**期間**: 3-4日  
**難易度**: ⭐⭐⭐⭐☆

```javascript
// 1. マルチファイル同時解析
- uploadMultipleFiles([fileIds])
- createMultiFileChat(uploadedFileUris[])
- askCrossFileQuestion(chatSession, question)

// 2. 専門プロンプトテンプレート
- architecturalAnalysisPrompt()
- technicalDrawingPrompt()
- designReviewPrompt()
- complianceCheckPrompt()

// 3. 解析結果の永続化
- saveAnalysisToSpreadsheet()
- generateAnalysisReport()
- exportChatHistory()
```

## ⚠️ 技術的制約と対処法

### 制約1: ファイルサイズ制限
```javascript
// GAS制限: 50MB/実行, Gemini: 20MB/ファイル
// 対処: ファイルサイズチェック＋圧縮機能
if (file.getSize() > 20 * 1024 * 1024) {
  throw new Error('ファイルサイズが大きすぎます（20MB制限）');
}
```

### 制約2: 実行時間制限
```javascript
// GAS制限: 6分/実行
// 対処: 大きなファイルは分割処理
function processLargeFile(fileId) {
  // ページ分割での処理
  // 複数回実行での対応
}
```

### 制約3: API使用制限
```javascript
// Gemini API制限: RPM/TPM制限あり
// 対処: レート制限の実装
function rateLimitedGeminiCall() {
  Utilities.sleep(2000); // 2秒間隔
}
```

## 💰 コスト試算

### Gemini Vision API
```
- 料金: $0.0025/画像（1K画像まで）
- 月1000件の解析: 約$2.5
- 十分に実用的なコスト
```

### Google Cloud Storage（必要に応じて）
```
- 料金: $0.02/GB/月
- 10GB保存: 約$0.2/月
- ほぼ無視できるコスト
```

## 🎯 推奨実装スコープ

### 最小実用版（MVP）
✅ **これで十分実用的**
- ファイル選択→Gemini解析→結果表示
- 基本的な質問応答
- 簡単な履歴機能

### 将来拡張版
🔶 **必要に応じて追加**
- マルチファイル比較
- 高度な履歴検索
- カスタムプロンプト

## 🚨 実際に無理な部分（修正版）

### ❌ 実装不可能
1. **セッション間での永続的な文脈**
   - Gemini APIの制約
   - 代替: セッション内での連続対話（十分実用的）

2. **真のリアルタイム通信**
   - WebSocket等の双方向通信なし
   - 代替: ポーリング＋快適なレスポンス

3. **大容量ファイルの無制限処理**
   - GAS: 6分実行制限、Gemini: 20MB制限
   - 代替: ファイルサイズ制限＋分割処理

### 🎯 **実現可能になった機能（修正版）**
✅ **File APIによる真のスレッド機能**
✅ **複数ファイルの同時解析**
✅ **連続的な質問応答（セッション内）**
✅ **文脈を理解した回答**

## 🔄 次のアクション

### 1. 実装範囲の最終確認
どこまでの機能を求めるか明確化

### 2. Phase 1から段階的開始
まずファイル分割・リファクタリング

### 3. プロトタイプ作成
最小機能で動作確認

---

**結論**: File APIを使った本格的な画像解析・スレッド機能が実現可能です！セッション内での永続参照により、真の対話型分析システムが作れます。

**MVP版でも非常に高機能**なシステムになります！ 🚀