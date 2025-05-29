#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 优化的构建脚本
 * 1. 清理不必要的文件
 * 2. 构建项目
 * 3. 使用pkg打包
 * 4. 使用UPX压缩
 */

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const DIST_PKG_DIR = path.join(PROJECT_ROOT, 'dist-pkg');

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    progress: '🔄'
  }[type] || '📋';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function executeCommand(command, description) {
  log(`${description}...`, 'progress');
  try {
    execSync(command, { 
      stdio: 'inherit', 
      cwd: PROJECT_ROOT,
      env: { ...process.env, NODE_ENV: 'production' }
    });
    log(`${description} completed`, 'success');
  } catch (error) {
    log(`${description} failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

function cleanupUnnecessaryFiles() {
  log('Cleaning up unnecessary files...', 'progress');
  
  const filesToRemove = [
    // 移除source maps
    'dist/**/*.map',
    'dist/**/*.d.ts.map',
    // 移除测试文件
    'dist/**/*.spec.js',
    'dist/**/*.test.js',
    // 移除开发工具文件
    'dist/**/webpack.config.js',
    'dist/**/jest.config.js',
    'dist/**/tsconfig.json',
    // 移除文档文件
    'dist/**/README.md',
    'dist/**/CHANGELOG.md',
    'dist/**/LICENSE',
    'dist/**/*.md',
  ];

  filesToRemove.forEach(pattern => {
    try {
      execSync(`find ${DIST_DIR} -name "${pattern.split('/').pop()}" -type f -delete`, { stdio: 'pipe' });
    } catch (error) {
      // 忽略找不到文件的错误
    }
  });

  log('Cleanup completed', 'success');
}

function optimizeNodeModules() {
  log('Optimizing node_modules...', 'progress');
  
  const nodeModulesPath = path.join(DIST_DIR, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    // 移除不必要的文件
    const unnecessaryPatterns = [
      '*/test',
      '*/tests', 
      '*/spec',
      '*/docs',
      '*/doc',
      '*/examples',
      '*/example',
      '*/benchmark',
      '*/benchmarks',
      '*/.github',
      '*/.vscode',
      '*/.idea',
      '*/coverage',
      '*/node_modules',
      '*/*.md',
      '*/*.txt',
      '*/*.log',
      '*/LICENSE*',
      '*/CHANGELOG*',
      '*/HISTORY*',
      '*/.eslintrc*',
      '*/.prettierrc*',
      '*/tsconfig.json',
      '*/webpack.config.js',
      '*/rollup.config.js',
      '*/jest.config.js',
      '*/.travis.yml',
      '*/.circleci',
      '*/.github',
      '*/Makefile',
      '*/Gruntfile.js',
      '*/gulpfile.js',
      '*/*.map'
    ];

    unnecessaryPatterns.forEach(pattern => {
      try {
        execSync(`find ${nodeModulesPath} -path "*/${pattern}" -exec rm -rf {} + 2>/dev/null || true`, { stdio: 'pipe' });
      } catch (error) {
        // 忽略错误
      }
    });
  }

  log('Node_modules optimization completed', 'success');
}

function getFileSize(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  const stats = fs.statSync(filePath);
  return (stats.size / 1024 / 1024).toFixed(2); // MB
}

function buildProject() {
  log('Building project...', 'progress');
  
  // 清理旧的构建文件
  if (fs.existsSync(DIST_DIR)) {
    execSync(`rm -rf ${DIST_DIR}`, { cwd: PROJECT_ROOT });
  }
  
  // 构建项目
  executeCommand('pnpm nx build cli-wrapper --configuration=production', 'Building CLI wrapper');
  
  // 清理和优化
  cleanupUnnecessaryFiles();
  optimizeNodeModules();
}

function packageWithPkg() {
  log('Packaging with pkg...', 'progress');
  
  // 清理旧的pkg输出
  if (fs.existsSync(DIST_PKG_DIR)) {
    execSync(`rm -rf ${DIST_PKG_DIR}`, { cwd: PROJECT_ROOT });
  }
  
  // 使用pkg打包，启用GZip压缩
  executeCommand('pnpm pkg --compress GZip .', 'Creating executable with pkg');
  
  const executablePath = path.join(DIST_PKG_DIR, 'sightai');
  const pkgSize = getFileSize(executablePath);
  log(`PKG executable size: ${pkgSize} MB`, 'info');
  
  return executablePath;
}

function compressWithUPX(executablePath) {
  log('Compressing with UPX...', 'progress');
  
  const upxScriptPath = path.join(__dirname, 'compress-with-upx.js');
  
  try {
    execSync(`node "${upxScriptPath}" "${executablePath}"`, { 
      stdio: 'inherit',
      cwd: PROJECT_ROOT 
    });
    
    const finalSize = getFileSize(executablePath);
    log(`Final executable size: ${finalSize} MB`, 'success');
    
  } catch (error) {
    log(`UPX compression failed: ${error.message}`, 'warning');
    log('Continuing with uncompressed executable...', 'info');
  }
}

function generateReport(startTime) {
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  const executablePath = path.join(DIST_PKG_DIR, 'sightai');
  const finalSize = getFileSize(executablePath);
  
  log('', 'info');
  log('🎉 Build completed successfully!', 'success');
  log(`⏱️  Total build time: ${duration} seconds`, 'info');
  log(`📦 Final executable: ${executablePath}`, 'info');
  log(`📊 Final size: ${finalSize} MB`, 'info');
  log('', 'info');
  log('💡 Tips for further optimization:', 'info');
  log('   - Remove unused dependencies from package.json', 'info');
  log('   - Use webpack-bundle-analyzer to identify large modules', 'info');
  log('   - Consider using dynamic imports for optional features', 'info');
}

function main() {
  const startTime = Date.now();
  
  log('🚀 Starting optimized build process...', 'info');
  log(`📁 Project root: ${PROJECT_ROOT}`, 'info');
  
  try {
    // 1. 构建项目
    buildProject();
    
    // 2. 使用pkg打包
    const executablePath = packageWithPkg();
    
    // 3. 使用UPX压缩
    compressWithUPX(executablePath);
    
    // 4. 生成报告
    generateReport(startTime);
    
  } catch (error) {
    log(`Build failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { 
  buildProject, 
  packageWithPkg, 
  compressWithUPX, 
  cleanupUnnecessaryFiles,
  optimizeNodeModules 
};
