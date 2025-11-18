/**
 * 導出 Convex 資料庫中的對話訊息
 *
 * 這個腳本會從本地 Convex 資料庫導出所有對話訊息，依照時間順序排序
 * 不包含向量資料，只導出對話內容
 */

import { api } from '../convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';
import * as fs from 'fs';
import * as path from 'path';

// 從環境變數或使用本地端點
const CONVEX_URL = process.env.VITE_CONVEX_URL || 'http://127.0.0.1:3210';

interface ExportedMessage {
  _id: string;
  _creationTime: number;
  conversationId: number;
  author: number;
  text: string;
  messageUuid: string;
  worldId?: string;
  authorName?: string;
  timestamp: string; // ISO format
}

async function exportMessages() {
  console.log('連接到 Convex:', CONVEX_URL);
  const client = new ConvexHttpClient(CONVEX_URL);

  try {
    // 獲取所有 world
    console.log('正在獲取世界資料...');
    const worlds = await client.query(api.world.getWorldData);

    if (!worlds || worlds.length === 0) {
      console.log('未找到任何世界資料');
      return;
    }

    const allMessages: ExportedMessage[] = [];

    // 對每個 world 獲取訊息
    for (const world of worlds) {
      console.log(`正在處理 world: ${world._id}`);

      // 獲取這個世界的所有對話
      const conversations = world.conversations || [];

      for (const conversation of conversations) {
        try {
          const messages = await client.query(api.messages.listMessages, {
            worldId: world._id,
            conversationId: conversation.id,
          });

          console.log(`  對話 ${conversation.id}: ${messages.length} 則訊息`);

          for (const msg of messages) {
            allMessages.push({
              ...msg,
              timestamp: new Date(msg._creationTime).toISOString(),
            });
          }
        } catch (error) {
          console.error(`  獲取對話 ${conversation.id} 失敗:`, error);
        }
      }
    }

    // 依照時間排序（最舊到最新）
    allMessages.sort((a, b) => a._creationTime - b._creationTime);

    // 創建輸出目錄
    const outputDir = path.join(__dirname, '..', 'exports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 導出為 JSON
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonPath = path.join(outputDir, `messages_${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(allMessages, null, 2));
    console.log(`\n已導出 ${allMessages.length} 則訊息到: ${jsonPath}`);

    // 導出為 CSV（可選）
    if (allMessages.length > 0) {
      const csvPath = path.join(outputDir, `messages_${timestamp}.csv`);
      const csvHeader = 'Timestamp,World ID,Conversation ID,Author,Author Name,Message UUID,Text\n';
      const csvRows = allMessages.map(msg => {
        const text = (msg.text || '').replace(/"/g, '""'); // 轉義雙引號
        return `"${msg.timestamp}","${msg.worldId || ''}","${msg.conversationId}","${msg.author}","${msg.authorName || ''}","${msg.messageUuid}","${text}"`;
      });
      fs.writeFileSync(csvPath, csvHeader + csvRows.join('\n'));
      console.log(`已導出 CSV 到: ${csvPath}`);
    }

    // 顯示統計資訊
    console.log('\n=== 導出統計 ===');
    console.log(`總訊息數: ${allMessages.length}`);
    if (allMessages.length > 0) {
      console.log(`最早訊息: ${allMessages[0].timestamp}`);
      console.log(`最新訊息: ${allMessages[allMessages.length - 1].timestamp}`);

      // 統計每個對話的訊息數
      const conversationCounts = new Map<number, number>();
      for (const msg of allMessages) {
        conversationCounts.set(
          msg.conversationId,
          (conversationCounts.get(msg.conversationId) || 0) + 1
        );
      }
      console.log(`對話總數: ${conversationCounts.size}`);
    }

  } catch (error) {
    console.error('導出失敗:', error);
    throw error;
  }
}

// 執行導出
exportMessages()
  .then(() => {
    console.log('\n導出完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n導出過程發生錯誤:', error);
    process.exit(1);
  });
