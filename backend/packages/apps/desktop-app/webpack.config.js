const { composePlugins, withNx } = require('@nx/webpack');
const path = require('path');

// Nx plugins for webpack.
module.exports = composePlugins(withNx(), (config, { options }) => {
  // 设置别名
  config.resolve.alias = {
    ...config.resolve.alias,
    '@': path.resolve(__dirname, 'src/renderer'),
  };

  // 配置resolve fallbacks以避免Node.js模块错误
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "fs": false,
    "path": false,
    "os": false,
    "crypto": false,
    "stream": false,
    "util": false,
    "buffer": false,
    "events": false,
    "url": false,
    "querystring": false,
    "http": false,
    "https": false,
    "net": false,
    "tls": false,
    "child_process": false,
    "electron": false
  };

  // 外部化electron模块，避免打包
  config.externals = {
    ...config.externals,
    electron: 'commonjs electron'
  };

  // 开发模式下的配置
  if (options.configuration === 'development') {
    config.devtool = 'eval-source-map';
  }

  return config;
});
