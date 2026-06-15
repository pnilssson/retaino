import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const messages = {
  en: JSON.parse(readFileSync('messages/en.json', 'utf8')),
  sv: JSON.parse(readFileSync('messages/sv.json', 'utf8')),
};
const issues = [];

compareKeys('', messages.en, messages.sv);
scanMessages('messages/en.json', messages.en);
scanMessages('messages/sv.json', messages.sv, '', true);
scanTranslationFiles('../../packages/db/legal');
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
    scanMessageReferences(filePath, source);

    if (filePath.endsWith('.tsx')) {
      scanJsxText(filePath, source);
      scanHardcodedAttributes(filePath, source);
    }
  }
}

function scanMessages(filePath, value, prefix = '', checkSwedishText = false) {
  if (typeof value === 'string') {
    if (containsMojibake(value)) {
      issues.push(`${filePath}:${prefix} contains possible mojibake`);
    }

    if (checkSwedishText && containsLikelySwedishAsciiFallback(value)) {
      issues.push(`${filePath}:${prefix} contains possible Swedish ASCII fallback`);
    }

    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    scanMessages(
      filePath,
      child,
      prefix ? `${prefix}.${key}` : key,
      checkSwedishText,
    );
  }
}

function containsMojibake(value) {
  return /[\u00c2\u00c3\u00e2\ufffd]/.test(value);
}

function containsLikelySwedishAsciiFallback(value) {
  return /(?:\b(?:allmanna|for|forsok|oppna|sok|valj)\b|andring|atkomst|bitrades|installning|manad|marknadsforing|nodvandig|overfor)/i.test(
    value,
  );
}

function scanTranslationFiles(root) {
  for (const filePath of walkTranslationFiles(root)) {
    const source = readFileSync(filePath, 'utf8');
    const checkSwedishText = isSwedishTranslationFile(filePath);

    source.split(/\r?\n/).forEach((line, index) => {
      if (containsMojibake(line)) {
        issues.push(
          `${relative(process.cwd(), filePath)}:${index + 1} contains possible mojibake`,
        );
      }

      if (checkSwedishText && containsLikelySwedishAsciiFallback(line)) {
        issues.push(
          `${relative(process.cwd(), filePath)}:${index + 1} contains possible Swedish ASCII fallback`,
        );
      }
    });
  }
}

function walkTranslationFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return walkTranslationFiles(entryPath);
    }

    return /\.(?:mdx|ts)$/.test(entry.name) ? [entryPath] : [];
  });
}

function isSwedishTranslationFile(filePath) {
  const normalized = filePath.replaceAll('\\', '/');

  return normalized.includes('/sv/') || normalized.endsWith('/manifest.ts');
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return walk(entryPath);
    }

    return /\.tsx?$/.test(entry.name) ? [entryPath] : [];
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


function scanMessageReferences(filePath, source) {
  const declarations = [
    ...source.matchAll(
      /\b(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*['"]([^'"]+)['"]\s*\)/g,
    ),
  ];

  for (const [index, declaration] of declarations.entries()) {
    const [, variableName, namespace] = declaration;
    const start = declaration.index + declaration[0].length;
    const nextDeclaration = declarations
      .slice(index + 1)
      .find((candidate) => candidate[1] === variableName);
    const end = nextDeclaration?.index ?? source.length;
    const scopeSource = source.slice(start, end);
    const callPattern = new RegExp(
      `\\b${escapeRegExp(variableName)}\\(\\s*['"]([^'"]+)['"]`,
      'g',
    );

    for (const call of scopeSource.matchAll(callPattern)) {
      const key = `${namespace}.${call[1]}`;

      if (!hasMessagePath(messages.en, key)) {
        report(filePath, start + call.index, `missing English message ${key}`);
      }

      if (!hasMessagePath(messages.sv, key)) {
        report(filePath, start + call.index, `missing Swedish message ${key}`);
      }
    }
  }
}

function hasMessagePath(messageRoot, path) {
  let current = messageRoot;

  for (const part of path.split('.')) {
    if (!isPlainObject(current) || !(part in current)) {
      return false;
    }

    current = current[part];
  }

  return true;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
