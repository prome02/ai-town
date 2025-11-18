/**
 * 從 Markdown 文件構建角色配置
 *
 * 讀取 data/characters/*.md 並生成 data/characters/index.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CharacterConfig {
  name: string;
  character: string;
  identity: string;
  plan: string;
}

/**
 * 解析 Markdown 格式的角色配置
 */
function parseCharacterMarkdown(markdown: string, filename: string): CharacterConfig {
  const lines = markdown.split('\n');

  let name = '';
  let character = '';
  let identity = '';
  let plan = '';

  let currentSection: 'none' | 'character' | 'identity' | 'plan' = 'none';
  let contentBuffer: string[] = [];

  const saveSection = () => {
    if (currentSection === 'none' || contentBuffer.length === 0) {
      return;
    }

    const content = contentBuffer.join('\n').trim();

    switch (currentSection) {
      case 'character':
        character = content;
        break;
      case 'identity':
        identity = content;
        break;
      case 'plan':
        plan = content;
        break;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // H1 標題 = 角色名稱
    if (trimmed.startsWith('# ')) {
      name = trimmed.substring(2).trim();
      continue;
    }

    // H2 標題 = 區段開始
    if (trimmed.startsWith('## ')) {
      saveSection();

      const sectionTitle = trimmed.substring(3).trim().toLowerCase();
      contentBuffer = [];

      if (sectionTitle === 'character') {
        currentSection = 'character';
      } else if (sectionTitle === 'identity') {
        currentSection = 'identity';
      } else if (sectionTitle === 'plan') {
        currentSection = 'plan';
      } else {
        currentSection = 'none';
      }
      continue;
    }

    // 收集內容
    if (trimmed === '' && contentBuffer.length > 0) {
      contentBuffer.push('');
    } else if (trimmed !== '') {
      contentBuffer.push(trimmed);
    }
  }

  // 保存最後一個區段
  saveSection();

  // 驗證
  if (!name) throw new Error(`${filename}: Missing character name (H1 heading)`);
  if (!character) throw new Error(`${filename}: Missing character sprite ID`);
  if (!identity) throw new Error(`${filename}: Missing identity description`);
  if (!plan) throw new Error(`${filename}: Missing plan`);

  return { name, character, identity, plan };
}

/**
 * 主函數
 */
async function buildCharacters() {
  const charactersDir = path.join(__dirname, '..', 'data', 'characters');
  const outputFile = path.join(charactersDir, 'index.ts');

  console.log('🔍 掃描角色配置文件...');

  // 讀取所有 .md 文件
  const files = fs.readdirSync(charactersDir)
    .filter(f => f.endsWith('.md'))
    .sort();

  if (files.length === 0) {
    console.error('❌ 未找到任何 .md 文件');
    process.exit(1);
  }

  console.log(`📄 找到 ${files.length} 個角色文件:`);
  files.forEach(f => console.log(`   - ${f}`));

  // 解析所有文件
  const characters: CharacterConfig[] = [];

  for (const file of files) {
    const filePath = path.join(charactersDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    try {
      const config = parseCharacterMarkdown(content, file);
      characters.push(config);
      console.log(`✅ ${file} → ${config.name}`);
    } catch (error) {
      console.error(`❌ ${file}: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  // 生成 TypeScript 代碼
  console.log('\n📝 生成 index.ts...');

  const imports = `/**
 * 角色配置聚合
 *
 * ⚠️ 此文件由 scripts/buildCharacters.ts 自動生成
 * 請勿手動編輯！編輯 .md 文件後運行 npm run build:characters
 */

import type { CharacterConfig } from './parseMarkdown';
`;

  const comment = `/**
 * 所有角色配置
 *
 * 從 Markdown 文件自動生成
 * 來源: data/characters/*.md
 *
 * 最後更新: ${new Date().toISOString()}
 */`;

  const charactersCode = characters.map(c => {
    // 轉義反引號和 ${
    const escapeTemplate = (str: string) =>
      str.replace(/`/g, '\\`').replace(/\$/g, '\\$');

    return `  {
    name: '${c.name}',
    character: '${c.character}',
    identity: \`${escapeTemplate(c.identity)}\`,
    plan: '${c.plan.replace(/'/g, "\\'")}',
  }`;
  }).join(',\n');

  const output = `${imports}
${comment}
export const Descriptions: CharacterConfig[] = [
${charactersCode},
];

export type { CharacterConfig };
`;

  fs.writeFileSync(outputFile, output, 'utf-8');

  console.log(`✅ 已生成: ${outputFile}`);
  console.log(`\n📊 統計:`);
  console.log(`   角色總數: ${characters.length}`);
  console.log(`   文件大小: ${(output.length / 1024).toFixed(2)} KB`);
  console.log('\n✨ 構建完成！');
}

// 執行
buildCharacters().catch(error => {
  console.error('\n💥 構建失敗:', error);
  process.exit(1);
});
