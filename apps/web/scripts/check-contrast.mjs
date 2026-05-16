import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const cssPath = resolve('src/app/globals.css');
const css = readFileSync(cssPath, 'utf8');

const tokenSets = {
  dark: extractTokens('.dark'),
  light: extractTokens(':root'),
};

const checks = [
  {
    background: 'background',
    foreground: 'foreground',
    minimum: 4.5,
    name: 'foreground on background',
    type: 'text',
  },
  {
    background: 'background',
    foreground: 'muted-foreground',
    minimum: 4.5,
    name: 'muted foreground on background',
    type: 'text',
  },
  {
    background: 'card',
    foreground: 'card-foreground',
    minimum: 4.5,
    name: 'card foreground on card',
    type: 'text',
  },
  {
    background: 'primary',
    foreground: 'primary-foreground',
    minimum: 4.5,
    name: 'primary foreground on primary',
    type: 'text',
  },
  {
    background: 'background',
    foreground: 'destructive',
    minimum: 4.5,
    name: 'destructive text on background',
    type: 'text',
  },
  {
    background: 'destructive',
    foreground: 'destructive-foreground',
    minimum: 4.5,
    name: 'destructive foreground on destructive',
    type: 'text',
  },
  {
    background: 'background',
    foreground: 'input',
    minimum: 3,
    name: 'input boundary on background',
    type: 'non-text',
  },
  {
    background: 'background',
    foreground: 'ring',
    minimum: 3,
    name: 'focus ring on background',
    type: 'non-text',
  },
];

const failures = [];

for (const [mode, tokens] of Object.entries(tokenSets)) {
  for (const check of checks) {
    const foreground = tokens[check.foreground];
    const background = tokens[check.background];

    if (!foreground || !background) {
      failures.push(`${mode}: missing token for ${check.name}`);
      continue;
    }

    const contrast = contrastRatio(foreground, background);

    if (contrast < check.minimum) {
      failures.push(
        `${mode}: ${check.name} is ${contrast.toFixed(2)}:1, expected ${check.minimum}:1 for ${check.type}`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error('Contrast check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Contrast check passed.');

function extractTokens(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const blockMatch = css.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm'));

  if (!blockMatch) {
    throw new Error(`Could not find ${selector} block in ${cssPath}`);
  }

  return Object.fromEntries(
    [...blockMatch[1].matchAll(/--([a-z0-9-]+):\s*oklch\(([^)]+)\);/g)].map(
      ([, name, value]) => [name, parseOklch(value)],
    ),
  );
}

function parseOklch(value) {
  const [lightness, chroma, hue = '0'] = value.trim().split(/\s+/);

  return {
    chroma: Number(chroma),
    hue: Number(hue),
    lightness: Number(lightness),
  };
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(oklchToLinearRgb(foreground));
  const backgroundLuminance = relativeLuminance(oklchToLinearRgb(background));
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance([red, green, blue]) {
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function oklchToLinearRgb({ lightness, chroma, hue }) {
  const hueRadians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(hueRadians);
  const b = chroma * Math.sin(hueRadians);

  const long = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const medium = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const short = lightness - 0.0894841775 * a - 1.291485548 * b;

  const longCubed = long ** 3;
  const mediumCubed = medium ** 3;
  const shortCubed = short ** 3;

  return [
    clampLinear(
      4.0767416621 * longCubed -
        3.3077115913 * mediumCubed +
        0.2309699292 * shortCubed,
    ),
    clampLinear(
      -1.2684380046 * longCubed +
        2.6097574011 * mediumCubed -
        0.3413193965 * shortCubed,
    ),
    clampLinear(
      -0.0041960863 * longCubed -
        0.7034186147 * mediumCubed +
        1.707614701 * shortCubed,
    ),
  ];
}

function clampLinear(value) {
  return Math.min(1, Math.max(0, value));
}
