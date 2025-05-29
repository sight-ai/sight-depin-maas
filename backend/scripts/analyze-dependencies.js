#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 依赖分析脚本
 * 分析项目中的大依赖，帮助识别可以优化的部分
 */

function getDirSize(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  
  let totalSize = 0;
  
  function calculateSize(currentPath) {
    const stats = fs.statSync(currentPath);
    
    if (stats.isFile()) {
      totalSize += stats.size;
    } else if (stats.isDirectory()) {
      const files = fs.readdirSync(currentPath);
      files.forEach(file => {
        calculateSize(path.join(currentPath, file));
      });
    }
  }
  
  try {
    calculateSize(dirPath);
  } catch (error) {
    // 忽略权限错误等
  }
  
  return totalSize;
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeNodeModules() {
  console.log('📦 Analyzing node_modules dependencies...\n');
  
  const nodeModulesPath = path.resolve('node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('❌ node_modules directory not found');
    return;
  }
  
  const dependencies = [];
  const dirs = fs.readdirSync(nodeModulesPath);
  
  dirs.forEach(dir => {
    if (dir.startsWith('.')) return;
    
    const dirPath = path.join(nodeModulesPath, dir);
    const stats = fs.statSync(dirPath);
    
    if (stats.isDirectory()) {
      const size = getDirSize(dirPath);
      dependencies.push({
        name: dir,
        size: size,
        formattedSize: formatSize(size)
      });
    }
  });
  
  // 按大小排序
  dependencies.sort((a, b) => b.size - a.size);
  
  console.log('🔍 Top 20 largest dependencies:');
  console.log('─'.repeat(60));
  
  dependencies.slice(0, 20).forEach((dep, index) => {
    console.log(`${(index + 1).toString().padStart(2)}. ${dep.name.padEnd(30)} ${dep.formattedSize.padStart(10)}`);
  });
  
  const totalSize = dependencies.reduce((sum, dep) => sum + dep.size, 0);
  console.log('─'.repeat(60));
  console.log(`Total node_modules size: ${formatSize(totalSize)}`);
  
  return dependencies;
}

function analyzeDistDirectory() {
  console.log('\n📁 Analyzing dist directory...\n');
  
  const distPath = path.resolve('dist');
  if (!fs.existsSync(distPath)) {
    console.log('❌ dist directory not found');
    return;
  }
  
  const distSize = getDirSize(distPath);
  console.log(`📊 Total dist size: ${formatSize(distSize)}`);
  
  // 分析dist中的子目录
  const subDirs = [];
  
  function analyzeSubDir(currentPath, relativePath = '') {
    const items = fs.readdirSync(currentPath);
    
    items.forEach(item => {
      const itemPath = path.join(currentPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        const size = getDirSize(itemPath);
        const relPath = path.join(relativePath, item);
        subDirs.push({
          path: relPath,
          size: size,
          formattedSize: formatSize(size)
        });
        
        // 递归分析子目录（限制深度）
        if (relativePath.split(path.sep).length < 3) {
          analyzeSubDir(itemPath, relPath);
        }
      }
    });
  }
  
  analyzeSubDir(distPath);
  
  // 按大小排序
  subDirs.sort((a, b) => b.size - a.size);
  
  console.log('\n🔍 Largest directories in dist:');
  console.log('─'.repeat(60));
  
  subDirs.slice(0, 15).forEach((dir, index) => {
    console.log(`${(index + 1).toString().padStart(2)}. ${dir.path.padEnd(35)} ${dir.formattedSize.padStart(10)}`);
  });
}

function suggestOptimizations(dependencies) {
  console.log('\n💡 Optimization suggestions:\n');
  
  const largeDeps = dependencies.filter(dep => dep.size > 10 * 1024 * 1024); // > 10MB
  
  if (largeDeps.length > 0) {
    console.log('🔴 Large dependencies (>10MB) to consider optimizing:');
    largeDeps.forEach(dep => {
      console.log(`   - ${dep.name} (${dep.formattedSize})`);
      
      // 提供具体的优化建议
      const suggestions = getOptimizationSuggestions(dep.name);
      if (suggestions.length > 0) {
        suggestions.forEach(suggestion => {
          console.log(`     💡 ${suggestion}`);
        });
      }
    });
  }
  
  console.log('\n🟡 General optimization strategies:');
  console.log('   - Use dynamic imports for optional features');
  console.log('   - Replace heavy libraries with lighter alternatives');
  console.log('   - Use webpack externals for runtime dependencies');
  console.log('   - Enable tree shaking in webpack configuration');
  console.log('   - Remove unused dependencies from package.json');
  console.log('   - Use webpack-bundle-analyzer to identify duplicate code');
}

function getOptimizationSuggestions(depName) {
  const suggestions = {
    'lodash': ['Use lodash-es or individual lodash functions', 'Consider ramda as a lighter alternative'],
    'moment': ['Replace with date-fns or dayjs for smaller bundle size'],
    'axios': ['Consider using native fetch API for simple requests'],
    'express': ['Use fastify for better performance and smaller size'],
    'webpack': ['Should be in devDependencies only'],
    'typescript': ['Should be in devDependencies only'],
    '@types': ['All @types packages should be in devDependencies'],
    'eslint': ['Should be in devDependencies only'],
    'jest': ['Should be in devDependencies only'],
    'prettier': ['Should be in devDependencies only'],
    'nx': ['Consider removing if not actively used'],
    'ethers': ['Large library, consider using only needed modules'],
    'openai': ['Large library, ensure only necessary features are used'],
    'telegraf': ['Consider lighter telegram bot alternatives if possible']
  };
  
  for (const [key, suggestion] of Object.entries(suggestions)) {
    if (depName.includes(key)) {
      return suggestion;
    }
  }
  
  return [];
}

function checkPackageJson() {
  console.log('\n📋 Checking package.json for optimization opportunities...\n');
  
  const packageJsonPath = path.resolve('package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const deps = packageJson.dependencies || {};
  const devDeps = packageJson.devDependencies || {};
  
  // 检查是否有依赖应该移到devDependencies
  const shouldBeDevDeps = ['webpack', 'typescript', 'eslint', 'jest', 'prettier', '@types/', 'ts-', 'babel'];
  
  const misplacedDeps = [];
  Object.keys(deps).forEach(dep => {
    if (shouldBeDevDeps.some(pattern => dep.includes(pattern))) {
      misplacedDeps.push(dep);
    }
  });
  
  if (misplacedDeps.length > 0) {
    console.log('⚠️  Dependencies that should be in devDependencies:');
    misplacedDeps.forEach(dep => {
      console.log(`   - ${dep}`);
    });
  }
  
  console.log(`📊 Total dependencies: ${Object.keys(deps).length}`);
  console.log(`📊 Total devDependencies: ${Object.keys(devDeps).length}`);
}

function main() {
  console.log('🔍 Dependency Analysis Report');
  console.log('═'.repeat(60));
  
  try {
    const dependencies = analyzeNodeModules();
    analyzeDistDirectory();
    checkPackageJson();
    
    if (dependencies) {
      suggestOptimizations(dependencies);
    }
    
    console.log('\n✅ Analysis completed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Run: pnpm run analyze:bundle');
    console.log('   2. Run: pnpm run build:optimized');
    console.log('   3. Compare before/after sizes');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { 
  analyzeNodeModules, 
  analyzeDistDirectory, 
  suggestOptimizations,
  checkPackageJson 
};
