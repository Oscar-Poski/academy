import type { ImportValidationMessage } from './types';

export function createMessage(
  level: ImportValidationMessage['level'],
  code: string,
  message: string,
  sourcePath: string | null
): ImportValidationMessage {
  return { level, code, message, sourcePath };
}

export function sortMessages(messages: ImportValidationMessage[]): ImportValidationMessage[] {
  return [...messages].sort((a, b) => {
    const sourceA = a.sourcePath ?? '';
    const sourceB = b.sourcePath ?? '';
    if (sourceA !== sourceB) return sourceA.localeCompare(sourceB);
    if (a.level !== b.level) return a.level.localeCompare(b.level);
    if (a.code !== b.code) return a.code.localeCompare(b.code);
    return a.message.localeCompare(b.message);
  });
}

export function jsonStableString(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => jsonStableString(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${jsonStableString(record[key])}`).join(',')}}`;
}

