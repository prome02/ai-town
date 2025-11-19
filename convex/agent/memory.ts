import { v } from 'convex/values';
import { ActionCtx, DatabaseReader, internalMutation, internalQuery } from '../_generated/server';
import { Doc, Id } from '../_generated/dataModel';
import { internal } from '../_generated/api';
import { LLMMessage, chatCompletion, fetchEmbedding } from '../util/llm';
import { asyncMap } from '../util/asyncMap';
import { GameId, agentId, conversationId, playerId } from '../aiTown/ids';
import { SerializedPlayer } from '../aiTown/player';
import { memoryFields } from './schema';

// How long to wait before updating a memory's last access time.
export const MEMORY_ACCESS_THROTTLE = 300_000; // In ms
// We fetch 10x the number of memories by relevance, to have more candidates
// for sorting by relevance + recency + importance.
const MEMORY_OVERFETCH = 10;
const selfInternal = internal.agent.memory;

export type Memory = Doc<'memories'>;
export type MemoryType = Memory['data']['type'];
export type MemoryOfType<T extends MemoryType> = Omit<Memory, 'data'> & {
  data: Extract<Memory['data'], { type: T }>;
};

// 統一的錯誤處理包裝器
async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorContext: string,
  fallbackValue: T
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`Error in ${errorContext}:`, error);
    return fallbackValue;
  }
}

export async function rememberConversation(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  agentId: GameId<'agents'>,
  playerId: GameId<'players'>,
  conversationId: GameId<'conversations'>,
) {
  return withErrorHandling(async () => {
    const data = await ctx.runQuery(selfInternal.loadConversation, {
      worldId,
      playerId,
      conversationId,
    });
    const { player, otherPlayer } = data;
    const messages = await ctx.runQuery(selfInternal.loadMessages, { worldId, conversationId });
    if (!messages.length) {
      return null;
    }

    const llmMessages: LLMMessage[] = [{
      role: 'user',
      content: `You are ${player.name}, and you just finished a conversation with ${otherPlayer.name}. I would
        like you to summarize the conversation from ${player.name}'s perspective, using first-person pronouns like
        "I," and add if you liked or disliked this interaction.`,
    }];

    const authors = new Set<GameId<'players'>>();
    for (const message of messages) {
      const author = message.author === player.id ? player : otherPlayer;
      authors.add(author.id as GameId<'players'>);
      const recipient = message.author === player.id ? otherPlayer : player;
      llmMessages.push({
        role: 'user',
        content: `${author.name} to ${recipient.name}: ${message.text}`,
      });
    }
    
    llmMessages.push({ role: 'user', content: 'Summary:' });
    const { content } = await chatCompletion({ messages: llmMessages, max_tokens: 500 });
    
    const description = `Conversation with ${otherPlayer.name} at ${new Date(
      data.conversation._creationTime,
    ).toLocaleString()}: ${content}`;
    
    const [importance, { embedding }] = await Promise.all([
      calculateImportance(description),
      fetchEmbedding(description)
    ]);
    
    authors.delete(player.id as GameId<'players'>);
    
    await ctx.runMutation(selfInternal.insertMemory, {
      agentId,
      playerId: player.id,
      description,
      importance,
      lastAccess: messages[messages.length - 1]._creationTime,
      data: {
        type: 'conversation',
        conversationId,
        playerIds: [...authors],
      },
      embedding,
    });
    
    await reflectOnMemories(ctx, worldId, playerId);
    return description;
  }, `remembering conversation ${conversationId} for agent ${agentId}`, null);
}

// 提取共用的驗證邏輯
async function validatePlayerAndWorld(
  ctx: any,
  worldId: Id<'worlds'>,
  playerId: string
) {
  const world = await ctx.db.get(worldId);
  if (!world) throw new Error(`World ${worldId} not found`);
  
  const player = world.players.find((p: any) => p.id === playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);
  
  const playerDescription = await ctx.db
    .query('playerDescriptions')
    .withIndex('worldId', (q: any) => q.eq('worldId', worldId).eq('playerId', playerId))
    .first();
  if (!playerDescription) throw new Error(`Player description for ${playerId} not found`);
  
  return { world, player, playerDescription };
}

export const loadConversation = internalQuery({
  args: {
    worldId: v.id('worlds'),
    playerId,
    conversationId,
  },
  handler: async (ctx, args) => {
    const { world, player, playerDescription } = await validatePlayerAndWorld(ctx, args.worldId, args.playerId);
    
    const [conversation, otherParticipator] = await Promise.all([
      ctx.db.query('archivedConversations')
        .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('id', args.conversationId))
        .first(),
      ctx.db.query('participatedTogether')
        .withIndex('conversation', (q) => q
          .eq('worldId', args.worldId)
          .eq('player1', args.playerId)
          .eq('conversationId', args.conversationId))
        .first()
    ]);

    if (!conversation) throw new Error(`Conversation ${args.conversationId} not found`);
    if (!otherParticipator) throw new Error(
      `Couldn't find other participant in conversation ${args.conversationId} with player ${args.playerId}`
    );

    const otherPlayerId = otherParticipator.player2;
    const otherPlayer = world.players.find((p: any) => p.id === otherPlayerId) ??
      await ctx.db.query('archivedPlayers')
        .withIndex('worldId', (q: any) => q.eq('worldId', world._id).eq('id', otherPlayerId))
        .first();
    
    if (!otherPlayer) throw new Error(`Conversation ${args.conversationId} other player not found`);
    
    const otherPlayerDescription = await ctx.db
      .query('playerDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('playerId', otherPlayerId))
      .first();
    if (!otherPlayerDescription) throw new Error(`Player description for ${otherPlayerId} not found`);

    return {
      player: { ...player, name: playerDescription.name },
      conversation,
      otherPlayer: { ...otherPlayer, name: otherPlayerDescription.name },
    };
  },
});

export async function searchMemories(
  ctx: ActionCtx,
  playerId: GameId<'players'>,
  searchEmbedding: number[],
  n: number = 3,
) {
  return withErrorHandling(async () => {
    const candidates = await ctx.vectorSearch('memoryEmbeddings', 'embedding', {
      vector: searchEmbedding,
      filter: (q) => q.eq('playerId', playerId),
      limit: n * MEMORY_OVERFETCH,
    });
    const rankedMemories = await ctx.runMutation(selfInternal.rankAndTouchMemories, {
      candidates,
      n,
    });
    return rankedMemories.map(({ memory }: any) => memory);
  }, `searching memories for player ${playerId}`, []);
}

function makeRange(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return [min, max] as const;
}

function normalize(value: number, range: readonly [number, number]) {
  const [min, max] = range;
  return (value - min) / (max - min);
}

export const rankAndTouchMemories = internalMutation({
  args: {
    candidates: v.array(v.object({ _id: v.id('memoryEmbeddings'), _score: v.number() })),
    n: v.number(),
  },
  handler: async (ctx, args) => {
    const ts = Date.now();
    
    // 並行處理記憶體查詢
    const relatedMemories = await asyncMap(args.candidates, async ({ _id }) => {
      const memory = await ctx.db
        .query('memories')
        .withIndex('embeddingId', (q) => q.eq('embeddingId', _id))
        .first();
      if (!memory) throw new Error(`Memory for embedding ${_id} not found`);
      return memory;
    });

    // 計算分數
    const recencyScore = relatedMemories.map((memory) => {
      const hoursSinceAccess = (ts - memory.lastAccess) / 1000 / 60 / 60;
      return 0.99 ** Math.floor(hoursSinceAccess);
    });
    
    const [relevanceRange, importanceRange, recencyRange] = [
      makeRange(args.candidates.map((c) => c._score)),
      makeRange(relatedMemories.map((m) => m.importance)),
      makeRange(recencyScore)
    ];

    const memoryScores = relatedMemories.map((memory, idx) => ({
      memory,
      overallScore:
        normalize(args.candidates[idx]._score, relevanceRange) +
        normalize(memory.importance, importanceRange) +
        normalize(recencyScore[idx], recencyRange),
    }));
    
    memoryScores.sort((a, b) => b.overallScore - a.overallScore);
    const accessed = memoryScores.slice(0, args.n);
    
    // 批量更新訪問時間
    await asyncMap(accessed, async ({ memory }) => {
      if (memory.lastAccess < ts - MEMORY_ACCESS_THROTTLE) {
        await ctx.db.patch(memory._id, { lastAccess: ts });
      }
    });
    
    return accessed;
  },
});

export const loadMessages = internalQuery({
  args: {
    worldId: v.id('worlds'),
    conversationId,
  },
  handler: async (ctx, args): Promise<Doc<'messages'>[]> => {
    const messages = await ctx.db
      .query('messages')
      .withIndex('conversationId', (q) =>
        q.eq('worldId', args.worldId).eq('conversationId', args.conversationId),
      )
      .collect();
    return messages;
  },
});

async function calculateImportance(description: string) {
  return withErrorHandling(async () => {
    const { content: importanceRaw } = await chatCompletion({
      messages: [{
        role: 'user',
        content: `On the scale of 0 to 9, where 0 is purely mundane (e.g., brushing teeth, making bed) and 9 is extremely poignant (e.g., a break up, college acceptance), rate the likely poignancy of the following piece of memory.
      Memory: ${description}
      Answer on a scale of 0 to 9. Respond with number only, e.g. "5"`,
      }],
      temperature: 0.0,
      max_tokens: 1,
    });

    let importance = parseFloat(importanceRaw);
    if (isNaN(importance)) {
      importance = +(importanceRaw.match(/\d+/)?.[0] ?? NaN);
    }
    if (isNaN(importance)) {
      console.debug('Could not parse memory importance from: ', importanceRaw);
      importance = 5;
    }
    return importance;
  }, `calculating importance for memory: ${description}`, 5);
}

const { embeddingId: _embeddingId, ...memoryFieldsWithoutEmbeddingId } = memoryFields;

export const insertMemory = internalMutation({
  args: {
    agentId,
    embedding: v.array(v.float64()),
    ...memoryFieldsWithoutEmbeddingId,
  },
  handler: async (ctx, { agentId: _, embedding, ...memory }): Promise<void> => {
    const embeddingId = await ctx.db.insert('memoryEmbeddings', {
      playerId: memory.playerId,
      embedding,
    });
    await ctx.db.insert('memories', {
      ...memory,
      embeddingId,
    });
  },
});

export const insertReflectionMemories = internalMutation({
  args: {
    worldId: v.id('worlds'),
    playerId,
    reflections: v.array(
      v.object({
        description: v.string(),
        relatedMemoryIds: v.array(v.id('memories')),
        importance: v.number(),
        embedding: v.array(v.float64()),
      }),
    ),
  },
  handler: async (ctx, { playerId, reflections }) => {
    const lastAccess = Date.now();
    
    // 批量處理反射記憶體插入
    const insertPromises = reflections.map(async ({ embedding, relatedMemoryIds, ...rest }) => {
      const embeddingId = await ctx.db.insert('memoryEmbeddings', {
        playerId,
        embedding,
      });
      return ctx.db.insert('memories', {
        playerId,
        embeddingId,
        lastAccess,
        ...rest,
        data: {
          type: 'reflection',
          relatedMemoryIds,
        },
      });
    });
    
    await Promise.all(insertPromises);
  },
});

async function reflectOnMemories(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  playerId: GameId<'players'>,
) {
  return withErrorHandling(async () => {
    const { memories, lastReflectionTs, name } = await ctx.runQuery(
      internal.agent.memory.getReflectionMemories,
      { worldId, playerId, numberOfItems: 100 }
    );

    // 計算重要性分數總和，只考慮新的記憶
    const sumOfImportanceScore = memories
      .filter((m: any) => m._creationTime > (lastReflectionTs ?? 0))
      .reduce((acc: number, curr: any) => acc + curr.importance, 0);
    
    if (sumOfImportanceScore <= 500) {
      return false;
    }

    console.debug('sum of importance score = ', sumOfImportanceScore);
    console.debug('Reflecting...');
    
    const prompt = [
      '[no prose]',
      '[Output only JSON]',
      `You are ${name}, statements about you:`,
      ...memories.map((m: any, idx: number) => `Statement ${idx}: ${m.description}`),
      'What 3 high-level insights can you infer from the above statements?',
      'Return in JSON format, where the key is a list of input statements that contributed to your insights and value is your insight. Make the response parseable by Typescript JSON.parse() function. DO NOT escape characters or include "\n" or white space in response.',
      'Example: [{insight: "...", statementIds: [1,2]}, {insight: "...", statementIds: [1]}, ...]'
    ];

    const { content: reflection } = await chatCompletion({
      messages: [{ role: 'user', content: prompt.join('\n') }],
    });

    try {
      const insights = JSON.parse(reflection) as { insight: string; statementIds: number[] }[];
      
      // 並行處理每個洞察的重要性計算和嵌入生成
      const memoriesToSave = await asyncMap(insights, async (item) => {
        const relatedMemoryIds = item.statementIds.map((idx: number) => memories[idx]._id);
        const [importance, { embedding }] = await Promise.all([
          calculateImportance(item.insight),
          fetchEmbedding(item.insight)
        ]);
        
        console.debug('adding reflection memory...', item.insight);
        return { description: item.insight, embedding, importance, relatedMemoryIds };
      });

      await ctx.runMutation(selfInternal.insertReflectionMemories, {
        worldId,
        playerId,
        reflections: memoriesToSave,
      });
      
      return true;
    } catch (e) {
      console.error('error saving or parsing reflection', e);
      console.debug('reflection', reflection);
      return false;
    }
  }, `reflecting on memories for player ${playerId}`, false);
}
export const getReflectionMemories = internalQuery({
  args: { worldId: v.id('worlds'), playerId, numberOfItems: v.number() },
  handler: async (ctx, args) => {
    const { world, player, playerDescription } = await validatePlayerAndWorld(ctx, args.worldId, args.playerId);
    
    const [memories, lastReflection] = await Promise.all([
      ctx.db.query('memories')
        .withIndex('playerId', (q) => q.eq('playerId', player.id))
        .order('desc')
        .take(args.numberOfItems),
      ctx.db.query('memories')
        .withIndex('playerId_type', (q) => q.eq('playerId', args.playerId).eq('data.type', 'reflection'))
        .order('desc')
        .first()
    ]);

    return {
      name: playerDescription.name,
      memories,
      lastReflectionTs: lastReflection?._creationTime,
    };
  },
});

export async function latestMemoryOfType<T extends MemoryType>(
  db: DatabaseReader,
  playerId: GameId<'players'>,
  type: T,
) {
  return withErrorHandling(async () => {
    const entry = await db
      .query('memories')
      .withIndex('playerId_type', (q) => q.eq('playerId', playerId).eq('data.type', type))
      .order('desc')
      .first();
    return entry ? entry as MemoryOfType<T> : null;
  }, `getting latest memory of type ${type} for player ${playerId}`, null);
}
