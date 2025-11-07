import { v } from 'convex/values';
import { Id } from '../_generated/dataModel';
import { ActionCtx, internalQuery } from '../_generated/server';
import { LLMMessage, chatCompletion } from '../util/llm';
import * as memory from './memory';
import { api, internal } from '../_generated/api';
import * as embeddingsCache from './embeddingsCache';
import { GameId, conversationId, playerId } from '../aiTown/ids';
import { NUM_MEMORIES_TO_SEARCH } from '../constants';
import {
  trimContentPrefx,
  stopWords,
  agentPrompts,
  previousConversationPrompt,
  relatedMemoriesPrompt,
  previousMessages
} from './conversationUtils';
import { withConversationErrorHandling } from './conversationErrorHandler';

const selfInternal = internal.agent.conversation;

/**
 * 開始對話消息
 */
export async function startConversationMessage(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  conversationId: GameId<'conversations'>,
  playerId: GameId<'players'>,
  otherPlayerId: GameId<'players'>,
): Promise<string> {
  return withConversationErrorHandling(async () => {
    const playerData = await ctx.runQuery(selfInternal.queryPromptData, {
      worldId,
      playerId,
      otherPlayerId,
      conversationId,
    });

    const { player, otherPlayer, agent, otherAgent, lastConversation } = playerData;
    
    const embedding = await embeddingsCache.fetch(
      ctx,
      `${player.name} is talking to ${otherPlayer.name}`,
    );

    const memories = await memory.searchMemories(
      ctx,
      player.id as GameId<'players'>,
      embedding,
      Number(process.env.NUM_MEMORIES_TO_SEARCH) || NUM_MEMORIES_TO_SEARCH,
    );

    const memoryWithOtherPlayer = memories.find(
      (m: any) => m.data.type === 'conversation' && m.data.playerIds.includes(otherPlayerId),
    );
    
    const prompt = [
      `You are ${player.name}, and you just started a conversation with ${otherPlayer.name}.`,
      ...agentPrompts(otherPlayer, agent, otherAgent ?? null),
      ...previousConversationPrompt(otherPlayer, lastConversation),
      ...relatedMemoriesPrompt(memories),
    ];
    
    if (memoryWithOtherPlayer) {
      prompt.push(`Be sure to include some detail or question about a previous conversation in your greeting.`);
    }
    
    const lastPrompt = `${player.name} to ${otherPlayer.name}:`;
    prompt.push(lastPrompt);

    const { content } = await chatCompletion({
      messages: [{
        role: 'system',
        content: prompt.join('\n'),
      }],
      max_tokens: 300,
      stop: stopWords(otherPlayer.name, player.name),
    });
    
    return trimContentPrefx(content, lastPrompt);
  }, 'llm', playerId, conversationId, `Hello! How are you doing?`);
}

/**
 * 繼續對話消息
 */
export async function continueConversationMessage(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  conversationId: GameId<'conversations'>,
  playerId: GameId<'players'>,
  otherPlayerId: GameId<'players'>,
): Promise<string> {
  return withConversationErrorHandling(async () => {
    const playerData = await ctx.runQuery(selfInternal.queryPromptData, {
      worldId,
      playerId,
      otherPlayerId,
      conversationId,
    });

    const { player, otherPlayer, conversation, agent, otherAgent } = playerData;
    
    const now = Date.now();
    const started = new Date(conversation.created);
    
    const embedding = await embeddingsCache.fetch(
      ctx,
      `What do you think about ${otherPlayer.name}?`,
    );
    
    const memories = await memory.searchMemories(ctx, player.id as GameId<'players'>, embedding, 3);
    
    const prompt = [
      `You are ${player.name}, and you're currently in a conversation with ${otherPlayer.name}.`,
      `The conversation started at ${started.toLocaleString()}. It's now ${new Date(now).toLocaleString()}.`,
      ...agentPrompts(otherPlayer, agent, otherAgent ?? null),
      ...relatedMemoriesPrompt(memories),
      `Below is the current chat history between you and ${otherPlayer.name}.`,
      `DO NOT greet them again. Do NOT use the word "Hey" too often. Your response should be brief and within 200 characters.`,
    ];

    const llmMessages: LLMMessage[] = [
      {
        role: 'system',
        content: prompt.join('\n'),
      },
      ...(await previousMessages(
        ctx,
        worldId,
        player,
        otherPlayer,
        conversation.id as GameId<'conversations'>,
      )),
    ];
    
    const lastPrompt = `${player.name} to ${otherPlayer.name}:`;
    llmMessages.push({ role: 'user', content: lastPrompt });

    const { content } = await chatCompletion({
      messages: llmMessages,
      max_tokens: 300,
      stop: stopWords(otherPlayer.name, player.name),
    });
    
    return trimContentPrefx(content, lastPrompt);
  }, 'llm', playerId, conversationId, `I see, that makes sense.`);
}

/**
 * 離開對話消息
 */
export async function leaveConversationMessage(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  conversationId: GameId<'conversations'>,
  playerId: GameId<'players'>,
  otherPlayerId: GameId<'players'>,
): Promise<string> {
  return withConversationErrorHandling(async () => {
    const playerData = await ctx.runQuery(selfInternal.queryPromptData, {
      worldId,
      playerId,
      otherPlayerId,
      conversationId,
    });

    const { player, otherPlayer, conversation, agent, otherAgent } = playerData;
    
    const prompt = [
      `You are ${player.name}, and you're currently in a conversation with ${otherPlayer.name}.`,
      `You've decided to leave the question and would like to politely tell them you're leaving the conversation.`,
      ...agentPrompts(otherPlayer, agent, otherAgent ?? null),
      `Below is the current chat history between you and ${otherPlayer.name}.`,
      `How would you like to tell them that you're leaving? Your response should be brief and within 200 characters.`,
    ];
    
    const llmMessages: LLMMessage[] = [
      {
        role: 'system',
        content: prompt.join('\n'),
      },
      ...(await previousMessages(
        ctx,
        worldId,
        player,
        otherPlayer,
        conversation.id as GameId<'conversations'>,
      )),
    ];
    
    const lastPrompt = `${player.name} to ${otherPlayer.name}:`;
    llmMessages.push({ role: 'user', content: lastPrompt });

    const { content } = await chatCompletion({
      messages: llmMessages,
      max_tokens: 300,
      stop: stopWords(otherPlayer.name, player.name),
    });
    
    return trimContentPrefx(content, lastPrompt);
  }, 'llm', playerId, conversationId, `I need to go now, talk to you later!`);
}

// 向後相容性：從原始位置匯出
export { queryPromptData } from './conversationData';
