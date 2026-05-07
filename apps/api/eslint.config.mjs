import config from '@retaino/eslint-config/base';

export default [
  ...config,
  {
    ignores: ['.wrangler/**'],
  },
];
