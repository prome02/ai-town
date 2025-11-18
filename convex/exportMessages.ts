/**
 * Convex 函式：導出所有對話訊息
 * 使用方式: 在 Convex Dashboard 中執行此 mutation
 */

import { query } from './_generated/server';
import { v } from 'convex/values';

/**
 * 獲取所有對話訊息，按時間排序
 */
export const getAllMessages = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 1000;
    const offset = args.offset || 0;

    // 獲取所有訊息，按創建時間排序
    const messages = await ctx.db
      .query('messages')
      .order('desc') // 最新到最舊
      .collect();

    // 分頁處理
    const paginatedMessages = messages.slice(offset, offset + limit);

    const result = [];
    for (const message of paginatedMessages) {
      // 獲取作者名稱
      let authorName = 'Unknown';
      if (message.worldId) {
        const playerDescription = await ctx.db
          .query('playerDescriptions')
          .withIndex('worldId', (q) =>
            q.eq('worldId', message.worldId!).eq('playerId', message.author)
          )
          .first();

        if (playerDescription) {
          authorName = playerDescription.name;
        }
      }

      result.push({
        id: message._id,
        creationTime: message._creationTime,
        timestamp: new Date(message._creationTime).toISOString(),
        worldId: message.worldId,
        conversationId: message.conversationId,
        author: message.author,
        authorName,
        messageUuid: message.messageUuid,
        text: message.text,
      });
    }

    return {
      messages: result,
      total: messages.length,
      offset,
      limit,
      hasMore: offset + limit < messages.length,
    };
  },
});

/**
 * 獲取訊息統計資訊
 */
export const getMessageStats = query({
  args: {},
  handler: async (ctx) => {
    const messages = await ctx.db.query('messages').collect();

    if (messages.length === 0) {
      return {
        totalMessages: 0,
        oldestMessage: null,
        newestMessage: null,
        conversationCount: 0,
      };
    }

    // 排序找出最舊和最新的訊息
    const sorted = messages.sort((a, b) => a._creationTime - b._creationTime);
    const oldest = sorted[0];
    const newest = sorted[sorted.length - 1];

    // 統計對話數量
    const conversations = new Set(messages.map(m => m.conversationId));

    return {
      totalMessages: messages.length,
      oldestMessage: {
        time: new Date(oldest._creationTime).toISOString(),
        conversationId: oldest.conversationId,
      },
      newestMessage: {
        time: new Date(newest._creationTime).toISOString(),
        conversationId: newest.conversationId,
      },
      conversationCount: conversations.size,
    };
  },
});

/**
 * 獲取記憶資料統計（向量資料）
 */
export const getMemoryStats = query({
  args: {},
  handler: async (ctx) => {
    const memories = await ctx.db.query('memories').collect();
    const embeddings = await ctx.db.query('memoryEmbeddings').collect();
    const embeddingsCache = await ctx.db.query('embeddingsCache').collect();

    return {
      memoriesCount: memories.length,
      embeddingsCount: embeddings.length,
      embeddingsCacheCount: embeddingsCache.length,
      totalVectorRecords: memories.length + embeddings.length + embeddingsCache.length,
    };
  },
});

