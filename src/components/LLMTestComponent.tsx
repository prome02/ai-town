import { useState } from 'react';
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

/**
 * 簡化版 LLM 測試組件
 *
 * 功能:
 * 1. 顯示 LLM API 連接狀態
 * 2. 執行完整 LLM 測試
 * 3. 顯示測試訊息歷史
 */
export default function LLMTestComponent() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  // 獲取預設世界
  const defaultWorld = useQuery(api.world.defaultWorldStatus);

  // 獲取 API 狀態
  const apiStatus = useQuery(
    api.testing.testLLMAPI,
    defaultWorld?.worldId ? { worldId: defaultWorld.worldId } : 'skip'
  );

  // 獲取測試訊息
  const messages = useQuery(
    api.testing.listTestMessages,
    defaultWorld?.worldId ? { worldId: defaultWorld.worldId } : 'skip'
  );

  // Actions & Mutations
  const runLLMTest = useAction(api.testing.runLLMTest);
  const quickAPITest = useAction(api.testing.quickAPITest);
  const clearMessages = useMutation(api.testing.clearTestMessages);

  // 執行完整測試
  const handleRunTest = async () => {
    if (!defaultWorld?.worldId) {
      setTestResult('❌ 找不到預設世界');
      return;
    }

    setIsRunning(true);
    setTestResult('🚀 測試進行中...');

    try {
      const result = await runLLMTest({
        worldId: defaultWorld.worldId,
        testPrompt: "你好！請簡單介紹一下你自己。"
      });

      if (result.success) {
        setTestResult(`✅ 測試成功！\n\n💬 提問: ${result.prompt}\n\n🤖 回應: ${result.response}\n\n⏱️ 耗時: ${result.ms}ms`);
      } else {
        setTestResult(`❌ 測試失敗\n\n錯誤: ${result.error}\n\n💡 建議: ${result.suggestion}`);
      }
    } catch (error) {
      setTestResult(`❌ 測試異常: ${(error as Error).message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // 快速 API 測試
  const handleQuickTest = async () => {
    setIsRunning(true);
    setTestResult('🔌 檢查 API 連接中...');

    try {
      const result = await quickAPITest({});

      if (result.success) {
        setTestResult(`✅ API 連接正常\n\n回應: ${result.response}\n耗時: ${result.ms}ms\n\n配置:\n- Provider: ${result.config?.provider}\n- Model: ${result.config?.chatModel}\n- URL: ${result.config?.apiUrl}`);
      } else {
        setTestResult(`❌ API 連接失敗\n\n錯誤: ${result.error}`);
      }
    } catch (error) {
      setTestResult(`❌ API 測試異常: ${(error as Error).message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // 清除訊息
  const handleClear = async () => {
    if (!defaultWorld?.worldId) return;

    try {
      const result = await clearMessages({
        worldId: defaultWorld.worldId,
      });

      if (result.success) {
        setTestResult(`🗑️ 已清除 ${result.clearedCount} 條訊息`);
      }
    } catch (error) {
      setTestResult(`❌ 清除失敗: ${(error as Error).message}`);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🧪 LLM 測試工具</h1>
      <p style={styles.subtitle}>簡化版 - 專注於核心功能測試</p>

      {/* API 狀態 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📊 API 狀態</h2>
        <div style={{
          ...styles.card,
          borderColor: apiStatus?.success ? '#28a745' : '#dc3545'
        }}>
          {apiStatus ? (
            <>
              <div style={styles.statusRow}>
                <span style={styles.label}>狀態:</span>
                <span style={{
                  ...styles.badge,
                  backgroundColor: apiStatus.success ? '#28a745' : '#dc3545'
                }}>
                  {apiStatus.success ? '✅ 正常' : '❌ 異常'}
                </span>
              </div>
              <div style={styles.statusRow}>
                <span style={styles.label}>Provider:</span>
                <span>{apiStatus.provider}</span>
              </div>
              <div style={styles.statusRow}>
                <span style={styles.label}>模型:</span>
                <span>{apiStatus.chatModel}</span>
              </div>
              <div style={styles.statusRow}>
                <span style={styles.label}>API URL:</span>
                <span style={styles.urlText}>{apiStatus.apiUrl}</span>
              </div>
              <div style={styles.statusRow}>
                <span style={styles.label}>測試訊息數:</span>
                <span>{apiStatus.messageCount}</span>
              </div>
            </>
          ) : (
            <p style={styles.loading}>載入中...</p>
          )}
        </div>
      </div>

      {/* 測試按鈕 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>🎯 執行測試</h2>
        <div style={styles.buttonGroup}>
          <button
            onClick={handleQuickTest}
            disabled={isRunning}
            style={{
              ...styles.button,
              backgroundColor: isRunning ? '#6c757d' : '#17a2b8'
            }}
          >
            {isRunning ? '⏳ 測試中...' : '🔌 快速 API 測試'}
          </button>

          <button
            onClick={handleRunTest}
            disabled={isRunning || !defaultWorld?.worldId}
            style={{
              ...styles.button,
              backgroundColor: isRunning ? '#6c757d' : '#28a745'
            }}
          >
            {isRunning ? '⏳ 測試中...' : '🚀 完整 LLM 測試'}
          </button>

          <button
            onClick={handleClear}
            disabled={isRunning || !defaultWorld?.worldId}
            style={{
              ...styles.button,
              backgroundColor: isRunning ? '#6c757d' : '#dc3545'
            }}
          >
            🗑️ 清除訊息
          </button>
        </div>
      </div>

      {/* 測試結果 */}
      {testResult && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📋 測試結果</h2>
          <div style={styles.resultBox}>
            <pre style={styles.resultText}>{testResult}</pre>
          </div>
        </div>
      )}

      {/* 訊息歷史 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>💬 訊息歷史</h2>
        <div style={styles.messagesBox}>
          {messages && messages.length > 0 ? (
            messages.map((msg, index) => (
              <div
                key={msg._id}
                style={{
                  ...styles.message,
                  backgroundColor: msg.author.includes('assistant') ? '#2a3f5f' : '#1a2f3f'
                }}
              >
                <div style={styles.messageHeader}>
                  <span style={styles.messageAuthor}>
                    {msg.author.includes('assistant') ? '🤖' : '👤'} {msg.author}
                  </span>
                  <span style={styles.messageTime}>
                    {new Date(msg._creationTime).toLocaleTimeString()}
                  </span>
                </div>
                <div style={styles.messageText}>{msg.text}</div>
              </div>
            ))
          ) : (
            <p style={styles.emptyState}>尚無測試訊息</p>
          )}
        </div>
      </div>

      {/* 使用說明 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📖 使用說明</h2>
        <div style={styles.card}>
          <ul style={styles.helpList}>
            <li><strong>快速 API 測試:</strong> 僅測試 Ollama API 連接，不儲存訊息</li>
            <li><strong>完整 LLM 測試:</strong> 發送測試提問並儲存對話記錄</li>
            <li><strong>清除訊息:</strong> 刪除所有測試訊息</li>
          </ul>
          <div style={styles.troubleshoot}>
            <p><strong>⚠️ 常見問題:</strong></p>
            <ul>
              <li>如果連接失敗,請確認 Ollama 在 http://127.0.0.1:11434 運行</li>
              <li>如果模型錯誤,請執行: <code>ollama pull {apiStatus?.chatModel}</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// 樣式定義
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#0d1117',
    color: '#c9d1d9',
    minHeight: '100vh',
  },
  title: {
    fontSize: '32px',
    marginBottom: '8px',
    color: '#58a6ff',
  },
  subtitle: {
    color: '#8b949e',
    marginBottom: '32px',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '20px',
    marginBottom: '16px',
    color: '#f0f6fc',
  },
  card: {
    backgroundColor: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '16px',
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #21262d',
  },
  label: {
    fontWeight: 'bold',
    color: '#8b949e',
  },
  badge: {
    padding: '4px 12px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '14px',
  },
  urlText: {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#79c0ff',
  },
  loading: {
    color: '#8b949e',
    textAlign: 'center',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  button: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  resultBox: {
    backgroundColor: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '16px',
  },
  resultText: {
    margin: 0,
    color: '#c9d1d9',
    fontSize: '14px',
    whiteSpace: 'pre-wrap',
    lineHeight: '1.6',
  },
  messagesBox: {
    backgroundColor: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '16px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  message: {
    marginBottom: '12px',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #30363d',
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '12px',
  },
  messageAuthor: {
    color: '#58a6ff',
    fontWeight: 'bold',
  },
  messageTime: {
    color: '#8b949e',
  },
  messageText: {
    color: '#c9d1d9',
    lineHeight: '1.5',
  },
  emptyState: {
    textAlign: 'center',
    color: '#8b949e',
    padding: '32px',
  },
  helpList: {
    lineHeight: '1.8',
    color: '#c9d1d9',
  },
  troubleshoot: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#1c2128',
    borderRadius: '6px',
    fontSize: '14px',
  },
};
