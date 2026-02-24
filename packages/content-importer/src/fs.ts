import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

function isMarkdownFile(filePath: string): boolean {
  return filePath.endsWith('.md') || filePath.endsWith('.mdx');
}

export async function listMarkdownFiles(rootPath: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(currentPath: string): Promise<void> {
    const entries = await readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
        continue;
      }

      if (entry.isFile() && isMarkdownFile(entry.name)) {
        results.push(entryPath);
      }
    }
  }

  await walk(rootPath);

  return results.sort((a, b) => a.localeCompare(b));
}

export async function readUtf8File(filePath: string): Promise<string> {
  return readFile(filePath, 'utf8');
}

