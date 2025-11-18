/**
 * 檢查 Convex 資料庫各表的資料量
 * 使用 Node.js 執行: node scripts/checkDatabaseSize.js
 */

import { ConvexHttpClient } from 'convex/browser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const CONVEX_URL = process.env.VITE_CONVEX_URL || 'http://127.0.0.1:3210';

async function checkDatabaseSize() {
  console.log('連接到 Convex:', CONVEX_URL);
  const client = new ConvexHttpClient(CONVEX_URL);

  try {
    // 使用系統表格來獲取資料
    const stats = {
      messages: 0,
      memories: 0,
      memoryEmbeddings: 0,
      embeddingsCache: 0,
      archivedPlayers: 0,
      archivedConversations: 0,
      archivedAgents: 0,
      worlds: 0,
    };

    // 注意：這需要在 convex/exportMessages.ts 中定義相應的查詢函式
    console.log('\n正在收集資料庫統計資訊...\n');

    // 如果有 exportMessages 函式，使用它
    try {
      const messageStats = await client.query('exportMessages:getMessageStats');
      stats.messages = messageStats.totalMessages;
      console.log(`訊息表 (messages): ${stats.messages.toLocaleString()} 筆`);
    } catch (e) {
      console.log('訊息表 (messages): 無法獲取（需要部署 exportMessages.ts）');
      console.log('  錯誤:', e.message);
    }

    try {
      const memoryStats = await client.query('exportMessages:getMemoryStats');
      stats.memories = memoryStats.memoriesCount;
      stats.memoryEmbeddings = memoryStats.embeddingsCount;
      stats.embeddingsCache = memoryStats.embeddingsCacheCount;

      console.log(`記憶表 (memories): ${stats.memories.toLocaleString()} 筆`);
      console.log(`記憶嵌入表 (memoryEmbeddings): ${stats.memoryEmbeddings.toLocaleString()} 筆`);
      console.log(`嵌入快取表 (embeddingsCache): ${stats.embeddingsCache.toLocaleString()} 筆`);
    } catch (e) {
      console.log('記憶相關表: 無法獲取（需要部署 exportMessages.ts）');
      console.log('  錯誤:', e.message);
    }

    // 檢查是否有任何資料
    const hasData = Object.values(stats).some(v => v > 0);
    if (!hasData) {
      console.log('\n⚠️  無法獲取資料庫統計。');
      console.log('\n請確保：');
      console.log('1. Convex 本地服務正在運行 (npx convex dev)');
      console.log('2. 等待 Convex 完成編譯和部署');
      console.log('3. 運行以下命令查看 Convex 是否正常:');
      console.log('   curl http://127.0.0.1:3210');
      return;
    }

    // 估算大小
    console.log('\n=== 資料大小估算 ===');
    console.log('注意：這是粗略估算，實際大小可能不同\n');

    // 向量維度（根據配置）
    const EMBEDDING_DIMENSION = 1024; // mxbai-embed-large

    // 估算每筆記錄的大小
    const sizes = {
      message: 500, // bytes (包含文字、ID、時間戳等)
      memory: 300, // bytes (不含向量)
      embedding: EMBEDDING_DIMENSION * 8 + 100, // 向量 + metadata (float64 = 8 bytes)
      cache: EMBEDDING_DIMENSION * 8 + 100,
    };

    const estimatedSizes = {
      messages: stats.messages * sizes.message,
      memories: stats.memories * sizes.memory,
      memoryEmbeddings: stats.memoryEmbeddings * sizes.embedding,
      embeddingsCache: stats.embeddingsCache * sizes.cache,
    };

    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    console.log(`訊息資料: ${formatBytes(estimatedSizes.messages)}`);
    console.log(`記憶資料 (不含向量): ${formatBytes(estimatedSizes.memories)}`);
    console.log(`記憶嵌入向量: ${formatBytes(estimatedSizes.memoryEmbeddings)}`);
    console.log(`嵌入快取向量: ${formatBytes(estimatedSizes.embeddingsCache)}`);

    const totalEstimated = Object.values(estimatedSizes).reduce((a, b) => a + b, 0);
    console.log(`\n總計（估算）: ${formatBytes(totalEstimated)}`);

    const vectorDataSize = estimatedSizes.memoryEmbeddings + estimatedSizes.embeddingsCache;
    const messageDataSize = estimatedSizes.messages;

    console.log('\n=== 資料分佈 ===');
    if (totalEstimated > 0) {
      console.log(`向量資料: ${formatBytes(vectorDataSize)} (${Math.round(vectorDataSize / totalEstimated * 100)}%)`);
      console.log(`對話訊息: ${formatBytes(messageDataSize)} (${Math.round(messageDataSize / totalEstimated * 100)}%)`);
      console.log(`其他資料: ${formatBytes(estimatedSizes.memories)} (${Math.round(estimatedSizes.memories / totalEstimated * 100)}%)`);

      console.log('\n=== 結論 ===');
      if (vectorDataSize > messageDataSize * 2) {
        console.log('向量資料佔據了大部分空間，是對話訊息的數倍。');
        console.log('建議：清理向量資料（embeddingsCache）可能更有效。');
      } else if (messageDataSize > vectorDataSize) {
        console.log('對話訊息佔據了主要空間。');
        console.log('建議：清理舊對話訊息會明顯減少資料庫大小。');
      } else {
        console.log('向量資料和對話訊息佔用空間相當。');
        console.log('建議：可以同時清理兩者。');
      }
    }

    console.log('\n=== 實際資料庫檔案 ===');
    console.log('資料庫位置: f:\\download\\convex-local-backend-x86_64-pc-windows-msvc\\convex_local_backend.sqlite3');
    console.log('實際大小: 5.1 GB');
    console.log('\n注意：實際檔案大小遠大於估算值，可能包含：');
    console.log('  - SQLite 索引和 B-tree 結構開銷');
    console.log('  - 已刪除但未 VACUUM 的資料');
    console.log('  - 其他 Convex 內部資料表');

  } catch (error) {
    console.error('檢查失敗:', error.message);
    console.log('\n請確保：');
    console.log('1. Convex 本地服務正在運行 (npx convex dev)');
    console.log('2. 已部署 convex/exportMessages.ts 中的查詢函式');
    console.log('3. .env.local 中的 VITE_CONVEX_URL 設定正確');
  }
}

checkDatabaseSize()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
