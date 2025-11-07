import { describe, test, expect, jest } from '@jest/globals';
import { 
  startConversationMessage, 
  continueConversationMessage, 
  leaveConversationMessage 
} from './conversation';
import * as memory from './memory';
import * as embeddingsCache from './embeddingsCache';
import { api, internal } from '../_generated/api';

// Mock dependencies
jest.mock('./memory');
jest.mock('./embeddingsCache');
jest.mock('../_generated/api');

const mockMemory = memory as jest.Mocked<typeof memory>;
const mockEmbeddingsCache = embeddingsCache as jest.Mocked<typeof embeddingsCache>;
const mockApi = api as jest.Mocked<typeof api>;
const mockInternal = internal as jest.Mocked<typeof internal>;

describe('Conversation Integration Tests', () => {
  const mockCtx = {
    runQuery: jest.fn(),
    runMutation: jest.fn(),
    vectorSearch: jest.fn(),
    db: {
      get: jest.fn(),
      query: jest.fn(),
      insert: jest.fn(),
      patch: jest.fn(),
    },
    scheduler: {
      runAfter: jest.fn(),
    },
  } as any;

  const mockWorldId = 'world:123' as any;
  const mockConversationId = 'conv:456' as any;
  const mockPlayerId = 'player:789' as any;
  const mockOtherPlayerId = 'player:abc' as any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock queryPromptData
    mockCtx.runQuery.mockImplementation((queryRef: any, args: any) => {
      if (queryRef === internal.agent.conversation.queryPromptData) {
        return Promise.resolve({
          player: { 
            id: mockPlayerId, 
            name: 'Alice',
            character: 'friendly'
          },
          otherPlayer: { 
            id: mockOtherPlayerId, 
            name: 'Bob',
            character: 'curious'
          },
          conversation: { 
            id: mockConversationId, 
            created: Date.now() 
          },
          agent: { 
            identity: 'Helpful assistant', 
            plan: 'Have meaningful conversations',
            playerId: mockPlayerId
          },
          otherAgent: { 
            identity: 'Curious explorer', 
            plan: 'Learn new things',
            playerId: mockOtherPlayerId
          },
          lastConversation: null,
        });
      }
      return Promise.resolve([]);
    });

    // Setup mock embeddings cache
    mockEmbeddingsCache.fetch.mockResolvedValue([0.1, 0.2, 0.3]);

    // Setup mock memory search
    mockMemory.searchMemories.mockResolvedValue([]);
  });

  describe('startConversationMessage', () => {
    test('should generate greeting message successfully', async () => {
      const result = await startConversationMessage(
        mockCtx,
        mockWorldId,
        mockConversationId,
        mockPlayerId,
        mockOtherPlayerId
      );

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      
      // Verify dependencies were called
      expect(mockCtx.runQuery).toHaveBeenCalledWith(
        internal.agent.conversation.queryPromptData,
        expect.objectContaining({
          worldId: mockWorldId,
          playerId: mockPlayerId,
          otherPlayerId: mockOtherPlayerId,
          conversationId: mockConversationId,
        })
      );
      
      expect(mockEmbeddingsCache.fetch).toHaveBeenCalled();
      expect(mockMemory.searchMemories).toHaveBeenCalled();
    });

    test('should handle query errors gracefully', async () => {
      mockCtx.runQuery.mockRejectedValueOnce(new Error('Database error'));
      
      const result = await startConversationMessage(
        mockCtx,
        mockWorldId,
        mockConversationId,
        mockPlayerId,
        mockOtherPlayerId
      );

      expect(result).toBe('Hello! How are you doing?');
    });

    test('should handle LLM errors gracefully', async () => {
      // Mock a more complete LLM response simulation
      const { chatCompletion } = await import('../util/llm');
      jest.mocked(chatCompletion).mockRejectedValueOnce(new Error('LLM API error'));
      
      const result = await startConversationMessage(
        mockCtx,
        mockWorldId,
        mockConversationId,
        mockPlayerId,
        mockOtherPlayerId
      );

      expect(result).toBe('Hello! How are you doing?');
    });
  });

  describe('continueConversationMessage', () => {
    test('should generate continuation message successfully', async () => {
      // Mock message list
      mockCtx.runQuery.mockImplementation((queryRef: any, args: any) => {
        if (queryRef === api.messages.listMessages) {
          return Promise.resolve([
            { author: mockPlayerId, text: 'Hi Bob!' },
            { author: mockOtherPlayerId, text: 'Hello Alice!' },
          ]);
        }
        return Promise.resolve([]);
      });

      const result = await continueConversationMessage(
        mockCtx,
        mockWorldId,
        mockConversationId,
        mockPlayerId,
        mockOtherPlayerId
      );

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('should handle errors gracefully', async () => {
      mockCtx.runQuery.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await continueConversationMessage(
        mockCtx,
        mockWorldId,
        mockConversationId,
        mockPlayerId,
        mockOtherPlayerId
      );

      expect(result).toBe('I see, that makes sense.');
    });
  });

  describe('leaveConversationMessage', () => {
    test('should generate leave message successfully', async () => {
      const result = await leaveConversationMessage(
        mockCtx,
        mockWorldId,
        mockConversationId,
        mockPlayerId,
        mockOtherPlayerId
      );

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result.toLowerCase()).toMatch(/leave|go|later/);
    });

    test('should handle errors gracefully', async () => {
      mockCtx.runQuery.mockRejectedValueOnce(new Error('Service unavailable'));
      
      const result = await leaveConversationMessage(
        mockCtx,
        mockWorldId,
        mockConversationId,
        mockPlayerId,
        mockOtherPlayerId
      );

      expect(result).toBe('I need to go now, talk to you later!');
    });
  });

  describe('Memory integration', () => {
    test('should include relevant memories in conversation', async () => {
      const mockMemories = [
        {
          description: 'Had a great conversation about books',
          data: { type: 'conversation', playerIds: [mockOtherPlayerId] },
          importance: 8,
          lastAccess: Date.now(),
        },
        {
          description: 'Discussed the weather',
          data: { type: 'conversation', playerIds: ['other-player'] },
          importance: 5,
          lastAccess: Date.now(),
        },
      ];

      mockMemory.searchMemories.mockResolvedValue(mockMemories as any);

      const result = await startConversationMessage(
        mockCtx,
        mockWorldId,
        mockConversationId,
        mockPlayerId,
        mockOtherPlayerId
      );

      expect(result).toBeTruthy();
      expect(mockMemory.searchMemories).toHaveBeenCalledWith(
        mockCtx,
        mockPlayerId,
        expect.any(Array),
        expect.any(Number)
      );
    });
  });

  describe('Error recovery', () => {
    test('should recover from multiple types of errors', async () => {
      // Test different error scenarios
      const errors = [
        new Error('Database connection failed'),
        new Error('Network timeout'),
        new Error('Service unavailable'),
        { code: 'ENOTFOUND', message: 'DNS error' },
        { status: 429, message: 'Rate limited' },
      ];

      for (const error of errors) {
        mockCtx.runQuery.mockRejectedValueOnce(error);
        
        const result = await startConversationMessage(
          mockCtx,
          mockWorldId,
          mockConversationId,
          mockPlayerId,
          mockOtherPlayerId
        );

        expect(result).toBe('Hello! How are you doing?');
        
        // Reset mock for next iteration
        jest.clearAllMocks();
        mockCtx.runQuery.mockImplementation((queryRef: any, args: any) => {
          if (queryRef === internal.agent.conversation.queryPromptData) {
            return Promise.resolve({
              player: { id: mockPlayerId, name: 'Alice' },
              otherPlayer: { id: mockOtherPlayerId, name: 'Bob' },
              conversation: { id: mockConversationId, created: Date.now() },
              agent: { identity: 'Helpful assistant', plan: 'Have conversations' },
              otherAgent: { identity: 'Curious explorer', plan: 'Learn things' },
              lastConversation: null,
            });
          }
          return Promise.resolve([]);
        });
      }
    });
  });
});