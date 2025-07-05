const { composePlugins, withNx } = require('@nx/webpack');
const path = require('path');

module.exports = composePlugins(withNx(), (config) => {
  // 配置多入口点：主进程和预加载脚本
  config.entry = {
    main: path.resolve(__dirname, 'src/main/main.ts'),
    preload: path.resolve(__dirname, 'src/main/preload.ts'),
  };

  // 配置 Electron 主进程构建
  config.target = 'electron-main';
  config.node = {
    __dirname: false,
    __filename: false,
  };

  // 外部依赖
  config.externals = {
    electron: 'commonjs electron',
    canvas: 'commonjs canvas',
  };

  // 输出配置
  config.output = {
    ...config.output,
    filename: '[name].js', // 使用 [name] 来生成 main.js 和 preload.js
    libraryTarget: 'commonjs2',
  };

  return config;
});
