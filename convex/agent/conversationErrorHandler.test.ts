import { describe, test, expect, jest } from '@jest/globals';
import {
  handleQueryError,
  handleLLMError,
  withConversationErrorHandling
} from './conversationErrorHandler';

describe('conversationErrorHandler', () => {
  describe('handleQueryError', () => {
    test('should return start conversation fallback for query errors', () => {
      const error = new Error('Database connection failed');
      const result = handleQueryError(error, 'start', 'conv123');
      
      expect(result).toBe('Hello! How are you doing?');
      expect(console.error).toHaveBeenCalledWith(
        'Failed to query prompt data for conversation conv123:',
        error
      );
    });

    test('should return continue conversation fallback for query errors', () => {
      const error = new Error('Data not found');
      const result = handleQueryError(error, 'continue', 'conv456');
      
      expect(result).toBe('I see, that makes sense.');
    });

    test('should return leave conversation fallback for query errors', () => {
      const error = new Error('Network timeout');
      const result = handleQueryError(error, 'leave', 'conv789');
      
      expect(result).toBe('I need to go now, talk to you later!');
    });

    test('should handle "not found" errors specifically', () => {
      const error = new Error('Player not found');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      handleQueryError(error, 'start', 'conv123');
      
      expect(consoleSpy).toHaveBeenCalledWith('查詢資料不存在:', 'Player not found');
      consoleSpy.mockRestore();
    });
  });

  describe('handleLLMError', () => {
    test('should handle network connection errors', () => {
      const error = { code: 'ENOTFOUND', message: 'DNS lookup failed' };
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = handleLLMError(error, 'player123');
      
      expect(result).toBe('I see, that makes sense.');
      expect(consoleSpy).toHaveBeenCalledWith('LLM API 網路連線失敗:', 'DNS lookup failed');
      consoleSpy.mockRestore();
    });

    test('should handle rate limit errors', () => {
      const error = { status: 429, message: 'Too many requests' };
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = handleLLMError(error, 'player456');
      
      expect(consoleSpy).toHaveBeenCalledWith('LLM API 限速錯誤:', 'Too many requests');
      consoleSpy.mockRestore();
    });

    test('should handle server errors', () => {
      const error = { status: 500, message: 'Internal server error' };
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = handleLLMError(error, 'player789');
      
      expect(consoleSpy).toHaveBeenCalledWith('LLM 服務端錯誤:', 500, 'Internal server error');
      consoleSpy.mockRestore();
    });

    test('should handle timeout errors', () => {
      const error = { message: 'Request timed out after 30s' };
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = handleLLMError(error, 'player111');
      
      expect(consoleSpy).toHaveBeenCalledWith('LLM 調用逾時:', 'Request timed out after 30s');
      consoleSpy.mockRestore();
    });

    test('should handle generic errors', () => {
      const error = { message: 'Unknown error' };
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = handleLLMError(error, 'player222');
      
      expect(consoleSpy).toHaveBeenCalledWith('LLM 調用錯誤:', error);
      consoleSpy.mockRestore();
    });
  });

  describe('withConversationErrorHandling', () => {
    test('should return successful operation result', async () => {
      const mockOperation = jest.fn<() => Promise<string>>().mockResolvedValue('Success result');
      
      const result = await withConversationErrorHandling(
        mockOperation,
        'llm',
        'player123',
        'conv456',
        'Fallback value'
      );
      
      expect(result).toBe('Success result');
      expect(mockOperation).toHaveBeenCalled();
    });

    test('should handle query errors with appropriate fallback', async () => {
      const mockError = new Error('Query failed');
      const mockOperation = jest.fn<() => Promise<string>>().mockRejectedValue(mockError);
      
      const result = await withConversationErrorHandling(
        mockOperation,
        'query',
        'player123',
        'conv456',
        'Fallback value'
      );
      
      expect(result).toBe('Hello! How are you doing?');
    });

    test('should handle LLM errors with appropriate fallback', async () => {
      const mockError = new Error('LLM failed');
      const mockOperation = jest.fn<() => Promise<string>>().mockRejectedValue(mockError);
      
      const result = await withConversationErrorHandling(
        mockOperation,
        'llm',
        'player123',
        'conv456',
        'Fallback value'
      );
      
      expect(result).toBe('I see, that makes sense.');
    });

    test('should use custom fallback for unknown error types', async () => {
      const mockError = new Error('Unknown error');
      const mockOperation = jest.fn<() => Promise<string>>().mockRejectedValue(mockError);
      
      const result = await withConversationErrorHandling(
        mockOperation,
        'unknown',
        'player123',
        'conv456',
        'Custom fallback'
      );
      
      expect(result).toBe('Custom fallback');
    });
  });
});