import { v } from 'convex/values';
import { internalAction } from '../_generated/server';
import { WorldMap, serializedWorldMap } from './worldMap';
import { rememberConversation } from '../agent/memory';
import { GameId, agentId, conversationId, playerId } from './ids';
import {
  continueConversationMessage,
  leaveConversationMessage,
  startConversationMessage,
} from '../agent/conversation';
import { assertNever } from '../util/assertNever';
import { serializedAgent } from './agent';
import {
  ACTIVITIES,
  ACTIVITY_COOLDOWN,
  CONVERSATION_COOLDOWN,
  ActivityDefinition,
  getAvailableActivities,
} from '../constants';
import { api, internal } from '../_generated/api';
import { sleep } from '../util/sleep';
import { serializedPlayer } from './player';
import { chatCompletion } from '../util/llm';
import { ActionCtx } from '../_generated/server';
import { Id } from '../_generated/dataModel';

export const agentRememberConversation = internalAction({
  args: {
    worldId: v.id('worlds'),
    playerId,
    agentId,
    conversationId,
    operationId: v.string(),
  },
  handler: async (ctx, args) => {
    await rememberConversation(
      ctx,
      args.worldId,
      args.agentId as GameId<'agents'>,
      args.playerId as GameId<'players'>,
      args.conversationId as GameId<'conversations'>,
    );
    await sleep(Math.random() * 1000);
    await ctx.runMutation(api.aiTown.main.sendInput, {
      worldId: args.worldId,
      name: 'finishRememberConversation',
      args: {
        agentId: args.agentId,
        operationId: args.operationId,
      },
    });
  },
});

export const agentGenerateMessage = internalAction({
  args: {
    worldId: v.id('worlds'),
    playerId,
    agentId,
    conversationId,
    otherPlayerId: playerId,
    operationId: v.string(),
    type: v.union(v.literal('start'), v.literal('continue'), v.literal('leave')),
    messageUuid: v.string(),
  },
  handler: async (ctx, args) => {
    let completionFn;
    switch (args.type) {
      case 'start':
        completionFn = startConversationMessage;
        break;
      case 'continue':
        completionFn = continueConversationMessage;
        break;
      case 'leave':
        completionFn = leaveConversationMessage;
        break;
      default:
        assertNever(args.type);
    }
    let text: string;
    try {
      text = await completionFn(
        ctx,
        args.worldId,
        args.conversationId as GameId<'conversations'>,
        args.playerId as GameId<'players'>,
        args.otherPlayerId as GameId<'players'>,
      );
    } catch (error: any) {
      console.error(`Error generating message for agent ${args.agentId}:`, error);
      
      // 根據錯誤類型提供更具體的錯誤訊息
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.error('LLM API 網路連線失敗:', error.message);
      } else if (error.status === 429) {
        console.error('LLM API 限速錯誤:', error.message);
      } else if (error.status >= 500) {
        console.error('LLM 服務端錯誤:', error.status, error.message);
      } else if (error.message && error.message.includes('timed out')) {
        console.error('操作逾時:', error.message);
      } else if (error.message && error.message.includes('not found')) {
        console.error('查詢資料不存在:', error.message);
      } else {
        console.error('未預期的錯誤:', error);
      }
      
      // 提供默認回退消息以避免UnhandledPromiseRejection
      switch (args.type) {
        case 'start':
          text = `Hi, how are you doing?`;
          break;
        case 'continue':
          text = 'I see, that makes sense.';
          break;
        case 'leave':
          text = 'I need to go now, talk to you later!';
          break;
        default:
          text = 'Hello!';
      }
    }

    try {
      await ctx.runMutation(internal.aiTown.agent.agentSendMessage, {
        worldId: args.worldId,
        conversationId: args.conversationId,
        agentId: args.agentId,
        playerId: args.playerId,
        text,
        messageUuid: args.messageUuid,
        leaveConversation: args.type === 'leave',
        operationId: args.operationId,
      });
    } catch (error) {
      console.error(`Error sending message for agent ${args.agentId}:`, error);
      // 不再重新拋出錯誤，避免 UnhandledPromiseRejection
      // 而是記錄錯誤並讓操作正常完成
      return;
    }
  },
});

/**
 * 使用 LLM 選擇活動
 * @returns 選中的活動,或 null 表示需要回退到隨機選擇
 */
async function chooseActivityWithLLM(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  playerId: string,
  agentId: string,
): Promise<ActivityDefinition | null> {
  let characterName = 'unknown';
  try {
    // 查詢 player description 獲取角色名稱
    const playerDescription = await ctx.runQuery(internal.aiTown.game.getPlayerDescription, {
      worldId,
      playerId,
    });

    if (!playerDescription) {
      console.warn(`Player description not found for ${playerId}`);
      return null;
    }

    characterName = playerDescription.name;

    // 查詢 agent description 獲取 identity 和 plan
    const agentDescription = await ctx.runQuery(internal.aiTown.game.getAgentDescription, {
      worldId,
      agentId,
    });

    if (!agentDescription) {
      console.warn(`Agent description not found for ${agentId}`);
      return null;
    }

    const { identity, plan } = agentDescription;
    const activities = getAvailableActivities(characterName);

    // 建構活動列表
    const activityList = activities
      .map((a, i) => `${i + 1}. ${a.description} ${a.emoji}`)
      .join('\n');

    // 建構提示詞
    const prompt = `You are ${characterName}.

${identity}

${plan}

Choose ONE activity from the following list that best fits your character and current situation:

${activityList}

Respond with ONLY a JSON object in this exact format: {"activityIndex": number}

Example: {"activityIndex": 3}`;

    // 呼叫 LLM
    let content: string;
    try {
      const result = await chatCompletion({
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 50,
        temperature: 0.7,
      });
      content = result.content;
    } catch (error) {
      console.error(`LLM call failed for ${characterName}:`, error);
      return null; // 回退到隨機選擇
    }

    console.log(`LLM response for ${characterName}: ${content}`);

    // 解析回應,提取 activityIndex
    const match = content.match(/\{\s*"activityIndex"\s*:\s*(\d+)\s*\}/);
    if (match) {
      const index = parseInt(match[1]) - 1; // 轉換為 0-based index
      if (index >= 0 && index < activities.length) {
        console.log(`LLM selected activity ${index + 1}: ${activities[index].description}`);
        return activities[index];
      } else {
        console.warn(`LLM returned out-of-range index: ${index + 1}`);
      }
    } else {
      console.warn(`Failed to parse LLM response: ${content}`);
    }
  } catch (error) {
    console.error(`LLM activity selection failed for ${characterName}:`, error);
  }

  return null; // 回退到隨機選擇
}

/**
 * 隨機選擇活動(作為 LLM 失敗時的備用方案)
 * 使用舊版的全局活動列表確保向後兼容
 */
function selectRandomActivity(): ActivityDefinition {
  return ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];
}

export const agentDoSomething = internalAction({
  args: {
    worldId: v.id('worlds'),
    player: v.object(serializedPlayer),
    agent: v.object(serializedAgent),
    map: v.object(serializedWorldMap),
    otherFreePlayers: v.array(v.object(serializedPlayer)),
    operationId: v.string(),
  },
  handler: async (ctx, args) => {
    const { player, agent } = args;
    const map = new WorldMap(args.map);
    const now = Date.now();
    // Don't try to start a new conversation if we were just in one.
    const justLeftConversation =
      agent.lastConversation && now < agent.lastConversation + CONVERSATION_COOLDOWN;
    // Don't try again if we recently tried to find someone to invite.
    const recentlyAttemptedInvite =
      agent.lastInviteAttempt && now < agent.lastInviteAttempt + CONVERSATION_COOLDOWN;
    const recentActivity = player.activity && now < player.activity.until + ACTIVITY_COOLDOWN;
    // Decide whether to do an activity or wander somewhere.
    if (!player.pathfinding) {
      if (recentActivity || justLeftConversation) {
        await sleep(Math.random() * 1000);
        await ctx.runMutation(api.aiTown.main.sendInput, {
          worldId: args.worldId,
          name: 'finishDoSomething',
          args: {
            operationId: args.operationId,
            agentId: agent.id,
            destination: wanderDestination(map),
          },
        });
        return;
      } else {
        // 嘗試使用 LLM 選擇活動
        let activity;
        try {
          activity = await chooseActivityWithLLM(
            ctx,
            args.worldId,
            player.id,
            agent.id,
          );
        } catch (error) {
          console.error(`Error choosing activity with LLM for agent ${agent.id}:`, error);
          activity = null;
        }

        // 如果 LLM 失敗,回退到隨機選擇
        if (!activity) {
          console.log(`Falling back to random activity selection for agent ${agent.id}`);
          activity = selectRandomActivity();
        }

        await sleep(Math.random() * 1000);
        await ctx.runMutation(api.aiTown.main.sendInput, {
          worldId: args.worldId,
          name: 'finishDoSomething',
          args: {
            operationId: args.operationId,
            agentId: agent.id,
            activity: {
              description: activity.description,
              emoji: activity.emoji,
              until: Date.now() + activity.duration,
            },
          },
        });
        return;
      }
    }
    const invitee =
      justLeftConversation || recentlyAttemptedInvite
        ? undefined
        : await ctx.runQuery(internal.aiTown.agent.findConversationCandidate, {
            now,
            worldId: args.worldId,
            player: args.player,
            otherFreePlayers: args.otherFreePlayers,
          });

    // TODO: We hit a lot of OCC errors on sending inputs in this file. It's
    // easy for them to get scheduled at the same time and line up in time.
    await sleep(Math.random() * 1000);
    await ctx.runMutation(api.aiTown.main.sendInput, {
      worldId: args.worldId,
      name: 'finishDoSomething',
      args: {
        operationId: args.operationId,
        agentId: args.agent.id,
        invitee,
      },
    });
  },
});

function wanderDestination(worldMap: WorldMap) {
  // Wander someonewhere at least one tile away from the edge.
  return {
    x: 1 + Math.floor(Math.random() * (worldMap.width - 2)),
    y: 1 + Math.floor(Math.random() * (worldMap.height - 2)),
  };
}
