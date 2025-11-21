export default {
  stories: [
    '../src/design-system/components/**/*.stories.@(js|jsx|ts|tsx)',
    '../src/design-system/style-guide/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-interactions',
    '@storybook/addon-themes',
    '@storybook/addon-docs',
    'storybook-dark-mode',
  ],
  framework: '@storybook/react',
  staticDirs: ['../public'],
}; 