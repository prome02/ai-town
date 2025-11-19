/**
 * 對話錯誤處理模組
 * 提供統一的錯誤處理和回退機制
 */

/**
 * 處理資料查詢錯誤
 */
export function handleQueryError(error: any, context: string, conversationId: string): string {
  console.error(`Failed to query prompt data for conversation ${conversationId}:`, error);
  
  // 根據錯誤類型記錄更具體的訊息
  if (error.message && error.message.includes('not found')) {
    console.error('查詢資料不存在:', error.message);
  } else {
    console.error('資料庫查詢錯誤:', error);
  }
  
  // 提供更多样化和合理的默認回覆
  const continueResponses = [
    `That's interesting, tell me more.`,
    `I understand what you mean.`,
    `That makes sense to me.`,
    `I see your point.`,
    `That's a good perspective.`,
    `I hadn't thought of it that way.`,
    `That's thoughtful of you to say.`,
    `I appreciate you sharing that.`,
    `That's quite insightful.`,
    `I can relate to that.`
  ];
  
  const startResponses = [
    `Hello! How are you doing?`,
    `Hi there! Nice to meet you.`,
    `Hey! How's your day going?`,
    `Hello! What brings you here?`,
    `Hi! I was just thinking about you.`
  ];
  
  const leaveResponses = [
    `I need to go now, talk to you later!`,
    `It was nice chatting with you!`,
    `I should get going, see you around!`,
    `Thanks for the conversation!`,
    `I'll catch you later!`
  ];
  
  if (context === 'start') {
    return startResponses[Math.floor(Math.random() * startResponses.length)];
  } else if (context === 'continue') {
    return continueResponses[Math.floor(Math.random() * continueResponses.length)];
  } else {
    return leaveResponses[Math.floor(Math.random() * leaveResponses.length)];
  }
}

/**
 * 處理LLM API錯誤
 */
export function handleLLMError(error: any, playerId: string): string {
  console.error(`Error in conversation for player ${playerId}:`, error);
  
  // 根據錯誤類型提供更具體的錯誤訊息
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    console.error('LLM API 網路連線失敗:', error.message);
  } else if (error.status === 429) {
    console.error('LLM API 限速錯誤:', error.message);
  } else if (error.status >= 500) {
    console.error('LLM 服務端錯誤:', error.status, error.message);
  } else if (error.message && error.message.includes('timed out')) {
    console.error('LLM 調用逾時:', error.message);
  } else {
    console.error('LLM 調用錯誤:', error);
  }
  
  // 測試期間直接顯示錯誤訊息，便於調試
  return `[LLM Error: ${error.message || 'Unknown error'}]`;
}

/**
 * 統一的錯誤處理包裝器
 */
export async function withConversationErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
  playerId: string,
  conversationId: string,
  fallbackValue: T
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (context === 'query') {
      return handleQueryError(error, 'start', conversationId) as unknown as T;
    } else if (context === 'llm') {
      return handleLLMError(error, playerId) as unknown as T;
    }
    return fallbackValue;
  }
}