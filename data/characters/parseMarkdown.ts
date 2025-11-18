/**
 * Markdown 角色配置解析器
 *
 * 格式規範：
 * # 角色名稱
 * ## Character
 * sprite_id
 *
 * ## Identity
 * 角色身份描述...
 *
 * ## Plan
 * 角色目標...
 */

export interface CharacterConfig {
  name: string;
  character: string;
  identity: string;
  plan: string;
}

/**
 * 解析 Markdown 格式的角色配置
 */
export function parseCharacterMarkdown(markdown: string): CharacterConfig {
  const lines = markdown.split('\n');

  let name = '';
  let character = '';
  let identity = '';
  let plan = '';

  let currentSection: 'none' | 'character' | 'identity' | 'plan' = 'none';
  let contentBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // H1 標題 = 角色名稱
    if (line.startsWith('# ')) {
      name = line.substring(2).trim();
      continue;
    }

    // H2 標題 = 區段開始
    if (line.startsWith('## ')) {
      // 保存上一個區段的內容
      saveSection(currentSection, contentBuffer, { character, identity, plan });

      // 開始新區段
      const sectionTitle = line.substring(3).trim().toLowerCase();
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

    // 空行跳過（但保留在內容中作為段落分隔）
    if (line === '' && contentBuffer.length > 0) {
      contentBuffer.push('');
      continue;
    }

    // 收集內容
    if (line !== '') {
      contentBuffer.push(line);
    }
  }

  // 保存最後一個區段
  const result = saveSection(currentSection, contentBuffer, { character, identity, plan });
  character = result.character;
  identity = result.identity;
  plan = result.plan;

  // 驗證必填字段
  if (!name) {
    throw new Error('Missing character name (H1 heading)');
  }
  if (!character) {
    throw new Error(`Character "${name}": Missing character sprite ID (## Character section)`);
  }
  if (!identity) {
    throw new Error(`Character "${name}": Missing identity description (## Identity section)`);
  }
  if (!plan) {
    throw new Error(`Character "${name}": Missing plan (## Plan section)`);
  }

  return {
    name,
    character,
    identity,
    plan,
  };
}

/**
 * 保存區段內容
 */
function saveSection(
  section: 'none' | 'character' | 'identity' | 'plan',
  buffer: string[],
  current: { character: string; identity: string; plan: string }
): { character: string; identity: string; plan: string } {
  if (section === 'none' || buffer.length === 0) {
    return current;
  }

  const content = buffer.join('\n').trim();

  switch (section) {
    case 'character':
      return { ...current, character: content };
    case 'identity':
      return { ...current, identity: content };
    case 'plan':
      return { ...current, plan: content };
    default:
      return current;
  }
}

/**
 * 批量解析多個 Markdown 文件
 */
export function parseCharacterFiles(files: Record<string, string>): CharacterConfig[] {
  return Object.entries(files).map(([filename, content]) => {
    try {
      return parseCharacterMarkdown(content);
    } catch (error) {
      throw new Error(`Error parsing ${filename}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}
