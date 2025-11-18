/**
 * Convex 函式：清理舊資料
 *
 * 警告：這些操作會永久刪除資料，請先備份！
 */

import { mutation, internalMutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * 刪除指定日期之前的訊息
 */
export const deleteMessagesBefore = mutation({
  args: {
    beforeTimestamp: v.number(), // Unix timestamp (毫秒)
    dryRun: v.optional(v.boolean()), // 預覽模式，不實際刪除
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true; // 預設為預覽模式

    // 獲取符合條件的訊息
    const allMessages = await ctx.db.query('messages').collect();
    const oldMessages = allMessages.filter(m => m._creationTime < args.beforeTimestamp);

    console.log(`找到 ${oldMessages.length} 則舊訊息（在 ${new Date(args.beforeTimestamp).toISOString()} 之前）`);

    if (dryRun) {
      console.log('=== 預覽模式 ===');
      console.log('設定 dryRun: false 以實際執行刪除');
      return {
        dryRun: true,
        wouldDelete: oldMessages.length,
        oldestMessage: oldMessages.length > 0
          ? new Date(Math.min(...oldMessages.map(m => m._creationTime))).toISOString()
          : null,
        newestMessage: oldMessages.length > 0
          ? new Date(Math.max(...oldMessages.map(m => m._creationTime))).toISOString()
          : null,
      };
    }

    // 實際刪除
    let deleted = 0;
    for (const message of oldMessages) {
      await ctx.db.delete(message._id);
      deleted++;

      // 每 100 筆顯示進度
      if (deleted % 100 === 0) {
        console.log(`已刪除 ${deleted}/${oldMessages.length} 則訊息...`);
      }
    }

    console.log(`完成！已刪除 ${deleted} 則訊息`);

    return {
      dryRun: false,
      deleted,
    };
  },
});

/**
 * 刪除指定世界的所有資料
 */
export const deleteWorldData = mutation({
  args: {
    worldId: v.id('worlds'),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;

    const stats = {
      messages: 0,
      memories: 0,
      embeddings: 0,
      archivedPlayers: 0,
      archivedConversations: 0,
      archivedAgents: 0,
    };

    // 統計各類資料
    const messages = await ctx.db
      .query('messages')
      .filter(q => q.eq(q.field('worldId'), args.worldId))
      .collect();
    stats.messages = messages.length;

    const archivedPlayers = await ctx.db
      .query('archivedPlayers')
      .withIndex('worldId', q => q.eq('worldId', args.worldId))
      .collect();
    stats.archivedPlayers = archivedPlayers.length;

    const archivedConversations = await ctx.db
      .query('archivedConversations')
      .withIndex('worldId', q => q.eq('worldId', args.worldId))
      .collect();
    stats.archivedConversations = archivedConversations.length;

    const archivedAgents = await ctx.db
      .query('archivedAgents')
      .withIndex('worldId', q => q.eq('worldId', args.worldId))
      .collect();
    stats.archivedAgents = archivedAgents.length;

    console.log(`世界 ${args.worldId} 的資料統計:`, stats);

    if (dryRun) {
      return { dryRun: true, stats };
    }

    // 實際刪除
    for (const msg of messages) await ctx.db.delete(msg._id);
    for (const p of archivedPlayers) await ctx.db.delete(p._id);
    for (const c of archivedConversations) await ctx.db.delete(c._id);
    for (const a of archivedAgents) await ctx.db.delete(a._id);

    console.log(`已刪除世界 ${args.worldId} 的所有資料`);

    return { dryRun: false, deleted: stats };
  },
});

/**
 * 清理嵌入快取
 */
export const cleanEmbeddingsCache = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;

    const cache = await ctx.db.query('embeddingsCache').collect();
    console.log(`找到 ${cache.length} 個嵌入快取項目`);

    if (dryRun) {
      return {
        dryRun: true,
        cacheItems: cache.length,
      };
    }

    for (const item of cache) {
      await ctx.db.delete(item._id);
    }

    console.log(`已清理 ${cache.length} 個嵌入快取`);

    return {
      dryRun: false,
      deleted: cache.length,
    };
  },
});

/**
 * 保留最近 N 天的資料，刪除其他所有資料
 */
export const keepRecentData = mutation({
  args: {
    keepDays: v.number(), // 保留最近幾天的資料
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;
    const cutoffTime = Date.now() - (args.keepDays * 24 * 60 * 60 * 1000);

    console.log(`將刪除 ${new Date(cutoffTime).toISOString()} 之前的所有資料`);
    console.log(`（保留最近 ${args.keepDays} 天）`);

    const allMessages = await ctx.db.query('messages').collect();
    const oldMessages = allMessages.filter(m => m._creationTime < cutoffTime);

    const allMemories = await ctx.db.query('memories').collect();
    const oldMemories = allMemories.filter(m => m.lastAccess < cutoffTime);

    console.log(`將刪除 ${oldMessages.length} 則訊息`);
    console.log(`將刪除 ${oldMemories.length} 個記憶`);

    if (dryRun) {
      return {
        dryRun: true,
        messagesToDelete: oldMessages.length,
        memoriesToDelete: oldMemories.length,
        cutoffDate: new Date(cutoffTime).toISOString(),
      };
    }

    // 刪除舊訊息
    for (const msg of oldMessages) {
      await ctx.db.delete(msg._id);
    }

    // 刪除舊記憶
    for (const mem of oldMemories) {
      await ctx.db.delete(mem._id);
      // 同時刪除對應的嵌入
      await ctx.db.delete(mem.embeddingId);
    }

    console.log('清理完成！');

    return {
      dryRun: false,
      messagesDeleted: oldMessages.length,
      memoriesDeleted: oldMemories.length,
    };
  },
});
