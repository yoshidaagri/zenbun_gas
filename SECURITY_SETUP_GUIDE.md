# セキュア設定ガイド - GAS スクリプトプロパティ

## 📋 概要
APIキーとIDをスクリプトプロパティで管理することで、コードにハードコードしない安全な実装を実現します。

## 🔧 設定手順

### 0. APIキー・IDの取得方法

#### 📋 Vision API キーの取得
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択（なければ新規作成）
3. 「APIとサービス」→「ライブラリ」→「Cloud Vision API」を有効化
4. 「APIとサービス」→「認証情報」→「認証情報を作成」→「APIキー」
5. 生成されたキーをコピー（例: `AIzaSyABC123...`で始まる文字列）

#### 🤖 Gemini API キーの取得
1. [Google AI Studio](https://aistudio.google.com/) にアクセス
2. Googleアカウントでログイン
3. 「Get API key」または「APIキーを取得」をクリック
4. プロジェクトを選択してAPIキーを生成
5. 生成されたキーをコピー（例: `AIzaSyXYZ789...`で始まる文字列）

#### 📊 Spreadsheet ID の取得
1. [Google Sheets](https://sheets.google.com/) で新規スプレッドシートを作成
2. URLから ID を抽出: `https://docs.google.com/spreadsheets/d/{ここがID}/edit`
3. 例: `1ABC123XYZ789...` の形式

#### 📁 Drive Folder ID の取得
1. [Google Drive](https://drive.google.com/) でフォルダを作成
2. フォルダを右クリック→「共有」→「リンクをコピー」
3. URLから ID を抽出: `https://drive.google.com/drive/folders/{ここがID}`
4. 例: `1DEF456ABC789...` の形式

### 1. GASエディタでスクリプトプロパティを設定

#### 手順A: GUI で設定
1. GASエディタを開く
2. 左側の「実行」タブ → 「スクリプトプロパティ」をクリック
3. 以下4つのプロパティを追加:

| プロパティ名 | 値の例 | 説明 |
|-------------|-----|------|
| `VISION_API_KEY` | `AIzaSyABC123...` | Google Cloud Vision APIキー |
| `GEMINI_API_KEY` | `AIzaSyXYZ789...` | Google AI Studio Gemini APIキー |
| `SPREADSHEET_ID` | `1ABC123XYZ...` | Google SpreadsheetのID |
| `DRAWINGS_FOLDER_ID` | `1DEF456ABC...` | Google DriveフォルダのID |

#### 手順B: 関数で設定
以下のいずれかの関数を実行:

```javascript
// 個別設定
ConfigManager.setApiKeys("your_vision_key", "your_gemini_key");
ConfigManager.setupIds("your_spreadsheet_id", "your_folder_id");

// 一括設定
ConfigManager.setupConfig({
  visionApiKey: "your_vision_key",
  geminiApiKey: "your_gemini_key", 
  spreadsheetId: "your_spreadsheet_id",
  folderId: "your_folder_id"
});
```

### 2. 設定確認

```javascript
// 設定状況の確認
ConfigManager.checkSetup();

// 設定値の取得
const config = ConfigManager.getConfig();
console.log(config);
```

## 🛡️ セキュリティ上の利点

### Before (ハードコード)
```javascript
// ❌ 危険：コードにAPIキーが露出
const visionApiKey = 'AIzaSyCV0JInh49k03pE...（実際のキーは削除済み）';
const geminiApiKey = 'AIzaSyBsooeIrAT61FYL...（実際のキーは削除済み）';
```

### After (スクリプトプロパティ)
```javascript
// ✅ 安全：スクリプトプロパティから取得
const properties = PropertiesService.getScriptProperties().getProperties();
const visionApiKey = properties.VISION_API_KEY;
const geminiApiKey = properties.GEMINI_API_KEY;
```

## 🎯 主な改善点

1. **コードからAPIキーを除去**
   - GitHubなどにコードをアップロードしても安全
   - 第三者がコードを見てもAPIキーが分からない

2. **環境別設定が可能**
   - 開発環境・本番環境で異なるAPIキーを使用可能
   - テスト用のスプレッドシートとの切り替えが簡単

3. **アクセス制御強化**
   - GASプロジェクトにアクセス権があるユーザーのみが設定変更可能
   - PropertiesServiceはGAS内部でのみアクセス可能

## 🔄 移行チェックリスト

- [x] Config.gsのAPIキー・IDハードコードを削除
- [x] スクリプトプロパティから取得する実装に変更
- [x] 設定関数の追加（個別・一括・確認）
- [x] 後方互換性の維持
- [ ] GASエディタでスクリプトプロパティを設定
- [ ] 動作確認テストの実行

## 🚨 注意事項

1. **既存の設定方法も利用可能**
   - `ConfigManager.setApiKeys()` パラメータなしで実行すると説明が表示
   - 段階的な移行が可能

2. **スクリプトプロパティの制限**
   - 値のサイズ制限: 1つのプロパティにつき8KB
   - プロパティ数制限: 1プロジェクトにつき50個まで

3. **バックアップ推奨**
   - 設定前に現在のAPIキー・IDをメモしておく
   - 万が一設定が消失した場合に備える

## 📋 トラブルシューティング

### Q: スクリプトプロパティが見つからない
A: GASエディタの左側の「実行」タブ内を確認。古いバージョンの場合は「プロジェクトの設定」からアクセス可能。

### Q: 設定後も動作しない
A: `ConfigManager.checkSetup()` を実行して設定状況を確認。接続テストも自動実行される。

### Q: APIキーが無効
A: Google Cloud Console・Google AI Studioで APIキーの有効性を確認。必要に応じて再生成。

---

**重要**: この設定により、コードの安全性が大幅に向上します。必ずスクリプトプロパティでの設定を完了してから本番運用を開始してください。