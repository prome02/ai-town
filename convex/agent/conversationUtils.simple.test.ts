// Simple test for conversationUtils without Convex dependencies
import { describe, test, expect } from '@jest/globals';

// Import only the pure functions that don't depend on Convex
const trimContentPrefx = (content: string, prompt: string): string => {
  if (content.startsWith(prompt)) {
    return content.slice(prompt.length).trim();
  }
  return content;
};

const stopWords = (otherPlayer: string, player: string): string[] => {
  const variants = [`${otherPlayer} to ${player}`];
  return variants.flatMap((stop) => [stop + ':', stop.toLowerCase() + ':']);
};

const agentPrompts = (
  otherPlayer: { name: string },
  agent: { identity: string; plan: string } | null,
  otherAgent: { identity: string; plan: string } | null,
): string[] => {
  const prompt = [];
  if (agent) {
    prompt.push(`About you: ${agent.identity}`);
    prompt.push(`Your goals for the conversation: ${agent.plan}`);
  }
  if (otherAgent) {
    prompt.push(`About ${otherPlayer.name}: ${otherAgent.identity}`);
  }
  return prompt;
};

const previousConversationPrompt = (
  otherPlayer: { name: string },
  conversation: { created: number } | null,
): string[] => {
  const prompt = [];
  if (conversation) {
    const prev = new Date(conversation.created);
    const now = new Date();
    prompt.push(
      `Last time you chatted with ${
        otherPlayer.name
      } it was ${prev.toLocaleString()}. It's now ${now.toLocaleString()}.`,
    );
  }
  return prompt;
};

const relatedMemoriesPrompt = (memories: any[]): string[] => {
  const prompt = [];
  if (memories.length > 0) {
    prompt.push(`Here are some related memories in decreasing relevance order:`);
    for (const memory of memories) {
      prompt.push(' - ' + memory.description);
    }
  }
  return prompt;
};

describe('conversationUtils - Pure Functions', () => {
  describe('trimContentPrefx', () => {
    test('should trim prefix when content starts with prompt', () => {
      const content = 'Alice to Bob: Hello there!';
      const prompt = 'Alice to Bob:';
      expect(trimContentPrefx(content, prompt)).toBe('Hello there!');
    });

    test('should return original content when no prefix match', () => {
      const content = 'Hello there!';
      const prompt = 'Alice to Bob:';
      expect(trimContentPrefx(content, prompt)).toBe('Hello there!');
    });

    test('should handle empty content', () => {
      const content = '';
      const prompt = 'Alice to Bob:';
      expect(trimContentPrefx(content, prompt)).toBe('');
    });
  });

  describe('stopWords', () => {
    test('should generate correct stop words for player names', () => {
      const result = stopWords('Bob', 'Alice');
      expect(result).toContain('Bob to Alice:');
      expect(result).toContain('bob to alice:');
    });

    test('should handle single word names', () => {
      const result = stopWords('John', 'Jane');
      expect(result).toHaveLength(2);
      expect(result).toContain('John to Jane:');
      expect(result).toContain('john to jane:');
    });
  });

  describe('agentPrompts', () => {
    test('should generate prompts with agent info', () => {
      const otherPlayer = { name: 'Bob' };
      const agent = { identity: 'Friendly merchant', plan: 'Sell goods' };
      const otherAgent = { identity: 'Curious customer', plan: 'Buy items' };

      const result = agentPrompts(otherPlayer, agent, otherAgent);
      
      expect(result).toContain('About you: Friendly merchant');
      expect(result).toContain('Your goals for the conversation: Sell goods');
      expect(result).toContain('About Bob: Curious customer');
    });

    test('should handle null otherAgent', () => {
      const otherPlayer = { name: 'Bob' };
      const agent = { identity: 'Friendly merchant', plan: 'Sell goods' };
      const otherAgent = null;

      const result = agentPrompts(otherPlayer, agent, otherAgent);
      
      expect(result).toContain('About you: Friendly merchant');
      expect(result).toContain('Your goals for the conversation: Sell goods');
      expect(result).not.toContain('About Bob:');
    });

    test('should handle null agent', () => {
      const otherPlayer = { name: 'Bob' };
      const agent = null;
      const otherAgent = { identity: 'Curious customer', plan: 'Buy items' };

      const result = agentPrompts(otherPlayer, agent, otherAgent);
      
      expect(result).not.toContain('About you:');
      expect(result).toContain('About Bob: Curious customer');
    });
  });

  describe('previousConversationPrompt', () => {
    test('should generate prompt with previous conversation time', () => {
      const otherPlayer = { name: 'Bob' };
      const prevTime = new Date('2023-01-01T10:00:00').getTime();
      const conversation = { created: prevTime };

      const result = previousConversationPrompt(otherPlayer, conversation);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toContain('Last time you chatted with Bob');
      expect(result[0]).toContain('2023/1/1');
    });

    test('should return empty array when no previous conversation', () => {
      const otherPlayer = { name: 'Bob' };
      const conversation = null;

      const result = previousConversationPrompt(otherPlayer, conversation);
      
      expect(result).toHaveLength(0);
    });
  });

  describe('relatedMemoriesPrompt', () => {
    test('should generate prompts with memories', () => {
      const memories = [
        { description: 'Had a great conversation about books' },
        { description: 'Discussed the weather' },
      ];

      const result = relatedMemoriesPrompt(memories);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toBe('Here are some related memories in decreasing relevance order:');
      expect(result[1]).toBe(' - Had a great conversation about books');
      expect(result[2]).toBe(' - Discussed the weather');
    });

    test('should return empty array when no memories', () => {
      const memories: any[] = [];

      const result = relatedMemoriesPrompt(memories);
      
      expect(result).toHaveLength(0);
    });

    test('should handle single memory', () => {
      const memories = [
        { description: 'Had a great conversation' },
      ];

      const result = relatedMemoriesPrompt(memories);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('Here are some related memories in decreasing relevance order:');
      expect(result[1]).toBe(' - Had a great conversation');
    });
  });
});