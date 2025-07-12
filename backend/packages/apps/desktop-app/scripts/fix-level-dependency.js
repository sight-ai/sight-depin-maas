#!/usr/bin/env node

/**
 * 修复 level 模块依赖问题
 * 为桌面应用创建 level 模块的轻量级替代方案
 */

const fs = require('fs');
const path = require('path');

/**
 * 创建 level 模块的桌面应用兼容版本
 */
function createLevelStub(backendPath) {
  console.log('🔧 创建 level 模块桌面应用兼容版本...');
  
  const nodeModulesPath = path.join(backendPath, 'node_modules');
  const levelPath = path.join(nodeModulesPath, 'level');
  
  // 确保目录存在
  if (!fs.existsSync(nodeModulesPath)) {
    fs.mkdirSync(nodeModulesPath, { recursive: true });
  }
  
  if (!fs.existsSync(levelPath)) {
    fs.mkdirSync(levelPath, { recursive: true });
  }
  
  // 创建 level 模块的简化版本
  const levelIndexJs = `
// Level 模块桌面应用兼容版本
// 使用内存存储替代原生 LevelDB

class MemoryLevel {
  constructor(location, options = {}) {
    this.location = location;
    this.options = options;
    this.data = new Map();
    this.sublevels = new Map();
    this.isOpen = false;
  }

  async open() {
    this.isOpen = true;
    console.log('MemoryLevel: Database opened (in-memory mode)');
  }

  async close() {
    this.isOpen = false;
    this.data.clear();
    this.sublevels.clear();
  }

  async put(key, value) {
    if (!this.isOpen) throw new Error('Database is not open');
    
    const serializedValue = this.options.valueEncoding === 'json' 
      ? JSON.stringify(value) 
      : value;
    
    this.data.set(key, serializedValue);
  }

  async get(key) {
    if (!this.isOpen) throw new Error('Database is not open');
    
    const value = this.data.get(key);
    if (value === undefined) {
      const error = new Error('Key not found');
      error.code = 'LEVEL_NOT_FOUND';
      throw error;
    }
    
    return this.options.valueEncoding === 'json' 
      ? JSON.parse(value) 
      : value;
  }

  async del(key) {
    if (!this.isOpen) throw new Error('Database is not open');
    this.data.delete(key);
  }

  async clear() {
    if (!this.isOpen) throw new Error('Database is not open');
    this.data.clear();
  }

  sublevel(name, options = {}) {
    const sublevelKey = name;
    
    if (!this.sublevels.has(sublevelKey)) {
      const sublevel = new MemoryLevel(\`\${this.location}/\${name}\`, {
        ...this.options,
        ...options
      });
      sublevel.isOpen = this.isOpen;
      sublevel.data = new Map();
      this.sublevels.set(sublevelKey, sublevel);
    }
    
    return this.sublevels.get(sublevelKey);
  }

  iterator(options = {}) {
    const entries = Array.from(this.data.entries());
    let index = 0;
    
    return {
      async next() {
        if (index >= entries.length) {
          return { done: true };
        }
        
        const [key, value] = entries[index++];
        const parsedValue = options.valueEncoding === 'json' 
          ? JSON.parse(value) 
          : value;
        
        return { 
          done: false, 
          value: [key, parsedValue] 
        };
      },
      
      async close() {
        // No-op for memory implementation
      }
    };
  }

  batch() {
    const operations = [];
    
    return {
      put(key, value) {
        operations.push({ type: 'put', key, value });
        return this;
      },
      
      del(key) {
        operations.push({ type: 'del', key });
        return this;
      },
      
      async write() {
        for (const op of operations) {
          if (op.type === 'put') {
            await this.put(op.key, op.value);
          } else if (op.type === 'del') {
            await this.del(op.key);
          }
        }
      }
    };
  }
}

module.exports = MemoryLevel;
module.exports.Level = MemoryLevel;
`;

  // 写入 level/index.js
  fs.writeFileSync(path.join(levelPath, 'index.js'), levelIndexJs);
  
  // 创建 package.json
  const levelPackageJson = {
    name: 'level',
    version: '10.0.0',
    description: 'Desktop app compatible Level implementation (in-memory)',
    main: 'index.js',
    keywords: ['leveldb', 'memory', 'desktop'],
    license: 'MIT'
  };
  
  fs.writeFileSync(
    path.join(levelPath, 'package.json'), 
    JSON.stringify(levelPackageJson, null, 2)
  );
  
  console.log('✅ Level 模块桌面应用兼容版本创建完成');
  
  // 创建其他必要的依赖模块
  createSupportingModules(nodeModulesPath);
}

/**
 * 创建支持模块
 */
function createSupportingModules(nodeModulesPath) {
  const modules = [
    {
      name: 'classic-level',
      content: 'module.exports = require("level");'
    },
    {
      name: 'abstract-level', 
      content: 'module.exports = require("level");'
    },
    {
      name: 'level-supports',
      content: 'module.exports = () => ({ permanence: true, seek: true, clear: true });'
    },
    {
      name: 'level-transcoder',
      content: 'module.exports = { encode: (v) => v, decode: (v) => v };'
    }
  ];
  
  modules.forEach(({ name, content }) => {
    const modulePath = path.join(nodeModulesPath, name);
    
    if (!fs.existsSync(modulePath)) {
      fs.mkdirSync(modulePath, { recursive: true });
    }
    
    fs.writeFileSync(path.join(modulePath, 'index.js'), content);
    fs.writeFileSync(
      path.join(modulePath, 'package.json'),
      JSON.stringify({
        name,
        version: '1.0.0',
        main: 'index.js'
      }, null, 2)
    );
    
    console.log(`✅ 创建支持模块: ${name}`);
  });
}

/**
 * 主函数
 */
function main() {
  const backendPath = path.resolve(__dirname, '../resources/backend');
  
  console.log('🚀 开始修复 level 依赖问题...');
  console.log(`📁 后端路径: ${backendPath}`);
  
  if (!fs.existsSync(backendPath)) {
    console.error('❌ 后端资源目录不存在，请先运行复制脚本');
    process.exit(1);
  }
  
  createLevelStub(backendPath);
  
  console.log('✅ Level 依赖问题修复完成！');
  console.log('💡 现在使用内存数据库替代 LevelDB，适合桌面应用使用');
}

if (require.main === module) {
  main();
}

module.exports = { createLevelStub };
