# 📝 カスタムプロンプト機能実装計画

## 🎯 要件定義

### **機能概要**
新規ドキュメント解析時に、スプレッドシートの別シート「custom」のA1セルにプロンプトが書かれている場合はそれを使用し、空の場合はConfig.gsの業種別プロンプトを使用する。

### **現在の実装状況**
```javascript
// core/DocumentProcessor.gs:1055 現在の処理
const industryPrompt = industryConfig.aiPrompt || 'あなたは文書解析の専門AIです。';
```

### **目標仕様**
```
1. スプレッドシートの「custom」シート → A1セル確認
2. A1セルにプロンプトあり → カスタムプロンプト使用
3. A1セル空 → Config.gsの業種別プロンプト使用
```

## 🏗️ 実装設計

### **Phase 1: CustomPromptManager クラス実装**

#### **1-1. 新規ファイル作成**
```javascript
// shared/CustomPromptManager.gs （新規作成）
/**
 * カスタムプロンプト管理クラス
 * スプレッドシートの「custom」シートからカスタムプロンプトを取得・管理
 */
class CustomPromptManager {
  
  /**
   * カスタムプロンプトを取得
   * @param {string} spreadsheetId スプレッドシートID
   * @returns {Object} プロンプト情報
   */
  static getCustomPrompt(spreadsheetId) {
    console.log('📝 ===== カスタムプロンプト取得開始 =====');
    
    try {
      if (!spreadsheetId) {
        console.warn('⚠️ スプレッドシートIDが未設定');
        return { hasCustom: false, prompt: null, source: 'no_spreadsheet' };
      }
      
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      console.log(`📊 スプレッドシート接続成功: ${spreadsheet.getName()}`);
      
      // 「custom」シート取得
      let customSheet;
      try {
        customSheet = spreadsheet.getSheetByName('custom');
        console.log('✅ customシート取得成功');
      } catch (error) {
        console.log('📋 customシートが存在しません - 作成します');
        customSheet = this.createCustomSheet(spreadsheet);
      }
      
      // A1セルからプロンプト取得
      const customPromptCell = customSheet.getRange('A1');
      const customPrompt = customPromptCell.getValue();
      
      console.log(`📝 A1セル内容確認: ${customPrompt ? '内容あり' : '空'}`);
      
      if (!customPrompt || typeof customPrompt !== 'string' || customPrompt.trim() === '') {
        console.log('⚪ カスタムプロンプトなし - デフォルト使用');
        return { 
          hasCustom: false, 
          prompt: null, 
          source: 'empty_cell',
          message: 'A1セルが空のため、業種別デフォルトプロンプトを使用します'
        };
      }
      
      const trimmedPrompt = customPrompt.trim();
      console.log(`✅ カスタムプロンプト取得成功 (${trimmedPrompt.length}文字)`);
      console.log(`📋 プロンプト内容: ${trimmedPrompt.substring(0, 100)}...`);
      
      return {
        hasCustom: true,
        prompt: trimmedPrompt,
        source: 'custom_sheet',
        length: trimmedPrompt.length,
        preview: trimmedPrompt.substring(0, 200),
        message: `カスタムプロンプトを使用します (${trimmedPrompt.length}文字)`
      };
      
    } catch (error) {
      console.error('❌ カスタムプロンプト取得エラー:', error);
      return { 
        hasCustom: false, 
        prompt: null, 
        source: 'error',
        error: error.message,
        message: `エラーのためデフォルトプロンプトを使用: ${error.message}`
      };
    }
    
    console.log('📝 ===== カスタムプロンプト取得完了 =====');
  }
  
  /**
   * customシートを作成
   * @param {SpreadsheetApp.Spreadsheet} spreadsheet スプレッドシート
   * @returns {SpreadsheetApp.Sheet} 作成されたシート
   */
  static createCustomSheet(spreadsheet) {
    console.log('🆕 customシート作成開始');
    
    try {
      const customSheet = spreadsheet.insertSheet('custom');
      
      // A1セルに説明文を設定
      const instructionText = `このセル（A1）にカスタムプロンプトを入力してください。
空の場合は業種別デフォルトプロンプトが使用されます。

例：
あなたは○○専門のAIです。以下の文書を解析し、特に【項目A】【項目B】に注目して要約してください。`;
      
      customSheet.getRange('A1').setValue(instructionText);
      
      // セルの書式設定
      const a1Range = customSheet.getRange('A1');
      a1Range.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP); // 文字列の折り返し
      a1Range.setVerticalAlignment('top'); // 上揃え
      a1Range.setFontSize(11);
      
      // 行・列サイズ調整
      customSheet.setRowHeight(1, 150); // A1行を150pxに
      customSheet.setColumnWidth(1, 600); // A列を600pxに
      
      // シート保護設定（任意）
      // const protection = customSheet.protect().setDescription('カスタムプロンプト設定シート');
      
      console.log('✅ customシート作成完了');
      return customSheet;
      
    } catch (error) {
      console.error('❌ customシート作成エラー:', error);
      throw error;
    }
  }
  
  /**
   * カスタムプロンプトを設定
   * @param {string} spreadsheetId スプレッドシートID
   * @param {string} prompt カスタムプロンプト
   * @returns {Object} 設定結果
   */
  static setCustomPrompt(spreadsheetId, prompt) {
    console.log('📝 ===== カスタムプロンプト設定開始 =====');
    
    try {
      if (!spreadsheetId) {
        throw new Error('スプレッドシートIDが未設定です');
      }
      
      if (!prompt || typeof prompt !== 'string') {
        throw new Error('有効なプロンプトが指定されていません');
      }
      
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      
      // customシート取得または作成
      let customSheet;
      try {
        customSheet = spreadsheet.getSheetByName('custom');
      } catch (error) {
        customSheet = this.createCustomSheet(spreadsheet);
      }
      
      // A1セルにプロンプト設定
      customSheet.getRange('A1').setValue(prompt.trim());
      
      console.log(`✅ カスタムプロンプト設定完了 (${prompt.length}文字)`);
      
      return {
        success: true,
        message: `カスタムプロンプトを設定しました (${prompt.length}文字)`,
        length: prompt.length,
        preview: prompt.substring(0, 100)
      };
      
    } catch (error) {
      console.error('❌ カスタムプロンプト設定エラー:', error);
      return {
        success: false,
        error: error.message,
        message: `設定エラー: ${error.message}`
      };
    }
    
    console.log('📝 ===== カスタムプロンプト設定完了 =====');
  }
  
  /**
   * カスタムプロンプトをクリア
   * @param {string} spreadsheetId スプレッドシートID
   * @returns {Object} クリア結果
   */
  static clearCustomPrompt(spreadsheetId) {
    console.log('🗑️ ===== カスタムプロンプトクリア開始 =====');
    
    try {
      if (!spreadsheetId) {
        throw new Error('スプレッドシートIDが未設定です');
      }
      
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      const customSheet = spreadsheet.getSheetByName('custom');
      
      if (!customSheet) {
        return {
          success: true,
          message: 'customシートが存在しないため、クリア不要です',
          source: 'no_sheet'
        };
      }
      
      // A1セルをクリア
      customSheet.getRange('A1').clear();
      
      console.log('✅ カスタムプロンプトクリア完了');
      
      return {
        success: true,
        message: 'カスタムプロンプトをクリアしました。デフォルトプロンプトが使用されます。',
        source: 'cleared'
      };
      
    } catch (error) {
      console.error('❌ カスタムプロンプトクリアエラー:', error);
      return {
        success: false,
        error: error.message,
        message: `クリアエラー: ${error.message}`
      };
    }
    
    console.log('🗑️ ===== カスタムプロンプトクリア完了 =====');
  }
  
  /**
   * カスタムプロンプト状況を取得
   * @param {string} spreadsheetId スプレッドシートID
   * @returns {Object} 状況情報
   */
  static getCustomPromptStatus(spreadsheetId) {
    try {
      const promptInfo = this.getCustomPrompt(spreadsheetId);
      const industryConfig = ConfigManager.getIndustryConfig();
      
      return {
        custom: promptInfo,
        default: {
          industry: industryConfig.name,
          prompt: industryConfig.aiPrompt,
          length: industryConfig.aiPrompt ? industryConfig.aiPrompt.length : 0
        },
        currentlyUsing: promptInfo.hasCustom ? 'custom' : 'default',
        recommendation: promptInfo.hasCustom ? 
          'カスタムプロンプトが適用されます' : 
          `${industryConfig.name}のデフォルトプロンプトが使用されます`
      };
      
    } catch (error) {
      return { error: error.message };
    }
  }
}
```

### **Phase 2: DocumentProcessor.gs 改修**

#### **2-1. createSummaryPrompt メソッド改修**
```javascript
// core/DocumentProcessor.gs:1049 改修
/**
 * AI要約用プロンプトを作成（カスタムプロンプト対応）
 * @param {string} fileName ファイル名
 * @param {string} extractedText 抽出テキスト
 * @returns {string} プロンプト
 */
static createSummaryPrompt(fileName, extractedText) {
  console.log('🔍 プロンプト作成開始（カスタムプロンプト対応）');
  
  try {
    // カスタムプロンプトチェック
    const config = ConfigManager.getConfig();
    const customPromptInfo = CustomPromptManager.getCustomPrompt(config.spreadsheetId);
    
    console.log(`📋 プロンプト判定: ${customPromptInfo.source}`);
    console.log(`📝 メッセージ: ${customPromptInfo.message}`);
    
    let basePrompt;
    let promptSource;
    
    if (customPromptInfo.hasCustom) {
      // カスタムプロンプト使用
      basePrompt = customPromptInfo.prompt;
      promptSource = `カスタム (${customPromptInfo.length}文字)`;
      console.log('✅ カスタムプロンプト適用');
      console.log(`📝 内容: ${customPromptInfo.preview}...`);
      
    } else {
      // デフォルトプロンプト使用
      const industryConfig = ConfigManager.getIndustryConfig();
      basePrompt = industryConfig.aiPrompt || 'あなたは文書解析の専門AIです。';
      promptSource = `デフォルト (${industryConfig.name})`;
      console.log(`🏢 業種別デフォルトプロンプト適用: ${industryConfig.name}`);
      console.log(`📝 基本プロンプト: ${basePrompt.substring(0, 100)}...`);
    }
    
    // 🆕 会計事務所の場合のみ特化処理（カスタムプロンプト使用時は適用しない）
    if (!customPromptInfo.hasCustom && 
        ConfigManager.getIndustryConfig().name === '会計事務所' && 
        ConfigManager.getIndustryConfig().analysisFields) {
      
      console.log('📊 会計事務所専用の重点解析項目を適用');
      const specialFields = ConfigManager.getIndustryConfig().analysisFields.join('、');
      console.log(`📋 重点項目: ${specialFields}`);
      
      const accountingPrompt = `
${basePrompt}

【重点解析項目】以下の項目が記載されている場合は必ず抽出してください：
${specialFields}

以下のレシート・領収書情報から、上記の重点項目を含む重要なポイントを簡潔にまとめてください。

ファイル名: ${fileName}
抽出テキスト: ${extractedText}

重点項目が含まれている場合は必ず記載し、400文字以内で簡潔に会計・税務の専門用語を使って検索しやすい形式でまとめてください。
`;
      console.log('✅ 会計事務所特化プロンプト生成完了');
      console.log(`📊 プロンプト種別: ${promptSource} + 会計特化`);
      return accountingPrompt;
    }
    
    // カスタムプロンプトまたは他業種の標準処理
    const finalPrompt = `
${basePrompt}

以下のドキュメント情報から、重要なポイントを簡潔にまとめてください。

ファイル名: ${fileName}
抽出テキスト: ${extractedText}

上記の情報を元に、検索しやすい形式で重要な内容を要約してください。
`;
    
    console.log(`✅ プロンプト生成完了 - 種別: ${promptSource}`);
    console.log(`📏 最終プロンプト長: ${finalPrompt.length}文字`);
    
    return finalPrompt;
    
  } catch (error) {
    console.error('❌ プロンプト作成エラー:', error);
    
    // フォールバック処理
    const fallbackPrompt = `
あなたは文書解析の専門AIです。

以下のドキュメント情報から、重要なポイントを簡潔にまとめてください。

ファイル名: ${fileName}
抽出テキスト: ${extractedText}

上記の情報を元に、検索しやすい形式で重要な内容を要約してください。
`;
    console.log('⚠️ フォールバックプロンプト使用');
    return fallbackPrompt;
  }
}
```

### **Phase 3: UI/UX機能拡張**

#### **3-1. main/Code.gs 管理機能追加**
```javascript
// main/Code.gs 追加関数
/**
 * カスタムプロンプト状況を確認
 */
function checkCustomPromptStatus() {
  console.log('📝 ===== カスタムプロンプト状況確認 =====');
  
  try {
    const config = ConfigManager.getConfig();
    const status = CustomPromptManager.getCustomPromptStatus(config.spreadsheetId);
    
    console.log('📊 カスタムプロンプト状況:');
    console.log(`   現在使用中: ${status.currentlyUsing === 'custom' ? 'カスタム' : 'デフォルト'}`);
    console.log(`   推奨事項: ${status.recommendation}`);
    
    if (status.custom.hasCustom) {
      console.log('✅ カスタムプロンプト設定済み:');
      console.log(`   文字数: ${status.custom.length}文字`);
      console.log(`   内容: ${status.custom.preview}...`);
    } else {
      console.log('⚪ カスタムプロンプト未設定');
      console.log(`   理由: ${status.custom.message}`);
    }
    
    console.log('🏢 デフォルトプロンプト:');
    console.log(`   業種: ${status.default.industry}`);
    console.log(`   文字数: ${status.default.length}文字`);
    console.log(`   内容: ${status.default.prompt.substring(0, 100)}...`);
    
    return status;
    
  } catch (error) {
    console.error('❌ カスタムプロンプト状況確認エラー:', error);
    return { error: error.message };
  }
}

/**
 * カスタムプロンプトを設定
 * @param {string} prompt カスタムプロンプト
 */
function setCustomPrompt(prompt) {
  console.log('📝 ===== カスタムプロンプト設定 =====');
  
  try {
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      throw new Error('有効なプロンプトを指定してください');
    }
    
    const config = ConfigManager.getConfig();
    const result = CustomPromptManager.setCustomPrompt(config.spreadsheetId, prompt);
    
    console.log(`✅ 設定結果: ${result.message}`);
    return result;
    
  } catch (error) {
    console.error('❌ カスタムプロンプト設定エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * カスタムプロンプトをクリア
 */
function clearCustomPrompt() {
  console.log('🗑️ ===== カスタムプロンプトクリア =====');
  
  try {
    const config = ConfigManager.getConfig();
    const result = CustomPromptManager.clearCustomPrompt(config.spreadsheetId);
    
    console.log(`✅ クリア結果: ${result.message}`);
    return result;
    
  } catch (error) {
    console.error('❌ カスタムプロンプトクリアエラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * カスタムプロンプトのテスト実行
 */
function testCustomPrompt() {
  console.log('🧪 ===== カスタムプロンプトテスト =====');
  
  try {
    // 現在の状況確認
    const status = checkCustomPromptStatus();
    
    // テスト用ドキュメント処理
    const testPrompt = DocumentProcessor.createSummaryPrompt(
      'test_document.pdf',
      'これはテスト用のドキュメントです。重要な情報が含まれています。'
    );
    
    const result = {
      success: true,
      customPromptStatus: status,
      testPrompt: {
        length: testPrompt.length,
        preview: testPrompt.substring(0, 300),
        usingCustom: status.custom.hasCustom
      },
      message: status.custom.hasCustom ? 
        'カスタムプロンプトが正常に適用されています' :
        'デフォルトプロンプトが使用されています'
    };
    
    console.log('✅ テスト完了:', result.message);
    return result;
    
  } catch (error) {
    console.error('❌ カスタムプロンプトテストエラー:', error);
    return { success: false, error: error.message };
  }
}
```

#### **3-2. フロントエンド UI拡張**
```html
<!-- ui/search.html 管理機能セクションに追加 -->
<div class="management-section">
  <h3>📝 カスタムプロンプト管理</h3>
  <div class="button-grid">
    <button onclick="checkCustomPromptStatus()" class="management-btn custom-prompt">
      📋 プロンプト状況確認
    </button>
    <button onclick="testCustomPrompt()" class="management-btn custom-test">
      🧪 カスタムプロンプトテスト
    </button>
    <button onclick="openCustomSheet()" class="management-btn custom-edit">
      ✏️ カスタムプロンプト編集
    </button>
    <button onclick="clearCustomPrompt()" class="management-btn custom-clear">
      🗑️ プロンプトリセット
    </button>
  </div>
</div>
```

```javascript
// ui/search.html JavaScript部分に追加
/**
 * カスタムプロンプト状況確認
 */
function checkCustomPromptStatus() {
  showStatus('📝 カスタムプロンプト状況を確認中...', 'info');
  
  google.script.run
    .withSuccessHandler(function(result) {
      if (result.error) {
        showStatus(`❌ エラー: ${result.error}`, 'error');
        return;
      }
      
      const usingType = result.currentlyUsing === 'custom' ? 'カスタム' : 'デフォルト';
      const statusHtml = `
        <div class="prompt-status">
          <h4>📊 プロンプト設定状況</h4>
          <div class="status-item">
            <strong>現在使用中:</strong> ${usingType}プロンプト
          </div>
          <div class="status-item">
            <strong>推奨事項:</strong> ${result.recommendation}
          </div>
          ${result.custom.hasCustom ? 
            `<div class="status-item">
               <strong>カスタム内容:</strong> ${result.custom.length}文字<br>
               <small>${result.custom.preview}...</small>
             </div>` : 
            `<div class="status-item">
               <strong>カスタム状況:</strong> ${result.custom.message}
             </div>`
          }
          <div class="status-item">
            <strong>デフォルト:</strong> ${result.default.industry} (${result.default.length}文字)
          </div>
        </div>
      `;
      
      showDetailedResults([{
        title: 'カスタムプロンプト状況',
        content: statusHtml
      }]);
      
      showStatus(`✅ プロンプト状況確認完了 - ${usingType}プロンプト使用中`, 'success');
    })
    .withFailureHandler(function(error) {
      showStatus(`❌ プロンプト状況確認エラー: ${error.message}`, 'error');
    })
    .checkCustomPromptStatus();
}

/**
 * カスタムプロンプトテスト
 */
function testCustomPrompt() {
  showStatus('🧪 カスタムプロンプトをテスト中...', 'info');
  
  google.script.run
    .withSuccessHandler(function(result) {
      if (!result.success) {
        showStatus(`❌ テストエラー: ${result.error}`, 'error');
        return;
      }
      
      const testHtml = `
        <div class="prompt-test-result">
          <h4>🧪 プロンプトテスト結果</h4>
          <div class="test-item">
            <strong>使用プロンプト:</strong> ${result.testPrompt.usingCustom ? 'カスタム' : 'デフォルト'}
          </div>
          <div class="test-item">
            <strong>プロンプト長:</strong> ${result.testPrompt.length}文字
          </div>
          <div class="test-item">
            <strong>生成内容（抜粋）:</strong><br>
            <pre>${result.testPrompt.preview}</pre>
          </div>
          <div class="test-item">
            <strong>判定:</strong> ${result.message}
          </div>
        </div>
      `;
      
      showDetailedResults([{
        title: 'カスタムプロンプトテスト',
        content: testHtml
      }]);
      
      showStatus(`✅ ${result.message}`, 'success');
    })
    .withFailureHandler(function(error) {
      showStatus(`❌ プロンプトテストエラー: ${error.message}`, 'error');
    })
    .testCustomPrompt();
}

/**
 * カスタムシートを開く
 */
function openCustomSheet() {
  showStatus('📝 カスタムプロンプト編集シートを開いています...', 'info');
  
  google.script.run
    .withSuccessHandler(function(result) {
      if (result.success) {
        window.open(result.url, '_blank');
        showStatus('✅ カスタムプロンプト編集シートを開きました', 'success');
      } else {
        showStatus(`❌ シートオープンエラー: ${result.error}`, 'error');
      }
    })
    .withFailureHandler(function(error) {
      showStatus(`❌ シートオープンエラー: ${error.message}`, 'error');
    })
    .getCustomSheetUrl(); // この関数も追加実装が必要
}

/**
 * カスタムプロンプトクリア
 */
function clearCustomPrompt() {
  if (!confirm('カスタムプロンプトをクリアしてデフォルトに戻しますか？')) {
    return;
  }
  
  showStatus('🗑️ カスタムプロンプトをクリア中...', 'info');
  
  google.script.run
    .withSuccessHandler(function(result) {
      if (result.success) {
        showStatus(`✅ ${result.message}`, 'success');
      } else {
        showStatus(`❌ クリアエラー: ${result.error}`, 'error');
      }
    })
    .withFailureHandler(function(error) {
      showStatus(`❌ クリアエラー: ${error.message}`, 'error');
    })
    .clearCustomPrompt();
}
```

## 📋 実装スケジュール

### **Phase 1: 基盤実装（2-3時間）**
- [ ] `shared/CustomPromptManager.gs` 新規作成
- [ ] 基本的なプロンプト取得・設定機能
- [ ] customシート自動作成機能

### **Phase 2: 統合実装（1-2時間）**
- [ ] `core/DocumentProcessor.gs` 改修
- [ ] `createSummaryPrompt` メソッドのカスタムプロンプト対応

### **Phase 3: 管理機能実装（2-3時間）**
- [ ] `main/Code.gs` 管理関数追加
- [ ] フロントエンド UI拡張
- [ ] テスト機能実装

### **Phase 4: テスト・検証（1時間）**
- [ ] 全機能の動作確認
- [ ] エラーハンドリング検証
- [ ] ドキュメント更新

## 🎯 期待効果

### **運用面**
- **柔軟性**: 業種や案件に応じたプロンプトカスタマイズ
- **効率性**: スプレッドシート上での簡単編集
- **継続性**: デフォルト設定の保持

### **技術面**
- **後方互換性**: 既存機能への影響なし
- **拡張性**: 将来的な複数プロンプト対応の基盤
- **保守性**: 設定の一元管理

### **ユーザー体験**
- **直感性**: スプレッドシート上での視覚的編集
- **安全性**: デフォルトへのフォールバック
- **透明性**: 使用中プロンプトの明確な表示

## 🚨 注意点・リスク

### **技術的リスク**
1. **シート権限**: customシートの作成・編集権限
2. **プロンプト長**: 長すぎるカスタムプロンプトの処理
3. **エラー処理**: カスタムシート取得失敗時の対応

### **運用リスク**
1. **プロンプト品質**: 不適切なカスタムプロンプトによる解析精度低下
2. **メンテナンス**: カスタムプロンプトの管理責任
3. **学習コスト**: ユーザーのプロンプト作成スキル

### **対策**
- **フォールバック機能**: エラー時のデフォルト使用
- **プレビュー機能**: 設定前の内容確認
- **テンプレート提供**: 良質なプロンプト例の提示

---

この計画により、柔軟で使いやすいカスタムプロンプト機能を安全に実装できます。