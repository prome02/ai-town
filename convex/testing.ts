import { v } from 'convex/values';
import { mutation, query, action, internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import { LLM_CONFIG, chatCompletion } from './util/llm';

/**
 * ============================================
 * 簡化版 LLM 測試系統
 * ============================================
 *
 * 目標:
 * 1. 測試 Ollama API 連接
 * 2. 測試 LLM 對話生成
 * 3. 清晰的錯誤訊息
 *
 * 架構:
 * - Query: 查詢 API 狀態和訊息
 * - Action: 呼叫 LLM 並儲存訊息 (完整流程)
 * - Mutation: 單純的資料庫操作
 */

// ==================== 查詢 ====================

/**
 * 測試 LLM API 連接狀態
 */
export const testLLMAPI = query({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    try {
      // 獲取測試訊息數量
      const messages = await ctx.db.query('messages')
        .withIndex('conversationId', q =>
          q.eq('worldId', args.worldId).eq('conversationId', 'llm-test')
        )
        .collect();

      // 返回 LLM 配置資訊
      const provider = LLM_CONFIG.ollama ? 'Ollama' :
                      LLM_CONFIG.url.includes('openai') ? 'OpenAI' :
                      LLM_CONFIG.url.includes('together') ? 'Together.ai' :
                      'Unknown';

      return {
        success: true,
        message: "LLM 配置已載入",
        messageCount: messages.length,
        provider: provider,
        chatModel: LLM_CONFIG.chatModel,
        embeddingModel: LLM_CONFIG.embeddingModel,
        apiUrl: LLM_CONFIG.url,
        isOllama: LLM_CONFIG.ollama
      };

    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        suggestion: "請檢查數據庫連接",
        messageCount: 0,
        provider: "Unknown",
        chatModel: "Unknown",
        embeddingModel: "Unknown"
      };
    }
  },
});

/**
 * 獲取測試訊息列表
 */
export const listTestMessages = query({
  args: {
    worldId: v.id('worlds'),
    conversationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conversationId = args.conversationId || 'llm-test';

    const messages = await ctx.db
      .query('messages')
      .withIndex('conversationId', (q) =>
        q.eq('worldId', args.worldId).eq('conversationId', conversationId)
      )
      .order('desc')
      .take(50);

    return messages.map(message => ({
      _id: message._id,
      _creationTime: message._creationTime,
      author: message.author,
      text: message.text,
      conversationId: message.conversationId,
    }));
  },
});

// ==================== Mutations (資料庫操作) ====================

/**
 * 清除測試訊息
 */
export const clearTestMessages = mutation({
  args: {
    worldId: v.id('worlds'),
    conversationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conversationId = args.conversationId || 'llm-test';

    try {
      const messages = await ctx.db.query('messages')
        .withIndex('conversationId', q =>
          q.eq('worldId', args.worldId).eq('conversationId', conversationId)
        )
        .collect();

      for (const message of messages) {
        await ctx.db.delete(message._id);
      }

      console.log(`🗑️ 已清除 ${messages.length} 條訊息`);

      return {
        success: true,
        clearedCount: messages.length,
      };

    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
});

// ==================== Actions (LLM 呼叫 + 資料庫操作) ====================

/**
 * 完整的 LLM 測試
 * Action 可以呼叫外部 API 並直接操作資料庫
 */
export const runLLMTest = action({
  args: {
    worldId: v.id('worlds'),
    testPrompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log('🚀 開始 LLM 測試');

    const prompt = args.testPrompt || "你好！請簡單介紹一下你自己。";

    try {
      // 步驟 1: 儲存用戶訊息
      const userMessageUuid = crypto.randomUUID();
      await ctx.runMutation(internal.testing.saveMessage, {
        worldId: args.worldId,
        conversationId: 'llm-test',
        author: 'test-user',
        text: prompt,
        messageUuid: userMessageUuid,
      });

      console.log('📝 用戶訊息已儲存');

      // 步驟 2: 呼叫 LLM 生成回應
      console.log('🤖 呼叫 LLM...');
      console.log('📝 Prompt:', prompt);

      const systemPrompt = '你是一個友善的 AI 助手，請用繁體中文簡短回應(50-100字)。';

      const { content, ms } = await chatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      console.log('✅ LLM 回應成功 (耗時:', ms, 'ms)');
      console.log('📨 回應內容:', content);

      // 步驟 3: 儲存 LLM 回應
      const assistantMessageUuid = crypto.randomUUID();
      await ctx.runMutation(internal.testing.saveMessage, {
        worldId: args.worldId,
        conversationId: 'llm-test',
        author: 'llm-assistant',
        text: content.trim(),
        messageUuid: assistantMessageUuid,
      });

      console.log('💾 LLM 回應已儲存');

      return {
        success: true,
        message: "LLM 測試成功",
        prompt,
        response: content.trim(),
        ms,
      };

    } catch (error) {
      console.error('❌ LLM 測試失敗:', error);

      const errorMessage = (error as Error).message;
      let suggestion = "請檢查 Ollama 服務是否啟動";

      if (errorMessage.includes('fetch') || errorMessage.includes('ECONNREFUSED')) {
        suggestion = "無法連接到 Ollama API，請確認 Ollama 是否在 http://127.0.0.1:11434 執行";
      } else if (errorMessage.includes('model')) {
        suggestion = `模型 ${LLM_CONFIG.chatModel} 可能未安裝，請執行: ollama pull ${LLM_CONFIG.chatModel}`;
      }

      return {
        success: false,
        error: errorMessage,
        suggestion,
      };
    }
  },
});

/**
 * 快速 API 連接測試 (不儲存訊息)
 */
export const quickAPITest = action({
  args: {},
  handler: async () => {
    console.log('🔌 快速 API 測試');

    try {
      const { content, ms } = await chatCompletion({
        messages: [
          { role: 'user', content: '請說 "測試成功"' }
        ],
        max_tokens: 10,
        temperature: 0.1,
      });

      console.log('✅ API 連接正常');

      return {
        success: true,
        response: content.trim(),
        ms,
        config: {
          provider: LLM_CONFIG.ollama ? 'Ollama' : 'Cloud',
          chatModel: LLM_CONFIG.chatModel,
          apiUrl: LLM_CONFIG.url,
        }
      };

    } catch (error) {
      console.error('❌ API 測試失敗:', error);

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
});

// ==================== 世界控制函數 (FreezeButton 使用) ====================

/**
 * 檢查是否允許停止世界
 * 用於 FreezeButton 組件
 */
export const stopAllowed = query({
  handler: async () => {
    // 簡單返回 true，允許開發者控制世界
    return true;
  },
});

/**
 * 停止世界 (Freeze)
 * 用於 FreezeButton 組件
 * 注意: 實際的停止邏輯應在 world.ts 中實作
 */
export const stop = mutation({
  handler: async () => {
    console.log('🛑 世界凍結請求 (需要在 world.ts 中實作實際邏輯)');
    return { success: true };
  },
});

/**
 * 恢復世界 (Unfreeze)
 * 用於 FreezeButton 組件
 * 注意: 實際的恢復邏輯應在 world.ts 中實作
 */
export const resume = mutation({
  handler: async () => {
    console.log('▶️ 世界恢復請求 (需要在 world.ts 中實作實際邏輯)');
    return { success: true };
  },
});

// ==================== Internal Mutations ====================

/**
 * 內部使用: 儲存訊息
 */
export const saveMessage = internalMutation({
  args: {
    worldId: v.id('worlds'),
    conversationId: v.string(),
    author: v.string(),
    text: v.string(),
    messageUuid: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('messages', {
      conversationId: args.conversationId,
      author: args.author,
      text: args.text,
      messageUuid: args.messageUuid,
      worldId: args.worldId,
    });

    return { success: true };
  },
});
