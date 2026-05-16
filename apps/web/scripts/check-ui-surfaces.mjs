import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const roots = ['src/features'];
const surfaceTags = ['AppPageItem', 'OnboardingItem'];
const issues = [];

for (const root of roots) {
  for (const filePath of walk(root)) {
    checkFile(filePath);
  }
}

if (issues.length > 0) {
  console.error('UI surface audit failed:');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('UI surface audit passed.');

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return walk(entryPath);
    }

    return entry.name.endsWith('.tsx') ? [entryPath] : [];
  });
}

function checkFile(filePath) {
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  const surfaceStack = [];
  let pendingSurfaceTag = null;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    if (surfaceStack.length > 0) {
      const activeSurface = surfaceStack.at(-1);

      for (const surfaceTag of surfaceTags) {
        if (opensTag(line, surfaceTag)) {
          report(filePath, lineNumber, `${surfaceTag} inside ${activeSurface}`);
        }
      }

      if (/<Alert(?:\s|>|$)/.test(line)) {
        report(filePath, lineNumber, `Alert inside ${activeSurface}`);
      }

      for (const className of classNamesIn(line)) {
        if (isCardLikeWrapper(className)) {
          report(
            filePath,
            lineNumber,
            `card-like wrapper inside ${activeSurface}`,
          );
        }
      }
    }

    for (const surfaceTag of surfaceTags) {
      if (opensTag(line, surfaceTag) && !line.includes('/>')) {
        surfaceStack.push(surfaceTag);

        if (!line.includes('>')) {
          pendingSurfaceTag = surfaceTag;
        }
      }
    }

    if (pendingSurfaceTag && line.includes('/>')) {
      const indexInStack = surfaceStack.lastIndexOf(pendingSurfaceTag);

      if (indexInStack >= 0) {
        surfaceStack.splice(indexInStack, 1);
      }

      pendingSurfaceTag = null;
    } else if (pendingSurfaceTag && line.includes('>')) {
      pendingSurfaceTag = null;
    }

    for (const surfaceTag of surfaceTags) {
      if (new RegExp(`</${surfaceTag}>`).test(line)) {
        const indexInStack = surfaceStack.lastIndexOf(surfaceTag);

        if (indexInStack >= 0) {
          surfaceStack.splice(indexInStack, 1);
        }
      }
    }
  });
}

function opensTag(line, tagName) {
  return new RegExp(`<${tagName}(?:\\s|>|$)`).test(line);
}

function classNamesIn(line) {
  return [...line.matchAll(/className=["'`]([^"'`]+)["'`]/g)].map(
    ([, className]) => className,
  );
}

function isCardLikeWrapper(className) {
  const normalized = className.replace(/\s+/g, ' ');

  if (normalized.includes('border-dashed') || normalized.includes('focus-within')) {
    return false;
  }

  if (/\b(?:shadow-|ring-1|bg-card)\S*/.test(normalized)) {
    return true;
  }

  const hasLargeRadius = /\brounded-(?:lg|xl|\[[^\]]+\])\b/.test(normalized);
  const hasSurfaceBoundary = /\b(?:border|border-\S+|bg-(?!muted|transparent)\S+)/.test(
    normalized,
  );
  const hasPanelPadding = /\bp[xytrbl]?-\d/.test(normalized);

  return hasLargeRadius && hasSurfaceBoundary && hasPanelPadding;
}

function report(filePath, lineNumber, message) {
  issues.push(`${relative(process.cwd(), filePath)}:${lineNumber} ${message}`);
}
