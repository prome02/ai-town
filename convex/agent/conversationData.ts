import { v } from 'convex/values';
import { internalQuery } from '../_generated/server';
import { playerId, conversationId } from '../aiTown/ids';
import { Id } from '../_generated/dataModel';

/**
 * 對話資料查詢模組
 * 提供對話所需的各種資料查詢功能
 */

export const queryPromptData = internalQuery({
  args: {
    worldId: v.id('worlds'),
    playerId,
    otherPlayerId: playerId,
    conversationId,
  },
  handler: async (ctx, args) => {
    const world = await ctx.db.get(args.worldId);
    if (!world) {
      throw new Error(`World ${args.worldId} not found`);
    }
    
    // 確保 world 是正確的類型
    const worldData = world as any;
    
    // 並行查詢玩家資料
    const [player, otherPlayer] = await Promise.all([
      worldData.players?.find((p: any) => p.id === args.playerId),
      worldData.players?.find((p: any) => p.id === args.otherPlayerId)
    ]);
    
    if (!player) throw new Error(`Player ${args.playerId} not found`);
    if (!otherPlayer) throw new Error(`Player ${args.otherPlayerId} not found`);
    
    // 並行查詢玩家描述
    const [playerDescription, otherPlayerDescription] = await Promise.all([
      ctx.db.query('playerDescriptions')
        .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('playerId', args.playerId))
        .first(),
      ctx.db.query('playerDescriptions')
        .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('playerId', args.otherPlayerId))
        .first()
    ]);
    
    if (!playerDescription) throw new Error(`Player description for ${args.playerId} not found`);
    if (!otherPlayerDescription) throw new Error(`Player description for ${args.otherPlayerId} not found`);
    
    const conversation = worldData.conversations?.find((c: any) => c.id === args.conversationId);
    if (!conversation) throw new Error(`Conversation ${args.conversationId} not found`);
    
    // 查詢代理資料
    const agent = worldData.agents?.find((a: any) => a.playerId === args.playerId);
    if (!agent) throw new Error(`Player ${args.playerId} not found`);
    
    const [agentDescription, otherAgent] = await Promise.all([
      ctx.db.query('agentDescriptions')
        .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('agentId', agent.id))
        .first(),
      worldData.agents?.find((a: any) => a.playerId === args.otherPlayerId)
    ]);
    
    if (!agentDescription) throw new Error(`Agent description for ${agent.id} not found`);
    
    let otherAgentDescription;
    if (otherAgent) {
      otherAgentDescription = await ctx.db
        .query('agentDescriptions')
        .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('agentId', otherAgent.id))
        .first();
      if (!otherAgentDescription) throw new Error(`Agent description for ${otherAgent.id} not found`);
    }
    
    // 查詢上次對話
    const lastTogether = await ctx.db
      .query('participatedTogether')
      .withIndex('edge', (q) => q
        .eq('worldId', args.worldId)
        .eq('player1', args.playerId)
        .eq('player2', args.otherPlayerId))
      .order('desc')
      .first();

    let lastConversation = null;
    if (lastTogether) {
      lastConversation = await ctx.db
        .query('archivedConversations')
        .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('id', lastTogether.conversationId))
        .first();
      if (!lastConversation) throw new Error(`Conversation ${lastTogether.conversationId} not found`);
    }
    
    return {
      player: { name: playerDescription.name, ...player },
      otherPlayer: { name: otherPlayerDescription.name, ...otherPlayer },
      conversation,
      agent: { identity: agentDescription.identity, plan: agentDescription.plan, ...agent },
      otherAgent: otherAgent && {
        identity: otherAgentDescription!.identity,
        plan: otherAgentDescription!.plan,
        ...otherAgent,
      },
      lastConversation,
    };
  },
});