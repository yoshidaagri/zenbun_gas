# 写真家モード実装ガイド - ソースコード変更点

## 📋 実装対象ファイル一覧

### 🔧 **必須変更ファイル（4ファイル）**

| ファイル | 変更内容 | 優先度 | 所要時間 |
|---------|---------|--------|----------|
| `shared/Config.gs` | 写真家モード設定追加 | 🔴 高 | 30分 |
| `core/DocumentProcessor.gs` | タグ抽出プロンプト追加 | 🔴 高 | 45分 |
| `ui/search.html` | モード選択UI追加 | 🔴 高 | 60分 |
| `main/Code.gs` | 後方互換性関数（必要に応じて） | 🟡 中 | 15分 |

### 📁 **変更不要ファイル（参考情報）**
- `shared/Utils.gs` - そのまま使用
- `shared/ErrorHandler.gs` - そのまま使用
- `core/DatabaseManager.gs` - そのまま使用
- `core/SearchEngine.gs` - そのまま使用
- `analysis/GeminiFileAPI.gs` - そのまま使用
- `analysis/AnalysisManager.gs` - そのまま使用

---

## 🎯 **Phase 1: Config.gs 写真家モード設定追加**

### **変更箇所**: `shared/Config.gs`
### **修正内容**: INDUSTRY_TEMPLATESに'photographer'を追加

```javascript
// 📍 変更箇所: INDUSTRY_TEMPLATES オブジェクト内
const INDUSTRY_TEMPLATES = {
  'design_office': { /* 既存 */ },
  'accounting_office': { /* 既存 */ },
  // 🆕 ここに追加
  'photographer': {
    name: '写真家',
    systemTitle: '📸 写真家・イラストレーター検索システム',
    searchExamples: ['ポートレート', 'アニメ', 'デジタル', '自然光', 'キャラクター', '風景'],
    placeholder: '例: ポートレート, アニメ, デジタルアート, 自然光...',
    colors: {
      primary: '#6B46C1',      // 紫色（クリエイティブ）
      light: '#8B5CF6',
      pale: '#C4B5FD',
      cream: '#F3F0FF',
      dark: '#553C9A',
      accent: '#7C3AED'
    },
    aiPrompt: 'あなたは画像・文書タグ抽出専門AIです。写真・イラスト・PDF問わず、このファイルから検索に最適な多角的タグを生成してください。被写体、色彩、構図、雰囲気、技法、文書内容など、あらゆる角度からタグを抽出し、カンマ区切りで20-30個出力してください。',
    documentTypes: ['写真', 'イラスト', 'デジタルアート', 'ポートフォリオ', '資料', 'キャラクター']
  }
};
```

### **検証ポイント**
- [ ] `ConfigManager.getAvailableIndustries()` で写真家が表示される
- [ ] `ConfigManager.setIndustry('photographer')` が動作する
- [ ] `ConfigManager.getIndustryConfig()` で正しい設定が返される

---

## 🎯 **Phase 2: DocumentProcessor.gs タグ抽出プロンプト追加**

### **変更箇所**: `core/DocumentProcessor.gs`
### **修正内容**: 写真家モード用のプロンプト生成ロジック追加

```javascript
// 📍 変更箇所: createSummaryPrompt()関数内
static createSummaryPrompt(fileName, extractedText) {
  console.log('🔍 プロンプト作成開始（カスタムプロンプト対応）');
  
  try {
    // 既存のカスタムプロンプトチェック処理...
    
    // 🆕 写真家モード特化処理を追加
    if (!customPromptInfo.hasCustom && 
        ConfigManager.getIndustryConfig().name === '写真家') {
      
      console.log('📸 写真家モード専用のタグ抽出プロンプト適用');
      
      const photographerPrompt = `
${basePrompt}

【タグ抽出特化指示】
以下のファイルから検索に最適なタグを大量生成してください：

ファイル名: ${fileName}
抽出内容: ${extractedText}

【抽出カテゴリ】
🎯 被写体・内容: 人物,動物,キャラクター,文書内容
🎨 色彩・スタイル: 主要色,色調,デザインスタイル  
📐 構図・レイアウト: アングル,フレーミング,文書構造
💡 光線・品質: 自然光,人工光,画質,スキャン品質
🎭 雰囲気・トーン: 感情,印象,ムード,文書の性質
📍 場所・用途: 環境,背景,ロケーション,文書用途
🎪 ジャンル・分野: 撮影目的,アート分野,文書種別
⚙️ 技法・形式: カメラ設定,画法,表現技法,文書形式
🎨 作品特化: デジタル,手描き,漫画,アニメ,リアル系

【出力形式】
- カンマ区切りで20-30個のタグ
- 英語・日本語併記
- 検索性重視
- 重要度順に配列

上記の観点から包括的にタグを抽出してください。
`;
      console.log('✅ 写真家モード特化プロンプト生成完了');
      return photographerPrompt;
    }
    
    // 既存の他業種処理...
  } catch (error) {
    // 既存のエラーハンドリング...
  }
}
```

### **検証ポイント**
- [ ] 写真家モード時に専用プロンプトが生成される
- [ ] 他モード時は既存プロンプトが使用される
- [ ] カスタムプロンプト使用時は写真家特化が適用されない

---

## 🎯 **Phase 3: search.html モード選択UI追加**

### **変更箇所**: `ui/search.html`
### **修正内容**: 業種選択機能とテーマ切り替え実装

#### **3.1 HTML構造追加**
```html
<!-- 📍 変更箇所: search-container内の先頭に追加 -->
<div class="mode-selector">
  <h3>業種選択</h3>
  <select id="industrySelect" onchange="switchIndustryMode()">
    <option value="design_office">🏗️ デザイン事務所</option>
    <option value="accounting_office">📊 会計事務所</option>
    <option value="photographer">📸 写真家・イラストレーター</option>
  </select>
</div>
```

#### **3.2 CSS追加**
```css
/* 📍 変更箇所: スタイル定義に追加 */
.mode-selector {
  text-align: center;
  margin-bottom: 20px;
  padding: 16px;
  background: var(--cream-khaki);
  border-radius: 8px;
  border: 1px solid var(--pale-khaki);
}

#industrySelect {
  padding: 8px 16px;
  border: 2px solid var(--pale-khaki);
  border-radius: 8px;
  font-size: 14px;
  background: white;
  min-width: 200px;
}

/* 🆕 写真家モード用カラーパレット */
:root.photographer-mode {
  --primary-khaki: #6B46C1;
  --light-khaki: #8B5CF6;
  --pale-khaki: #C4B5FD;
  --cream-khaki: #F3F0FF;
  --dark-khaki: #553C9A;
  --accent-khaki: #7C3AED;
  --shadow-khaki: rgba(107, 70, 193, 0.2);
}
```

#### **3.3 JavaScript関数追加**
```javascript
// 📍 変更箇所: JavaScript関数に追加
/**
 * 業種モード切り替え
 */
function switchIndustryMode() {
  const selectedMode = document.getElementById('industrySelect').value;
  
  showStatus(`🔄 ${selectedMode}モードに切り替え中...`, 'info');
  
  google.script.run
    .withSuccessHandler(function(result) {
      if (result.success) {
        // テーマ適用
        applyIndustryTheme(selectedMode, result.config);
        
        // UI更新
        updateUIForMode(result.config);
        
        showStatus(`✅ ${result.config.name}モードに切り替えました`, 'success');
      } else {
        showStatus(`❌ 切り替えエラー: ${result.error}`, 'error');
      }
    })
    .withFailureHandler(function(error) {
      showStatus(`❌ 切り替えエラー: ${error.message}`, 'error');
    })
    .setIndustryAndGetConfig(selectedMode);
}

/**
 * 業種テーマ適用
 */
function applyIndustryTheme(mode, config) {
  // ルート要素のクラス更新
  document.documentElement.className = mode + '-mode';
  
  // カラーテーマ動的適用
  const root = document.documentElement;
  Object.entries(config.colors).forEach(([key, value]) => {
    const cssVar = key === 'primary' ? '--primary-khaki' :
                   key === 'light' ? '--light-khaki' :
                   key === 'pale' ? '--pale-khaki' :
                   key === 'cream' ? '--cream-khaki' :
                   key === 'dark' ? '--dark-khaki' :
                   key === 'accent' ? '--accent-khaki' : null;
    if (cssVar) root.style.setProperty(cssVar, value);
  });
}

/**
 * UI要素更新
 */
function updateUIForMode(config) {
  // タイトル更新
  document.querySelector('.header h1').textContent = config.systemTitle;
  
  // プレースホルダー更新
  document.getElementById('searchInput').placeholder = config.placeholder;
  
  // 検索例更新
  const examplesContainer = document.querySelector('.example-tags');
  examplesContainer.innerHTML = '';
  config.searchExamples.forEach(example => {
    const tag = document.createElement('span');
    tag.className = 'example-tag';
    tag.textContent = example;
    tag.onclick = () => searchExample(example);
    examplesContainer.appendChild(tag);
  });
}

// 📍 変更箇所: 初期化時の業種設定読み込み
window.onload = function() {
  loadCurrentIndustryMode();
};

function loadCurrentIndustryMode() {
  google.script.run
    .withSuccessHandler(function(config) {
      // モード選択を現在の設定に合わせる
      const industryKey = Object.keys(INDUSTRY_TEMPLATES).find(key => 
        INDUSTRY_TEMPLATES[key].name === config.name
      ) || 'design_office';
      
      document.getElementById('industrySelect').value = industryKey;
      applyIndustryTheme(industryKey, config);
      updateUIForMode(config);
    })
    .getCurrentIndustryConfig();
}
```

### **検証ポイント**
- [ ] 業種選択プルダウンが表示される
- [ ] 写真家モード選択で紫色テーマに切り替わる
- [ ] 検索例が写真家用に更新される
- [ ] ページリロード時に現在のモードが保持される

---

## 🎯 **Phase 4: Code.gs 後方互換性関数追加**

### **変更箇所**: `main/Code.gs`
### **修正内容**: 業種切り替え用関数追加

```javascript
// 📍 変更箇所: ファイル末尾に追加
/**
 * 業種設定と設定取得（UI用）
 * @param {string} industryType 業種タイプ
 * @returns {Object} 設定結果
 */
function setIndustryAndGetConfig(industryType) {
  try {
    const result = ConfigManager.setIndustry(industryType);
    return {
      success: true,
      config: result,
      message: `${result.name}モードに切り替えました`
    };
  } catch (error) {
    console.error('❌ 業種切り替えエラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 現在の業種設定取得（UI用）
 * @returns {Object} 現在の業種設定
 */
function getCurrentIndustryConfig() {
  try {
    return ConfigManager.getIndustryConfig();
  } catch (error) {
    console.error('❌ 業種設定取得エラー:', error);
    return ConfigManager.getIndustryConfig(); // フォールバック
  }
}
```

### **検証ポイント**
- [ ] UIから業種切り替えが正常動作する
- [ ] エラー時に適切なメッセージが返される

---

## 📋 **実装チェックリスト**

### **Phase 1: 設定追加** ✅
- [ ] Config.gsにphotographer設定追加
- [ ] 利用可能業種一覧に表示確認
- [ ] 業種切り替え動作確認

### **Phase 2: プロンプト拡張** ✅
- [ ] 写真家モード専用プロンプト実装
- [ ] タグ抽出ロジック動作確認
- [ ] 他モードとの競合なし確認

### **Phase 3: UI拡張** ✅
- [ ] 業種選択プルダウン実装
- [ ] 紫色テーマ切り替え実装
- [ ] 動的UI更新実装
- [ ] レスポンシブ対応確認

### **Phase 4: 統合テスト** ✅
- [ ] 3つのモード間切り替えテスト
- [ ] 各モードでの検索動作テスト
- [ ] ページリロード時の状態保持テスト
- [ ] エラーハンドリング動作テスト

---

## 🚀 **デプロイ手順**

### **GASファイルコピー順序**
1. **Config.gs** (既存更新)
2. **DocumentProcessor.gs** (既存更新) 
3. **Code.gs** (既存更新)
4. **search.html → index.html** (既存更新)

### **動作確認手順**
1. ✅ 業種選択で「写真家・イラストレーター」を選択
2. ✅ テーマが紫色に変更されることを確認
3. ✅ 検索例が写真家用に更新されることを確認
4. ✅ 実際に画像ファイルで解析・検索テスト実行
5. ✅ タグが適切に生成されることを確認

---

## ⚠️ **注意事項**

### **互換性維持**
- 既存の2モード（デザイン事務所・会計事務所）は影響なし
- 既存データベース構造は変更なし
- 既存APIキー・設定は引き続き使用

### **段階的実装推奨**
1. Phase 1のみ実装→動作確認
2. Phase 2追加→プロンプトテスト
3. Phase 3追加→UI動作確認
4. Phase 4追加→統合テスト

### **バックアップ推奨**
- 既存ファイルのバックアップ作成
- 段階的デプロイで問題時の復旧準備

**総実装時間**: 約2.5時間（テスト込み）