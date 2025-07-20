# 動的テストファイル管理ガイド

## 📋 概要
他のお客さん環境でもテストを円滑に行うため、ハードコードされたファイルIDに依存しない動的テストシステムを実装しました。

## 🎯 主な機能

### 1. **自動テストファイル検出**
- 設定済みフォルダ内のファイルを自動検出
- ファイルがない場合は自動生成
- スクリプトプロパティに保存して再利用

### 2. **フォールバック機能**
- ファイル検出 → 既存ファイル利用
- ファイルなし → 自動生成
- エラー発生 → 新規作成

### 3. **テスト用サンプル自動生成**
- システムテスト用のサンプルファイル
- 日本語コンテンツでリアルなテスト
- .txtファイルで軽量・高速

## 🚀 使用方法

### **基本的なテスト実行**
```javascript
// 1. テストファイル管理状況確認
testFileManagement();

// 2. 包括的AI機能テスト
runAIComprehensiveTest();

// 3. 個別機能テスト
testCreateAnalysisSessionDirect();
testProcessAnalysisQuestionDirect();
```

### **手動でのテストファイル管理**
```javascript
// テスト用ファイルIDを取得（推奨）
const testFileId = ConfigManager.getTestFileId();

// フォルダ内ファイル自動検出
const detectedFileId = ConfigManager.getAvailableTestFile();

// 新規サンプルファイル作成
const newFileId = ConfigManager.createTestSampleFile();
```

## 📊 テスト実行例

### **お客さん環境での初回実行**
```
🧪 ===== AI解析直接テスト開始 =====
🔍 テスト用ファイル自動検出中...
📄 フォルダにファイルが見つからないため新規作成します
📄 テスト用サンプルファイル作成中...
✅ テスト用ファイル作成完了
ファイルID: 1NEW_AUTO_GENERATED_ID
📋 テスト1: 動的取得ファイルIDでセッション作成
...
```

### **2回目以降の実行**
```
🧪 ===== AI解析直接テスト開始 =====
🔍 テスト用ファイル自動検出中...
✅ テスト用ファイル検出: test_sample_1234567890.txt
ファイルID: 1EXISTING_FILE_ID
📋 テスト1: 動的取得ファイルIDでセッション作成
...
```

## 🛡️ セキュリティ改善点

### **Before（問題）**
```javascript
// ❌ 特定環境に依存
const testFileId = '1KLFG0FIrkZ6iBD67jn5-EwIqTWyjMsLw'; // 椿サロン渋谷.pdf
```

### **After（改善）**
```javascript
// ✅ 環境に依存しない
const testFileId = ConfigManager.getTestFileId();
```

## 🎯 お客さん環境への適用

### **導入手順**
1. **Config.gsをGASにコピー**（テスト管理機能含む）
2. **TestAI.gsをGASにコピー**（動的検出版）
3. **スクリプトプロパティ設定**（APIキー、ID等）
4. **テスト実行**：`runAIComprehensiveTest()`

### **必要な設定**
- `VISION_API_KEY`: Vision APIキー
- `GEMINI_API_KEY`: Gemini APIキー
- `SPREADSHEET_ID`: SpreadsheetのID
- `DRAWINGS_FOLDER_ID`: Drive FolderのID
- `TEST_FILE_ID`: 自動設定（手動設定不要）

## 📋 トラブルシューティング

### **Q: テストファイルが作成されない**
A: フォルダIDとアクセス権限を確認してください
```javascript
ConfigManager.checkSetup(); // 設定状況確認
```

### **Q: 既存ファイルを使いたい**
A: フォルダにファイルを置けば自動検出されます
```javascript
testFileManagement(); // ファイル状況確認
```

### **Q: テストファイルをリセットしたい**
A: スクリプトプロパティのTEST_FILE_IDを削除
```javascript
PropertiesService.getScriptProperties().deleteProperty('TEST_FILE_ID');
```

## 🔄 継続的改善

### **今後の拡張可能性**
1. **複数ファイル形式対応**（PDF、画像等）
2. **テスト結果レポート自動生成**
3. **性能ベンチマーク機能**
4. **お客さん専用テストデータ管理**

## 🎉 導入効果

### **開発者向け**
- ✅ 環境依存性の排除
- ✅ テスト自動化の向上
- ✅ セットアップ時間の短縮

### **お客さん向け**
- ✅ 即座にテスト実行可能
- ✅ 手動設定作業不要
- ✅ 既存データ活用可能

---

**重要**: この機能により、どの環境でも一貫したテストが実行できるようになりました。お客さん環境でのセットアップが大幅に効率化されます。