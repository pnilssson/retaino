import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const messages = {
  en: JSON.parse(readFileSync('messages/en.json', 'utf8')),
  sv: JSON.parse(readFileSync('messages/sv.json', 'utf8')),
};
const issues = [];

compareKeys('', messages.en, messages.sv);
scanSource('src');

if (issues.length > 0) {
  console.error('i18n check failed:');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('i18n check passed.');

function compareKeys(prefix, english, swedish) {
  const englishKeys = Object.keys(english).sort();
  const swedishKeys = Object.keys(swedish).sort();
  const keySet = new Set([...englishKeys, ...swedishKeys]);

  for (const key of keySet) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (!(key in english)) {
      issues.push(`messages/sv.json has extra key ${path}`);
      continue;
    }

    if (!(key in swedish)) {
      issues.push(`messages/sv.json is missing key ${path}`);
      continue;
    }

    if (isPlainObject(english[key]) && isPlainObject(swedish[key])) {
      compareKeys(path, english[key], swedish[key]);
    }
  }
}

function scanSource(root) {
  for (const filePath of walk(root)) {
    if (!shouldScan(filePath)) {
      continue;
    }

    const source = readFileSync(filePath, 'utf8');
    scanJsxText(filePath, source);
    scanHardcodedAttributes(filePath, source);
  }
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return walk(entryPath);
    }

    return entry.name.endsWith('.tsx') ? [entryPath] : [];
  });
}

function shouldScan(filePath) {
  const normalized = filePath.replaceAll('\\', '/');

  if (
    normalized.includes('/components/ui/') ||
    normalized.includes('/hooks/') ||
    normalized.endsWith('.test.ts') ||
    normalized.endsWith('.test.tsx')
  ) {
    return false;
  }

  return true;
}

function scanJsxText(filePath, source) {
  const textMatches = source.matchAll(/>\s*([^<>{}\n][^<>{}]*)\s*</g);

  for (const match of textMatches) {
    const text = collapseWhitespace(match[1]);

    if (isAllowedLiteral(text) || looksLikeCode(text)) {
      continue;
    }

    report(filePath, match.index, `hardcoded JSX text "${text}"`);
  }
}

function scanHardcodedAttributes(filePath, source) {
  const attributeMatches = source.matchAll(
    /\b(aria-label|placeholder|title)=["']([^"']*[A-Za-zÅÄÖåäö][^"']*)["']/g,
  );

  for (const match of attributeMatches) {
    const [, attributeName, text] = match;

    if (isAllowedLiteral(text)) {
      continue;
    }

    report(filePath, match.index, `hardcoded ${attributeName} "${text}"`);
  }
}

function collapseWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function isAllowedLiteral(text) {
  if (!text) {
    return true;
  }

  return [
    /^Retaino$/,
    /^SMS$/,
    /^CSV$/,
    /^SEK$/,
    /^https?:\/\//,
    /^[\d\s.,:+-]+$/,
    /^\{[a-z_]+\}$/,
    /^[A-Z0-9_ -]+$/,
  ].some((pattern) => pattern.test(text));
}

function looksLikeCode(text) {
  return /[();=[\]?:]|=>|\b(?:const|let|return|Promise|Array|Record|Boolean|Math)\b/.test(
    text,
  );
}

function report(filePath, index, message) {
  const lineNumber = sourceLineAt(readFileSync(filePath, 'utf8'), index);
  issues.push(`${relative(process.cwd(), filePath)}:${lineNumber} ${message}`);
}

function sourceLineAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
