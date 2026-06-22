import config from '@retaino/eslint-config/next';

const eslintConfig = [
  {
    ignores: ['src/components/charts/**'],
  },
  ...config,
];

export default eslintConfig;
