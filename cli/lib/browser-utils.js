/**
 * 浏览器工具模块 - 处理浏览器相关操作
 */
const shell = require('shelljs');
const { logInfo } = require('./logger');

// 在默认浏览器中打开URL
const openBrowser = (url) => {
  logInfo(`Opening ${url} in default browser...`);

  const command = process.platform === 'win32' ? 'start' :
    process.platform === 'darwin' ? 'open' : 'xdg-open';

  shell.exec(`${command} ${url}`, { silent: true });
};

module.exports = {
  openBrowser
};
