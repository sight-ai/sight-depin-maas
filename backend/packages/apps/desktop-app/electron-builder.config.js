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
    {
      from: 'dist/packages/apps/desktop-app',
      to: '.',
      filter: ['**/*', '!release/**/*']
    },
    'package.json'
  ],

  // 确保原生模块被解包
  asarUnpack: [
    'node_modules/level/**/*',
    'node_modules/classic-level/**/*',
    'node_modules/abstract-level/**/*',
    'node_modules/level-supports/**/*',
    'node_modules/level-transcoder/**/*',
    'node_modules/module-error/**/*',
    'node_modules/queue-microtask/**/*',
    'node_modules/catering/**/*',
    'node_modules/napi-macros/**/*',
    'node_modules/node-gyp-build/**/*',
    'node_modules/browser-level/**/*',
    'node_modules/level-concat-iterator/**/*',
    'node_modules/maybe-combine-errors/**/*'
  ],

  // 原生模块配置
  nodeGypRebuild: false,
  buildDependenciesFromSource: false,
  
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
  
  // Windows 配置
  win: {
    target: [
      {
        target: 'zip',
        arch: ['x64']
      }
    ],
    icon: 'packages/apps/desktop-app/resources/icon-512.png',
    verifyUpdateCodeSignature: false
  },

  // NSIS 安装程序配置
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'SightAI Desktop',
    include: null,
    script: null,
    deleteAppDataOnUninstall: false,
    runAfterFinish: true,
    menuCategory: false,
    allowElevation: true,
    installerIcon: 'packages/apps/desktop-app/resources/icon-512.png',
    uninstallerIcon: 'packages/apps/desktop-app/resources/icon-512.png',
    installerHeaderIcon: 'packages/apps/desktop-app/resources/icon-512.png',
    installerSidebar: null,
    uninstallerSidebar: null,
    warningsAsErrors: false,
    perMachine: false,
    unicode: true
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

  // 跳过原生模块重建（避免交叉编译问题）
  npmRebuild: false,

  // 构建前后脚本
  beforeBuild: null,
  afterSign: null
};
