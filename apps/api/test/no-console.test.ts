import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('API source logging', () => {
  it('does not use console logging in runtime source files', () => {
    const matches: string[] = [];

    for (const file of sourceFiles(join(process.cwd(), 'src'))) {
      const text = readFileSync(file, 'utf8');
      const lines = text.split(/\r?\n/);

      lines.forEach((line, index) => {
        if (/console\.(log|warn|error|info|debug)\b/.test(line)) {
          matches.push(`${file}:${index + 1}`);
        }
      });
    }

    expect(matches).toEqual([]);
  });
});

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      return sourceFiles(path);
    }

    return path.endsWith('.ts') ? [path] : [];
  });
}
