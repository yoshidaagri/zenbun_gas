# 🚀 GAS デプロイ完全ガイド

## 📋 Phase 1 リファクタリング版のGASコピー手順

### ⚡ クイックコピー順序

```bash
# ✅ 必須8ファイル - この順序でコピーしてください

1. shared/Config.gs → GAS:Config
2. shared/Utils.gs → GAS:Utils  
3. shared/ErrorHandler.gs → GAS:ErrorHandler
4. core/SearchEngine.gs → GAS:SearchEngine
5. core/DocumentProcessor.gs → GAS:DocumentProcessor
6. core/DatabaseManager.gs → GAS:DatabaseManager
7. main/Code.gs → GAS:Code
8. ui/search.html → GAS:index (⚠️ HTMLファイル)
```

### 📝 詳細手順

#### **Step 1: GASプロジェクトの準備**

1. **古いファイルを削除**
   - 既存の `Code.gs`（古いバージョン）
   - `myFunction` などのサンプルファイル

2. **新しいファイルを作成**
   - 「＋」ボタン → 「スクリプト」× 7回
   - 「＋」ボタン → 「HTML」× 1回

#### **Step 2: ファイル作成とコピー**

##### **1. Config (スクリプト)**
```javascript
// ファイル名: Config
// コピー元: shared/Config.gs
```
- GASで新規スクリプトファイル作成
- ファイル名を「Config」に変更
- `shared/Config.gs` の全内容をコピー

##### **2. Utils (スクリプト)**
```javascript
// ファイル名: Utils
// コピー元: shared/Utils.gs
```
- GASで新規スクリプトファイル作成
- ファイル名を「Utils」に変更
- `shared/Utils.gs` の全内容をコピー

##### **3. ErrorHandler (スクリプト)**
```javascript
// ファイル名: ErrorHandler
// コピー元: shared/ErrorHandler.gs
```
- GASで新規スクリプトファイル作成
- ファイル名を「ErrorHandler」に変更
- `shared/ErrorHandler.gs` の全内容をコピー

##### **4. SearchEngine (スクリプト)**
```javascript
// ファイル名: SearchEngine
// コピー元: core/SearchEngine.gs
```
- GASで新規スクリプトファイル作成
- ファイル名を「SearchEngine」に変更
- `core/SearchEngine.gs` の全内容をコピー

##### **5. DocumentProcessor (スクリプト)**
```javascript
// ファイル名: DocumentProcessor
// コピー元: core/DocumentProcessor.gs
```
- GASで新規スクリプトファイル作成
- ファイル名を「DocumentProcessor」に変更
- `core/DocumentProcessor.gs` の全内容をコピー

##### **6. DatabaseManager (スクリプト)**
```javascript
// ファイル名: DatabaseManager
// コピー元: core/DatabaseManager.gs
```
- GASで新規スクリプトファイル作成
- ファイル名を「DatabaseManager」に変更
- `core/DatabaseManager.gs` の全内容をコピー

##### **7. Code (スクリプト) ⭐ メイン**
```javascript
// ファイル名: Code
// コピー元: main/Code.gs
```
- GASで新規スクリプトファイル作成
- ファイル名を「Code」に変更
- `main/Code.gs` の全内容をコピー

##### **8. index (HTML) ⭐ UI**
```html
<!-- ファイル名: index -->
<!-- コピー元: ui/search.html -->
```
- GASで新規HTMLファイル作成
- ファイル名を「index」に変更
- `ui/search.html` の全内容をコピー

### 🔧 デプロイ設定

#### **Webアプリとしてデプロイ**

1. **デプロイボタンをクリック**
2. **新しいデプロイを作成**
3. **設定**:
   - 種類: Webアプリ
   - 実行者: 自分
   - アクセス権: 全員（匿名ユーザーを含む）
4. **デプロイ実行**

### 🧪 動作確認

#### **Step 1: GASエディタでテスト**
```javascript
// 以下をGASエディタで実行
checkSetup();
```

#### **Step 2: Webアプリアクセス**
- デプロイしたURLにアクセス
- 検索画面が表示されることを確認

#### **Step 3: 基本機能テスト**
- 検索例ボタンをクリック
- 「全データ表示」で結果が表示される
- 「スプレッドシート表示」でスプレッドシートが開く

### 🚨 よくある問題と対処法

#### **問題1: 「○○ is not defined」エラー**
```
対処法: ファイル作成順序を確認
- 依存関係: Config → Utils → ErrorHandler → 各コアモジュール → Code
```

#### **問題2: HTMLが表示されない**
```
対処法: HTMLファイル名確認
- ファイル名が「index」になっているか確認
- 「index.html」ではなく「index」
```

#### **問題3: 検索が動かない**
```
対処法: APIキー設定確認
1. GASエディタで checkSetup() を実行
2. APIキーが設定されているか確認
3. 必要に応じて setApiKeys() を実行
```

### 📊 最終確認チェックリスト

- [ ] 8個のファイルがすべて作成済み
- [ ] ファイル名が正しい（Config, Utils, ErrorHandler, SearchEngine, DocumentProcessor, DatabaseManager, Code, index）
- [ ] HTMLファイルが「index」として作成済み
- [ ] Webアプリがデプロイ済み
- [ ] checkSetup() が正常実行できる
- [ ] Webアプリにアクセス可能
- [ ] 検索機能が動作する

### 🎯 完了後のテスト手順

#### **統合テスト**
```javascript
// GASエディタで実行
runStepByStepTest();
```

#### **機能テスト**
1. 検索機能: キーワード検索
2. 管理機能: 新規ドキュメント解析
3. システム: 健全性チェック
4. データ: スプレッドシート表示

---

## 🎉 デプロイ完了

**Phase 1 リファクタリング版が本格運用開始です！**

次回のPhase 2では、Gemini画像解析機能を追加予定です。

### 📞 サポート

問題が発生した場合：
1. GASエディタの「実行」タブでエラーログ確認
2. ブラウザのF12コンソールでJavaScriptエラー確認
3. `checkSetup()` で設定状態確認