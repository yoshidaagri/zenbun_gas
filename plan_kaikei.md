# 📊 会計事務所PoC実装計画 - 慎重・段階的アプローチ

## 📋 プロジェクト概要

### 🎯 目標
現在のデザイン事務所特化システムを、**会計事務所でのPoC実施**が可能な状態に拡張する。既存システムに影響を与えない安全な実装を最優先とする。

### 🏢 対象業種
- **主要**: 会計事務所・税理士事務所（PoC対象）
- **継続**: デザイン事務所（既存機能維持）

### ⚡ 実装スコープ（最小限）
**変更対象**: Config.gs業種切り替え機能 + 最小限UI修正
**非変更**: 検索エンジン、データベース、AI分析機能（既存機能保護）

## 🎨 会計事務所テンプレート仕様

### 📊 **システム設定**
```javascript
'accounting_office': {
  name: '会計事務所',
  systemTitle: '📊 会計事務所ドキュメント検索システム',
  searchExamples: ['決算書', '仕訳帳', '請求書', '領収書', '税務調書', '給与'],
  placeholder: '例: 決算書, 仕訳帳, 税務調書...',
  colors: {
    primary: '#2E7D32',      // 会計グリーン（信頼性）
    light: '#4CAF50',
    pale: '#A5D6A7',
    cream: '#E8F5E8',
    dark: '#1B5E20',
    accent: '#66BB6A'
  },
  aiPrompt: 'あなたは会計事務所の専門AIです。決算書、帳簿、税務書類を専門に解析します。400文字以内で簡潔に、会計・税務の専門用語を使って回答してください。',
  documentTypes: ['決算書', '帳簿', '請求書', '領収書', '税務書類', '給与明細']
}
```

### 🔍 **会計特化検索例**
| 分類 | 検索キーワード | 対象文書 |
|------|---------------|----------|
| **決算関連** | 決算書、貸借対照表、損益計算書 | 年次・月次決算書類 |
| **帳簿類** | 仕訳帳、総勘定元帳、補助簿 | 日常経理帳簿 |
| **税務書類** | 税務調書、法人税申告書、消費税申告書 | 各種税務書類 |
| **給与関連** | 給与、源泉徴収票、社会保険 | 人事・給与書類 |
| **取引書類** | 請求書、領収書、契約書 | 日常取引書類 |

### 🎨 **UI/UX設計**
- **カラーテーマ**: 信頼感のあるグリーン系
- **検索プレースホルダー**: 会計専門用語例示
- **AI応答**: 会計・税務専門用語での簡潔な回答

## 🏗️ 実装アーキテクチャ

### ✅ **完了済み基盤（Phase 1）**

#### **shared/Config.gs 拡張**
```javascript
// 業種テンプレート定義
const INDUSTRY_TEMPLATES = {
  'design_office': { /* 既存設定 */ },
  'accounting_office': { /* 会計事務所設定 */ }
};

// 業種設定管理機能
class ConfigManager {
  static getIndustryConfig()     // 現在の業種設定取得
  static setIndustry(type)       // 業種切り替え
  static getUISettings()         // UI設定取得
  static getSearchExamples()     // 検索例取得
  static getAIPrompt()           // AIプロンプト取得
}
```

#### **main/Code.gs API追加**
```javascript
// フロントエンド連携API
function getIndustryUISettings()  // UI設定取得
function setIndustryType(type)    // 業種切り替え
function getAvailableIndustries() // 業種一覧取得
```

### 🎯 **Phase 2: 段階的実装計画**

## 📅 実装スケジュール（1.5日）

### **Day 1 Morning (3時間): バックエンド完成**

#### **✅ 完了済み作業**
- [x] Config.gs業種テンプレート定義
- [x] 設定管理機能実装  
- [x] main/Code.gs API実装

#### **🧪 Step 1: バックエンドテスト（30分）**
```javascript
// GASエディタで順次実行・確認
ConfigManager.getIndustryConfig()           // デフォルト設定確認
ConfigManager.setIndustry('accounting_office') // 会計事務所に切り替え
ConfigManager.getUISettings()               // UI設定確認
getIndustryUISettings()                     // API動作確認
```

**期待結果**:
```javascript
{
  title: "📊 会計事務所ドキュメント検索システム",
  searchExamples: ["決算書", "仕訳帳", "請求書", "領収書", "税務調書", "給与"],
  placeholder: "例: 決算書, 仕訳帳, 税務調書...",
  colors: { primary: "#2E7D32" }
}
```

#### **⚙️ Step 2: スクリプトプロパティ設定（15分）**
```
INDUSTRY_TYPE = 'accounting_office'
```
設定後、`ConfigManager.getIndustryConfig()`で恒久設定確認

### **Day 1 Afternoon (2時間): フロントエンド実装**

#### **🎨 Step 3: UI動的読み込み機能（90分）**

**ui/search.html 修正箇所**:

##### **A. ページ読み込み時設定反映**
```javascript
// 既存のwindow.onload に追加
window.onload = function() {
  loadIndustrySettings();  // 業種設定読み込み
  console.log('🚀 システム起動');
};

// 業種設定読み込み関数
function loadIndustrySettings() {
  google.script.run
    .withSuccessHandler(applyIndustrySettings)
    .withFailureHandler(function(error) {
      console.error('❌ 業種設定読み込みエラー:', error);
      // デフォルト設定で続行
    })
    .getIndustryUISettings();
}

// 業種設定をUIに適用
function applyIndustrySettings(settings) {
  console.log('🎨 業種設定適用開始:', settings);
  
  // タイトル更新
  document.querySelector('.header h1').textContent = settings.title;
  document.title = settings.title + ' v2.0';
  
  // プレースホルダー更新
  document.getElementById('searchInput').placeholder = settings.placeholder;
  
  // 検索例動的生成
  updateSearchExamples(settings.searchExamples);
  
  console.log('✅ 業種設定適用完了');
}
```

##### **B. 検索例動的生成**
```javascript
// 検索例タグを動的生成
function updateSearchExamples(examples) {
  const container = document.querySelector('.example-tags');
  
  // 全データ表示は常に最初に配置
  let html = '<span class="example-tag" onclick="searchExample(\'\')">全データ表示</span>';
  
  // 業種別検索例を追加
  examples.forEach(example => {
    html += `<span class="example-tag" onclick="searchExample('${example}')">${example}</span>`;
  });
  
  container.innerHTML = html;
  console.log(`📝 検索例更新完了: ${examples.length}個`);
}
```

#### **🧪 Step 4: フロントエンドテスト（30分）**
1. Webアプリ再読み込み
2. タイトルが「📊 会計事務所ドキュメント検索システム」に変更確認
3. 検索例が会計専門用語に変更確認
4. プレースホルダー更新確認
5. 既存検索機能の正常動作確認

### **Day 2 (4時間): カラーテーマ・管理機能・最終テスト**

#### **🎨 Step 5: カラーテーマ適用（90分）**
```javascript
// 業種設定適用関数に追加
function applyIndustrySettings(settings) {
  // ... 既存処理 ...
  
  // カラーテーマ適用
  if (settings.colors) {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', settings.colors.primary);
    root.style.setProperty('--light-color', settings.colors.light);
    root.style.setProperty('--pale-color', settings.colors.pale);
    root.style.setProperty('--cream-color', settings.colors.cream);
    console.log('🎨 カラーテーマ適用完了:', settings.colors.primary);
  }
}
```

#### **🏢 Step 6: 業種切り替えUI（90分）**
```javascript
// 管理画面に業種切り替え機能追加
function showIndustrySelector() {
  google.script.run
    .withSuccessHandler(function(industries) {
      let html = `
        <div class="industry-selector">
          <h4>🏢 業種切り替え</h4>
          <select id="industrySelect">
            ${industries.map(industry => 
              `<option value="${industry.key}">${industry.name}</option>`
            ).join('')}
          </select>
          <button onclick="switchIndustry()" class="mgmt-btn">切り替え実行</button>
        </div>`;
      
      document.getElementById('industrySettings').innerHTML = html;
    })
    .getAvailableIndustries();
}

// 業種切り替え実行
function switchIndustry() {
  const selectedIndustry = document.getElementById('industrySelect').value;
  
  google.script.run
    .withSuccessHandler(function(result) {
      if (result.success) {
        alert(`✅ ${result.message}\n\nページを再読み込みします。`);
        location.reload();
      } else {
        alert(`❌ 切り替えエラー: ${result.error}`);
      }
    })
    .setIndustryType(selectedIndustry);
}
```

#### **🧪 Step 7: 最終統合テスト（60分）**

##### **機能テスト**
- [ ] デザイン事務所 ⟷ 会計事務所 業種切り替え
- [ ] 各業種での検索機能正常動作
- [ ] AI分析機能正常動作  
- [ ] 統計記録機能正常動作

##### **ユーザビリティテスト**
- [ ] 初回訪問時の適切な業種設定表示
- [ ] 業種切り替え後のUI即座反映
- [ ] モバイル表示での動作確認

## 📊 技術仕様詳細

### 🏗️ **影響範囲分析**

#### **変更対象ファイル**
| ファイル | 変更規模 | 影響範囲 | リスク |
|----------|----------|----------|--------|
| `shared/Config.gs` | 大（+100行） | 設定管理のみ | 低 |
| `main/Code.gs` | 中（+50行） | API追加のみ | 低 |
| `ui/search.html` | 中（+80行） | UI表示のみ | 中 |

#### **非変更ファイル（安全保護）**
- `core/SearchEngine.gs` - 検索ロジック
- `core/DatabaseManager.gs` - データベース操作
- `analysis/AnalysisManager.gs` - AI分析
- `analysis/GeminiFileAPI.gs` - Gemini連携

### 🔧 **設定管理**

#### **スクリプトプロパティ**
```
INDUSTRY_TYPE = 'accounting_office'  # 業種選択
CUSTOM_INDUSTRY_CONFIG = '{...}'     # カスタム設定（オプション）
```

#### **設定変更方法**
```javascript
// 方法1: GASエディタで直接実行
ConfigManager.setIndustry('accounting_office');

// 方法2: スクリプトプロパティで恒久設定  
// GAS管理画面 → スクリプトプロパティ → INDUSTRY_TYPE設定

// 方法3: Webアプリ管理画面で切り替え（UI実装後）
// 管理機能 → 業種切り替え → 会計事務所選択
```

## 🧪 テストプロトコル

### 📋 **Phase A: バックエンド単体テスト**

#### **A-1. 設定管理テスト**
```javascript
// 1. デフォルト設定確認
const defaultConfig = ConfigManager.getIndustryConfig();
console.log('デフォルト:', defaultConfig.name); // → "デザイン事務所"

// 2. 会計事務所切り替え
ConfigManager.setIndustry('accounting_office');
const accountingConfig = ConfigManager.getIndustryConfig();
console.log('切り替え後:', accountingConfig.name); // → "会計事務所"

// 3. UI設定確認
const uiSettings = ConfigManager.getUISettings();
console.log('検索例:', uiSettings.searchExamples); // → ["決算書", "仕訳帳", ...]
```

#### **A-2. API動作テスト**
```javascript
// フロントエンド連携APIテスト
const settings = getIndustryUISettings();
console.log('API応答:', settings);

const industries = getAvailableIndustries();
console.log('業種一覧:', industries);
```

### 📋 **Phase B: フロントエンド統合テスト**

#### **B-1. UI反映テスト**
1. **業種：デザイン事務所設定**
   - タイトル: "🏗️ デザイン事務所ドキュメント検索システム"
   - 検索例: 設計、平面図、カフェ、住宅、テラス、2階
   - カラー: カーキ色 (#8B9A5B)

2. **業種：会計事務所設定**  
   - タイトル: "📊 会計事務所ドキュメント検索システム"
   - 検索例: 決算書、仕訳帳、請求書、領収書、税務調書、給与
   - カラー: グリーン (#2E7D32)

#### **B-2. 機能継続性テスト**
- [ ] 検索機能：キーワード検索正常動作
- [ ] AI分析機能：ファイル解析・質問応答正常動作
- [ ] 統計機能：利用統計記録正常動作
- [ ] 管理機能：各種テスト・デバッグ機能正常動作

### 📋 **Phase C: エンドツーエンドテスト**

#### **C-1. 業種切り替えフロー**
1. デザイン事務所でシステム確認
2. 管理画面で会計事務所に切り替え
3. 再読み込み後、会計事務所UI確認
4. 会計専門用語で検索実行
5. AI分析で会計書類を解析
6. デザイン事務所に戻して元の状態確認

#### **C-2. エラーハンドリングテスト**
- [ ] 不正な業種指定エラー処理
- [ ] スクリプトプロパティ未設定時のデフォルト動作
- [ ] カスタム設定JSON構文エラー処理
- [ ] API呼び出し失敗時のフォールバック動作

## 🎯 成功指標・KPI

### 📊 **技術指標**

#### **Performance**
- [ ] 業種切り替え時間：**10秒以内**
- [ ] UI設定反映時間：**3秒以内**
- [ ] 既存機能の性能：**劣化0%**

#### **Reliability**  
- [ ] 業種設定取得成功率：**100%**
- [ ] UI反映成功率：**100%**
- [ ] エラー発生時のフォールバック：**100%**

#### **Compatibility**
- [ ] 既存機能継続性：**100%**
- [ ] モバイル対応：**完全対応**
- [ ] ブラウザ互換性：**Chrome/Safari/Edge対応**

### 👥 **ユーザー体験指標**

#### **Usability**
- [ ] 初回訪問時の適切な業種表示：**即座認識**
- [ ] 業種切り替えの直感性：**非エンジニアでも可能**
- [ ] 検索例の理解性：**会計専門用語での即座理解**

#### **Effectiveness**  
- [ ] 会計書類での検索精度：**90%以上**
- [ ] AI分析での会計用語認識：**95%以上**
- [ ] 専門用語での回答品質：**高品質**

## 🚨 リスク管理

### ⚠️ **特定リスクと対策**

#### **Risk 1: 既存機能への影響**
- **影響度**: 高
- **対策**: 非変更ファイルの徹底保護、段階的テスト実施
- **Rollback**: `setIndustry('design_office')`で即座復旧

#### **Risk 2: UI表示崩れ**
- **影響度**: 中  
- **対策**: CSS変数活用、フォールバック設定実装
- **Rollback**: デフォルト設定での表示継続

#### **Risk 3: パフォーマンス劣化**
- **影響度**: 中
- **対策**: 設定キャッシュ実装、API呼び出し最適化
- **Rollback**: 動的読み込み無効化

### 🛡️ **フォールバック戦略**

#### **Level 1: 設定レベルロールバック**
```javascript
// 緊急時: 即座にデザイン事務所に戻す
ConfigManager.setIndustry('design_office');
```

#### **Level 2: ファイルレベルロールバック**
```javascript  
// UI設定取得エラー時のフォールバック
function getIndustryUISettings() {
  try {
    return ConfigManager.getUISettings();
  } catch (error) {
    console.error('設定取得エラー、デフォルト設定使用');
    return DEFAULT_DESIGN_SETTINGS; // 固定値
  }
}
```

#### **Level 3: システムレベルロールバック**
- Git commit rollback
- GASファイル手動復旧
- スクリプトプロパティリセット

## 📝 運用マニュアル

### 🏢 **会計事務所への切り替え手順**

#### **方法1: 簡単切り替え（推奨・30秒）**
1. GASエディタ → プロジェクトの設定 → スクリプトプロパティ
2. `INDUSTRY_TYPE` プロパティを追加
3. 値に `accounting_office` を設定  
4. Webアプリを再読み込み

#### **方法2: GASエディタ実行（開発者向け・10秒）**
```javascript
ConfigManager.setIndustry('accounting_office');
```

#### **方法3: Webアプリ内切り替え（UI実装後・20秒）**
1. 管理機能 → 🏢 業種切り替え
2. 「会計事務所」を選択して「切り替え実行」
3. 自動でページ再読み込み

### 🔧 **トラブルシューティング**

#### **問題1: 業種設定が反映されない**
```javascript
// 診断手順
ConfigManager.getIndustryConfig()     // 設定確認
getIndustryUISettings()               // API確認

// 対策
ConfigManager.setIndustry('accounting_office')  // 再設定
```

#### **問題2: UI表示が崩れる**  
```javascript
// 診断手順
console.log('UI設定:', settings);    // ブラウザコンソール確認

// 対策  
loadIndustrySettings()                // 再読み込み
```

#### **問題3: 検索機能が動作しない**
```javascript
// 診断手順
testSearchWithStats('決算書')         // 検索テスト実行

// 対策
ConfigManager.setIndustry('design_office') // 一時的にデフォルトに戻す
```

### 📊 **監視・メンテナンス**

#### **定期確認項目（週次）**
- [ ] 業種設定の整合性確認
- [ ] UI表示の正常性確認
- [ ] 検索・AI分析機能の動作確認
- [ ] エラーログの確認

#### **月次改善項目**
- [ ] 利用統計による業種別使用状況分析
- [ ] 会計専門用語の検索精度向上
- [ ] AI回答品質の向上
- [ ] 新しい文書タイプへの対応検討

## 🚀 将来拡張計画

### 📈 **Short Term (1-2ヶ月)**
- [ ] 医療機関テンプレート追加
- [ ] 製造業テンプレート追加  
- [ ] カスタムカラーテーマエディタ
- [ ] 業種別AIプロンプト最適化

### 📈 **Medium Term (3-6ヶ月)**
- [ ] 業種別ダッシュボード機能
- [ ] 専門用語辞書機能
- [ ] 業種特化レポート機能
- [ ] 多言語対応（英語・中国語）

### 📈 **Long Term (6-12ヶ月)**  
- [ ] SaaS化・マルチテナント対応
- [ ] 業種別プラグインアーキテクチャ
- [ ] エンタープライズ向けカスタマイズ機能
- [ ] AI専門知識学習システム

## 🎉 プロジェクト完了基準

### ✅ **Technical Completion**
- [ ] 全機能テストが100%成功
- [ ] 既存機能に0%の悪影響
- [ ] パフォーマンス目標を100%達成
- [ ] エラーハンドリングが完全動作

### ✅ **User Experience Completion**
- [ ] 会計事務所UI完全動作
- [ ] 業種切り替えが直感的操作で可能
- [ ] 会計専門用語での高精度検索・AI分析
- [ ] 非エンジニアでも設定変更可能

### ✅ **Business Completion**
- [ ] 実際の会計事務所でのPoC実施完了
- [ ] ユーザーフィードバック収集完了
- [ ] 次期業種展開の基盤完成
- [ ] SaaS展開の技術的準備完了

---

## 🎯 **Next Action（即座実行可能）**

### **Step 1: 5分で基盤確認**
```javascript
// GASエディタで実行
ConfigManager.getIndustryConfig();          // 現在設定確認
ConfigManager.setIndustry('accounting_office'); // 会計事務所切り替え  
getIndustryUISettings();                    // API動作確認
```

### **Step 2: 15分で恒久設定**  
- スクリプトプロパティに `INDUSTRY_TYPE = 'accounting_office'` 設定
- Webアプリ表示確認（まだタイトル等は変わらない）

### **Step 3: 30分でUI実装**
- `ui/search.html`に動的読み込み機能追加
- 会計事務所UIの動作確認

**💡 この計画に従って実装すれば、安全かつ確実に会計事務所PoCを実現できます！**

---

**Made with 📊 for 会計事務所PoC成功**