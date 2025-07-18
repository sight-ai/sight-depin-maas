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

    // 复制必要的 level 模块
    console.log('📦 复制 level 相关模块...');
    const nodeModulesDestPath = path.join(backendDestPath, 'node_modules');

    // 确保 node_modules 目录存在
    if (!fs.existsSync(nodeModulesDestPath)) {
      fs.mkdirSync(nodeModulesDestPath, { recursive: true });
    }

    // 需要复制的模块列表
    const requiredModules = [
      'level',
      'classic-level',
      'abstract-level',
      'level-supports',
      'level-transcoder',
      'module-error',
      'queue-microtask',
      'catering',
      'napi-macros',
      'node-gyp-build',
      'browser-level',
      'level-concat-iterator',
      'maybe-combine-errors'
    ];

    const rootNodeModulesPath = path.join(rootDir, 'node_modules');

    for (const moduleName of requiredModules) {
      // 首先尝试直接路径（符号链接）
      let srcModulePath = path.join(rootNodeModulesPath, moduleName);
      const destModulePath = path.join(nodeModulesDestPath, moduleName);

      if (fs.existsSync(srcModulePath)) {
        console.log(`  📋 复制模块: ${moduleName}`);
        copyDir(srcModulePath, destModulePath);
      } else {
        // 如果符号链接不存在，尝试从 .pnpm 目录查找
        const pnpmPath = path.join(rootNodeModulesPath, '.pnpm');
        if (fs.existsSync(pnpmPath)) {
          const pnpmDirs = fs.readdirSync(pnpmPath);
          const moduleDir = pnpmDirs.find(dir => dir.startsWith(moduleName + '@'));

          if (moduleDir) {
            srcModulePath = path.join(pnpmPath, moduleDir, 'node_modules', moduleName);
            if (fs.existsSync(srcModulePath)) {
              console.log(`  📋 复制模块 (从 .pnpm): ${moduleName}`);
              copyDir(srcModulePath, destModulePath);
            } else {
              console.warn(`  ⚠️  模块不存在: ${moduleName}`);
            }
          } else {
            console.warn(`  ⚠️  模块不存在: ${moduleName}`);
          }
        } else {
          console.warn(`  ⚠️  模块不存在: ${moduleName}`);
        }
      }
    }

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
