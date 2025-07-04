const { composePlugins, withNx } = require('@nx/webpack');
const path = require('path');

// Nx plugins for webpack.
module.exports = composePlugins(withNx(), (config, { options }) => {
  // 设置别名
  config.resolve.alias = {
    ...config.resolve.alias,
    '@': path.resolve(__dirname, 'src/renderer'),
  };

  // 开发模式下的配置
  if (options.configuration === 'development') {
    config.devtool = 'eval-source-map';
  }

  return config;
});
