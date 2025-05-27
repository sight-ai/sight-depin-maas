#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');


const NATIVE_MODULES = [
  'level',
  'classic-level',
  'abstract-level',
  'level-supports',
  'level-transcoder',
  'module-error',
  'queue-microtask',
  'maybe-combine-errors',
  'node-gyp-build',
  'catering'
];

function installNativeModules(targetDir) {
  console.log(`🔧 Installing native modules to ${targetDir}...`);

  if (!fs.existsSync(targetDir)) {
    console.error(`❌ Target directory does not exist: ${targetDir}`);
    process.exit(1);
  }

  const sharedNodeModules = path.resolve(targetDir, '../../shared-node_modules');
  const localNodeModules = path.join(targetDir, 'node_modules');

  if (fs.existsSync(sharedNodeModules)) {
    console.log('📎 Using shared node_modules directory...');

    if (fs.existsSync(localNodeModules)) {
      fs.rmSync(localNodeModules, { recursive: true, force: true });
    }

    try {
      fs.symlinkSync(path.relative(targetDir, sharedNodeModules), localNodeModules, 'dir');
      console.log('✅ Created symlink to shared node_modules');
      return;
    } catch (error) {
      console.log('⚠️  Failed to create symlink, installing locally...');
    }
  }

  const packageJsonPath = path.join(targetDir, 'package.json');
  let packageJson = {
    name: "native-modules",
    version: "1.0.0",
    private: true,
    dependencies: {}
  };

  if (fs.existsSync(packageJsonPath)) {
    try {
      const existingPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      packageJson = { ...existingPackageJson };
      if (!packageJson.dependencies) {
        packageJson.dependencies = {};
      }
    } catch (error) {
      console.log('⚠️  Failed to parse existing package.json, creating new one');
    }
  }
  NATIVE_MODULES.forEach(module => {
    packageJson.dependencies[module] = 'latest';
  });

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log(`📦 Updated package.json with ${NATIVE_MODULES.length} native modules`);

  const lockfilePath = path.join(targetDir, 'pnpm-lock.yaml');
  if (!fs.existsSync(lockfilePath)) {
    fs.writeFileSync(lockfilePath, 'lockfileVersion: 5.4\n');
  }

  try {
    console.log('📥 Installing modules with pnpm...');
    execSync('pnpm install --prod --no-optional', {
      cwd: targetDir,
      stdio: 'inherit'
    });

    console.log('✅ Native modules installed successfully!');

    const nodeModulesPath = path.join(targetDir, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      const installedModules = fs.readdirSync(nodeModulesPath)
        .filter(name => !name.startsWith('.'))
        .filter(name => NATIVE_MODULES.includes(name));

      console.log(`📋 Installed modules: ${installedModules.join(', ')}`);

      const sharedNodeModules = path.resolve(targetDir, '../../shared-node_modules');
      if (!fs.existsSync(sharedNodeModules)) {
        console.log('🔄 Moving to shared location for future reuse...');
        fs.renameSync(nodeModulesPath, sharedNodeModules);
        fs.symlinkSync(path.relative(targetDir, sharedNodeModules), nodeModulesPath, 'dir');
        console.log('✅ Created shared node_modules directory');
      }
    }

  } catch (error) {
    console.error('❌ Failed to install native modules:', error.message);
    process.exit(1);
  }
}

const targetDir = process.argv[2];
if (!targetDir) {
  console.error('❌ Usage: node install-native-modules.js <target-directory>');
  process.exit(1);
}

installNativeModules(targetDir);
