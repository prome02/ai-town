/**
 * 導入對話訊息到 Convex 資料庫
 * 使用方式: node scripts/importMessages.js <json-file-path>
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

async function importMessages(jsonFilePath) {
  console.log('🔗 連接到 Convex:', CONVEX_URL);
  const client = new ConvexHttpClient(CONVEX_URL);

  try {
    // 讀取 JSON 文件
    if (!fs.existsSync(jsonFilePath)) {
      throw new Error(`找不到文件: ${jsonFilePath}`);
    }

    console.log('\n📂 讀取文件:', jsonFilePath);
    const fileContent = fs.readFileSync(jsonFilePath, 'utf-8');
    const messages = JSON.parse(fileContent);

    if (!Array.isArray(messages) || messages.length === 0) {
      console.log('⚠️  文件中沒有訊息資料');
      return;
    }

    console.log(`\n📥 準備導入 ${messages.length.toLocaleString()} 則訊息...\n`);

    // 按時間排序（確保按順序導入）
    messages.sort((a, b) => a.creationTime - b.creationTime);

    // 批量導入
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const msg of messages) {
      try {
        // 需要先確保 world 存在
        if (!msg.worldId) {
          console.log(`  ⚠️  跳過無 worldId 的訊息: ${msg.id}`);
          skipped++;
          continue;
        }

        // 使用 writeMessage mutation 導入
        await client.mutation('messages:writeMessage', {
          worldId: msg.worldId,
          conversationId: msg.conversationId,
          messageUuid: msg.messageUuid || `imported-${Date.now()}-${imported}`,
          playerId: msg.author,
          text: msg.text,
        });

        imported++;

        // 每 100 筆顯示進度
        if (imported % 100 === 0) {
          console.log(`  已導入 ${imported}/${messages.length} 則訊息...`);
        }
      } catch (error) {
        errors++;
        if (errors <= 10) {
          console.log(`  ❌ 導入失敗: ${error.message}`);
        }
      }
    }

    console.log('\n📊 導入統計:');
    console.log(`   成功導入: ${imported.toLocaleString()} 則`);
    console.log(`   跳過: ${skipped.toLocaleString()} 則`);
    console.log(`   錯誤: ${errors.toLocaleString()} 則`);

    if (errors > 10) {
      console.log(`   （只顯示前 10 個錯誤）`);
    }

    console.log('\n✨ 導入完成！');

  } catch (error) {
    console.error('\n❌ 導入失敗:', error.message);
    if (error.stack) {
      console.error('\n詳細錯誤:', error.stack);
    }
    throw error;
  }
}

// 主程序
console.log('🚀 AI Town 對話訊息導入工具');
console.log('=' .repeat(50));

// 檢查命令行參數
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('\n❌ 錯誤: 請提供 JSON 文件路徑');
  console.log('\n使用方式:');
  console.log('  node scripts/importMessages.js <json-file-path>');
  console.log('\n範例:');
  console.log('  node scripts/importMessages.js exports/messages_2024-11-18.json');
  console.log('  npm run db:import -- exports/messages_2024-11-18.json');
  process.exit(1);
}

const jsonFilePath = path.resolve(args[0]);

importMessages(jsonFilePath)
  .then(() => {
    console.log('\n✅ 程序執行完畢');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 程序執行失敗:', error);
    process.exit(1);
  });
