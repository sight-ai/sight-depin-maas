module.exports = {
  appId: 'com.sightai.desktop',
  productName: 'SightAI Desktop',
  copyright: 'Copyright © 2025 SightAI',

  // 构建目录配置
  directories: {
    output: 'dist/packages/apps/desktop-app/release',
    buildResources: 'packages/apps/desktop-app/resources'
  },

  // 文件配置
  files: [
    'dist/packages/apps/desktop-app/**/*',
    '!dist/packages/apps/desktop-app/release/**/*'
  ],
  
  // 额外资源
  extraResources: [
    {
      from: 'packages/apps/desktop-app/resources',
      to: 'app',
      filter: ['**/*']
    }
  ],
  
  // macOS 配置
  mac: {
    category: 'public.app-category.productivity',
    icon: 'packages/apps/desktop-app/resources/icon-512.png',
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64']
      },
      {
        target: 'zip',
        arch: ['x64', 'arm64']
      }
    ],
    entitlements: null,
    entitlementsInherit: null,
    hardenedRuntime: false,
    gatekeeperAssess: false,
    notarize: false
  },
  
  // DMG 配置
  dmg: {
    title: 'SightAI Desktop',
    icon: 'packages/apps/desktop-app/resources/icon-512.png',
    background: null,
    contents: [
      {
        x: 130,
        y: 220
      },
      {
        x: 410,
        y: 220,
        type: 'link',
        path: '/Applications'
      }
    ],
    window: {
      width: 540,
      height: 380
    }
  },
  
  // Windows 配置（备用）
  win: {
    target: 'nsis',
    icon: 'packages/apps/desktop-app/resources/icon-512.png'
  },

  // Linux 配置（备用）
  linux: {
    target: 'AppImage',
    icon: 'packages/apps/desktop-app/resources/icon-512.png',
    category: 'Utility'
  },
  
  // 发布配置
  publish: null,
  
  // 压缩配置
  compression: 'normal',
  
  // 其他配置
  artifactName: '${productName}-${version}-${arch}.${ext}',
  
  // 构建前后脚本
  beforeBuild: null,
  afterSign: null
};
