# Gemini 1.5 Flash → Gemini 2.0 Flash 移行計画

## 🎯 背景・目的
Googleが推奨するGemini 2.0 Flashへのアップグレードを実施し、最新のAI性能とAPI仕様に対応する。

## 📋 現状分析

### 現在のGemini 1.5 Flash使用箇所
1. **画像処理**: `DocumentProcessor.extractTextFromImageViaGemini()`
2. **PDF処理**: `DocumentProcessor.extractTextFromPdfViaGemini()`
3. **API呼び出し**: `GeminiFileAPI.askQuestion()`
4. **プロンプト**: 画像解析・PDF解析用プロンプト

### 使用しているAPI
- **Gemini File API**: ファイルアップロード・チャット機能
- **モデル名**: `gemini-1.5-flash`
- **エンドポイント**: `https://generativelanguage.googleapis.com/v1beta/`

## 🚀 Gemini 2.0 Flashの改善点（想定）

### 性能向上期待値
- ✅ **処理速度向上**: より高速なレスポンス
- ✅ **精度向上**: 画像認識・テキスト抽出の精度向上
- ✅ **コスト最適化**: より効率的なトークン使用
- ✅ **安定性向上**: エラー率の低下

### 新機能期待値
- 🔶 **マルチモーダル強化**: 画像・テキスト統合処理の向上
- 🔶 **長文処理**: より長い文書の処理能力
- 🔶 **専門分野**: 建築・デザイン分野の理解向上

## 📝 移行計画詳細

### Phase 1: 事前調査・準備（1日）
#### 🔍 API仕様の確認
```javascript
// 1. 新しいモデル名の確認
// 想定: "gemini-2.0-flash" または "gemini-2.0-flash-exp"

// 2. エンドポイントの変更確認
// 現在: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent
// 新規: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent

// 3. リクエスト形式の変更確認
const requestBody = {
  model: "models/gemini-2.0-flash",  // ← この部分の変更
  contents: [...]
};
```

#### 📋 互換性チェックリスト
- [ ] API キーの互換性
- [ ] File API の仕様変更
- [ ] レスポンス形式の変更
- [ ] 料金体系の変更
- [ ] レート制限の変更

### Phase 2: 設定ファイルの更新（30分）
#### Config.gs の更新
```javascript
// shared/Config.gs

// 現在
const GEMINI_MODEL = 'gemini-1.5-flash';

// 変更後
const GEMINI_MODEL = 'gemini-2.0-flash';

// モデル選択機能（移行期間用）
static getGeminiModel() {
  return PropertiesService.getScriptProperties().getProperty('GEMINI_MODEL') || 'gemini-2.0-flash';
}
```

### Phase 3: APIエンドポイントの更新（30分）
#### GeminiFileAPI.gs の更新
```javascript
// analysis/GeminiFileAPI.gs

// 現在
const baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash';

// 変更後
static getApiEndpoint() {
  const model = ConfigManager.getGeminiModel();
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}`;
}
```

### Phase 4: プロンプトの最適化（1-2時間）
#### 新モデル向けプロンプト調整
```javascript
// core/DocumentProcessor.gs

// 画像解析プロンプトの最適化
static createImageAnalysisPrompt(fileName, mimeType) {
  return `
あなたはGemini 2.0 Flashを使用したデザイン事務所検索システムです。
この画像から検索用キーワードを抽出してください。

// Gemini 2.0向けの最適化された指示
【Gemini 2.0 Flash最適化項目】
- より詳細な画像認識を活用
- 建築・デザイン専門用語の精密な理解
- 文字認識精度の向上を活用

...
`;
}
```

### Phase 5: 段階的テスト（2-3時間）
#### テストフェーズ
```javascript
// 1. 基本動作テスト
function testGemini2BasicFunction() {
  // モデル変更後の基本動作確認
}

// 2. 性能比較テスト  
function compareGeminiPerformance() {
  // 1.5 Flash vs 2.0 Flash の性能比較
}

// 3. 精度テスト
function testAccuracyImprovement() {
  // 画像認識・テキスト抽出精度の比較
}
```

### Phase 6: 本格移行（30分）
#### 設定の最終更新
```javascript
// 1. デフォルトモデルを2.0に変更
PropertiesService.getScriptProperties().setProperty('GEMINI_MODEL', 'gemini-2.0-flash');

// 2. 旧モデルサポート機能の削除
// ※段階的に実施

// 3. ドキュメント更新
// README.md の Gemini 1.5 → 2.0 への変更
```

## 🚨 リスク管理・回避策

### リスク1: API仕様の破壊的変更
```javascript
// 対策: 旧モデルフォールバック機能
static callGeminiWithFallback(prompt, fileUri) {
  try {
    return this.callGemini2_0(prompt, fileUri);
  } catch (error) {
    console.warn('Gemini 2.0失敗、1.5にフォールバック:', error);
    return this.callGemini1_5(prompt, fileUri);
  }
}
```

### リスク2: 性能劣化
```javascript
// 対策: A/Bテスト機能
static performanceMonitor() {
  // 処理時間・精度の自動監視
  // 問題があれば自動で旧モデルに切り替え
}
```

### リスク3: コスト増加
```javascript
// 対策: 使用量監視
static monitorApiUsage() {
  // トークン使用量の監視
  // 予算上限でのアラート
}
```

## 🛡️ 安全な移行手順

### 1. 事前バックアップ
```bash
# 現在の動作状態をcommit
git add -A
git commit -m "Gemini 2.0移行前のバックアップ"
```

### 2. 設定による段階的移行
```javascript
// フィーチャーフラグによる制御
const USE_GEMINI_2_0 = PropertiesService.getScriptProperties().getProperty('USE_GEMINI_2_0') === 'true';

if (USE_GEMINI_2_0) {
  // Gemini 2.0を使用
} else {
  // Gemini 1.5を使用（フォールバック）
}
```

### 3. 段階的ユーザー展開
```javascript
// テストユーザーのみ2.0を使用
// 本格展開前に十分な検証
```

## 📊 成功指標

### 技術指標
- [ ] **API呼び出し成功率**: 99%以上維持
- [ ] **平均レスポンス時間**: 現状維持または改善
- [ ] **エラー発生率**: 現状以下
- [ ] **キーワード抽出精度**: 現状以上

### ビジネス指標  
- [ ] **検索精度**: ユーザー満足度維持
- [ ] **システム安定性**: ダウンタイム0
- [ ] **コスト**: 予算内での運用
- [ ] **ユーザー体験**: レスポンス品質向上

## 📅 実装スケジュール

### 実施可能時間
- **事前調査**: 2-3時間
- **実装作業**: 1-2時間  
- **テスト**: 2-3時間
- **本格移行**: 30分
- **合計**: 半日〜1日

### 推奨実施タイミング
1. **段階1**: API仕様調査（即時実施可能）
2. **段階2**: テスト環境での実装
3. **段階3**: 小規模テスト
4. **段階4**: 本格移行

## 🤝 承認依頼事項

### 移行実施の承認
- [ ] **基本方針承認**: Gemini 2.0への移行実施
- [ ] **実装範囲承認**: 上記Phase 1-6の実施
- [ ] **安全措置承認**: フォールバック機能の実装
- [ ] **テスト計画承認**: 段階的テスト・検証の実施

### 作業開始の許可
実装作業開始前に明示的な許可をいただいてから作業を開始します。

---

**📋 移行の必要性**: Googleの推奨に従い、最新のAI性能を活用
**🛡️ 安全性**: フォールバック機能により現行システムの安定性を保証  
**⏰ 実施時期**: ユーザー承認後、適切なタイミングで実施
**🎯 期待効果**: システム性能向上とコスト最適化