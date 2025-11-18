/**
 * 導出 Convex 資料庫中的對話訊息
 * 使用 exportMessages 函式批量導出所有對話
 */

import { ConvexHttpClient } from 'convex/browser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const CONVEX_URL = process.env.VITE_CONVEX_URL || 'http://127.0.0.1:3210';

async function exportAllMessages() {
  console.log('🔗 連接到 Convex:', CONVEX_URL);
  const client = new ConvexHttpClient(CONVEX_URL);

  try {
    const allMessages = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;

    console.log('\n📥 開始導出對話訊息...\n');

    // 分批獲取所有訊息
    while (hasMore) {
      const result = await client.query('exportMessages:getAllMessages', {
        offset,
        limit: batchSize,
      });

      allMessages.push(...result.messages);

      console.log(`  已獲取 ${allMessages.length}/${result.total} 則訊息...`);

      hasMore = result.hasMore;
      offset += batchSize;
    }

    if (allMessages.length === 0) {
      console.log('\n⚠️  沒有找到任何對話訊息');
      return;
    }

    // 按時間排序（最舊到最新）
    allMessages.sort((a, b) => a.creationTime - b.creationTime);

    // 創建輸出目錄
    const outputDir = path.join(__dirname, '..', 'exports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 生成時間戳
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);

    // 導出為 JSON
    const jsonPath = path.join(outputDir, `messages_${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(allMessages, null, 2));
    console.log(`\n✅ JSON 已導出: ${jsonPath}`);

    // 導出為 CSV
    const csvPath = path.join(outputDir, `messages_${timestamp}.csv`);
    const csvHeader = 'Timestamp,World ID,Conversation ID,Author,Author Name,Message UUID,Text\n';
    const csvRows = allMessages.map(msg => {
      const text = (msg.text || '').replace(/"/g, '""').replace(/\n/g, ' '); // 轉義雙引號和換行
      return `"${msg.timestamp}","${msg.worldId || ''}","${msg.conversationId}","${msg.author}","${msg.authorName || ''}","${msg.messageUuid || ''}","${text}"`;
    });
    fs.writeFileSync(csvPath, csvHeader + csvRows.join('\n'));
    console.log(`✅ CSV 已導出: ${csvPath}`);

    // 顯示統計資訊
    console.log('\n📊 導出統計:');
    console.log(`   總訊息數: ${allMessages.length.toLocaleString()} 則`);
    console.log(`   最早訊息: ${allMessages[0].timestamp}`);
    console.log(`   最新訊息: ${allMessages[allMessages.length - 1].timestamp}`);

    // 統計每個對話的訊息數
    const conversationCounts = new Map();
    for (const msg of allMessages) {
      conversationCounts.set(
        msg.conversationId,
        (conversationCounts.get(msg.conversationId) || 0) + 1
      );
    }
    console.log(`   對話總數: ${conversationCounts.size.toLocaleString()}`);

    // 統計文件大小
    const jsonSize = fs.statSync(jsonPath).size;
    const csvSize = fs.statSync(csvPath).size;
    const formatSize = (bytes) => {
      const mb = bytes / 1024 / 1024;
      return mb < 1 ? `${(bytes / 1024).toFixed(2)} KB` : `${mb.toFixed(2)} MB`;
    };
    console.log(`   JSON 大小: ${formatSize(jsonSize)}`);
    console.log(`   CSV 大小: ${formatSize(csvSize)}`);

    console.log('\n✨ 導出完成！');
    console.log(`\n💾 導出檔案位置:\n   ${outputDir}`);

  } catch (error) {
    console.error('\n❌ 導出失敗:', error.message);
    if (error.stack) {
      console.error('\n詳細錯誤:', error.stack);
    }
    throw error;
  }
}

// 執行導出
console.log('🚀 AI Town 對話訊息導出工具');
console.log('=' .repeat(50));

exportAllMessages()
  .then(() => {
    console.log('\n✅ 程序執行完畢');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 程序執行失敗:', error);
    process.exit(1);
  });
