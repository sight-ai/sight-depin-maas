#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 递归复制目录
 * @param {string} src 源目录
 * @param {string} dest 目标目录
 */
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`Source directory does not exist: ${src}`);
    return false;
  }

  // 创建目标目录
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }

  return true;
}

/**
 * 主函数
 */
function main() {
  const rootDir = path.resolve(__dirname, '../../../..');
  const apiServerDistPath = path.join(rootDir, 'dist/packages/apps/api-server');
  const desktopResourcesPath = path.join(__dirname, '../resources');
  const backendDestPath = path.join(desktopResourcesPath, 'backend');

  console.log('🚀 开始复制后端服务到桌面应用资源目录...');
  console.log(`源路径: ${apiServerDistPath}`);
  console.log(`目标路径: ${backendDestPath}`);

  // 检查源目录是否存在
  if (!fs.existsSync(apiServerDistPath)) {
    console.error('❌ 后端服务构建文件不存在，请先运行: pnpm nx build api-server');
    process.exit(1);
  }

  // 清理目标目录
  if (fs.existsSync(backendDestPath)) {
    console.log('🧹 清理现有资源目录...');
    fs.rmSync(backendDestPath, { recursive: true, force: true });
  }

  // 复制后端服务
  const success = copyDir(apiServerDistPath, backendDestPath);
  
  if (success) {
    console.log('✅ 后端服务复制完成！');
    console.log(`📁 资源目录: ${backendDestPath}`);
    
    // 显示复制的文件信息
    const stats = fs.statSync(path.join(backendDestPath, 'main.js'));
    console.log(`📄 主文件大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  } else {
    console.error('❌ 复制失败');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { copyDir };
