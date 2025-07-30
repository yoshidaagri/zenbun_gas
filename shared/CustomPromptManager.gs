// ===== カスタムプロンプト管理モジュール =====

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
    } finally {
      console.log('📝 ===== カスタムプロンプト取得完了 =====');
    }
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
    } finally {
      console.log('📝 ===== カスタムプロンプト設定完了 =====');
    }
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
    } finally {
      console.log('🗑️ ===== カスタムプロンプトクリア完了 =====');
    }
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

  /**
   * カスタムシートのURLを取得
   * @param {string} spreadsheetId スプレッドシートID
   * @returns {Object} URL情報
   */
  static getCustomSheetUrl(spreadsheetId) {
    console.log('🔗 ===== カスタムシートURL取得開始 =====');
    
    try {
      if (!spreadsheetId) {
        throw new Error('スプレッドシートIDが未設定です');
      }
      
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      
      // customシート取得または作成
      let customSheet;
      try {
        customSheet = spreadsheet.getSheetByName('custom');
      } catch (error) {
        console.log('📋 customシートが存在しないため作成します');
        customSheet = this.createCustomSheet(spreadsheet);
      }
      
      // シート特定のURLを生成
      const sheetId = customSheet.getSheetId();
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`;
      
      console.log(`✅ カスタムシートURL生成成功: ${sheetUrl}`);
      
      return {
        success: true,
        url: sheetUrl,
        message: 'カスタムプロンプト編集シートのURLを生成しました',
        sheetName: 'custom'
      };
      
    } catch (error) {
      console.error('❌ カスタムシートURL取得エラー:', error);
      return {
        success: false,
        error: error.message,
        message: `URL取得エラー: ${error.message}`
      };
    } finally {
      console.log('🔗 ===== カスタムシートURL取得完了 =====');
    }
  }

  /**
   * カスタムプロンプトの有効性を検証
   * @param {string} prompt プロンプト文字列
   * @returns {Object} 検証結果
   */
  static validateCustomPrompt(prompt) {
    const validation = {
      isValid: false,
      warnings: [],
      recommendations: [],
      score: 0
    };
    
    if (!prompt || typeof prompt !== 'string') {
      validation.warnings.push('プロンプトが文字列ではありません');
      return validation;
    }
    
    const trimmedPrompt = prompt.trim();
    const length = trimmedPrompt.length;
    
    // 長さチェック
    if (length < 10) {
      validation.warnings.push('プロンプトが短すぎます（10文字未満）');
    } else if (length > 2000) {
      validation.warnings.push('プロンプトが長すぎます（2000文字超過）- API制限に注意');
    } else {
      validation.score += 25;
    }
    
    // 基本的な構造チェック
    if (trimmedPrompt.includes('あなたは') || trimmedPrompt.includes('You are')) {
      validation.score += 25;
    } else {
      validation.recommendations.push('AIの役割を明確にする（例：「あなたは○○専門のAIです」）');
    }
    
    // 指示の明確性チェック
    if (trimmedPrompt.includes('要約') || trimmedPrompt.includes('まとめ') || 
        trimmedPrompt.includes('抽出') || trimmedPrompt.includes('解析')) {
      validation.score += 25;
    } else {
      validation.recommendations.push('具体的な作業指示を含める（例：「要約してください」「抽出してください」）');
    }
    
    // 出力形式の指定チェック
    if (trimmedPrompt.includes('文字以内') || trimmedPrompt.includes('箇条書き') || 
        trimmedPrompt.includes('形式') || trimmedPrompt.includes('項目')) {
      validation.score += 25;
    } else {
      validation.recommendations.push('出力形式を指定する（例：「400文字以内で」「箇条書きで」）');
    }
    
    // 総合判定
    validation.isValid = validation.score >= 50 && validation.warnings.length === 0;
    
    return validation;
  }
}

// 後方互換性のための関数エクスポート
function getCustomPrompt() {
  const config = ConfigManager.getConfig();
  return CustomPromptManager.getCustomPrompt(config.spreadsheetId);
}

function setCustomPrompt(prompt) {
  const config = ConfigManager.getConfig();
  return CustomPromptManager.setCustomPrompt(config.spreadsheetId, prompt);
}

function clearCustomPrompt() {
  const config = ConfigManager.getConfig();
  return CustomPromptManager.clearCustomPrompt(config.spreadsheetId);
}

function getCustomPromptStatus() {
  const config = ConfigManager.getConfig();
  return CustomPromptManager.getCustomPromptStatus(config.spreadsheetId);
}

function getCustomSheetUrl() {
  const config = ConfigManager.getConfig();
  return CustomPromptManager.getCustomSheetUrl(config.spreadsheetId);
}