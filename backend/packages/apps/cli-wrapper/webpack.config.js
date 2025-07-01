const { composePlugins, withNx } = require('@nx/webpack');
const path = require('path');
const webpack = require('webpack');
const { execSync } = require('child_process');

// Nx plugins for webpack.
module.exports = composePlugins(withNx(), (config, context) => {
  // 为了让 CLI 的网络请求在打包后能正常工作，我们需要保留核心的 Node.js 模块作为外部依赖
  // 但是移除网络相关的模块，让 webpack 将它们打包进去
  config.externals = {
    'fs': 'commonjs fs',
    'path': 'commonjs path',
    'os': 'commonjs os',
    'crypto': 'commonjs crypto',
    'querystring': 'commonjs querystring',
    'stream': 'commonjs stream',
    'util': 'commonjs util',
    'events': 'commonjs events',
    'buffer': 'commonjs buffer',
    'child_process': 'commonjs child_process',
    'cluster': 'commonjs cluster',
    'dgram': 'commonjs dgram',
    'readline': 'commonjs readline',
    'repl': 'commonjs repl',
    'tty': 'commonjs tty',
    'zlib': 'commonjs zlib',
    'assert': 'commonjs assert',
    'constants': 'commonjs constants',
    'module': 'commonjs module',
    'perf_hooks': 'commonjs perf_hooks',
    'process': 'commonjs process',
    'v8': 'commonjs v8',
    'vm': 'commonjs vm',
    'worker_threads': 'commonjs worker_threads',
    'inspector': 'commonjs inspector',
    'async_hooks': 'commonjs async_hooks',

    'level': 'commonjs level',
    'classic-level': 'commonjs classic-level',
    'abstract-level': 'commonjs abstract-level',
    'level-supports': 'commonjs level-supports',
    'level-transcoder': 'commonjs level-transcoder',
    'module-error': 'commonjs module-error',
    'queue-microtask': 'commonjs queue-microtask',
    'maybe-combine-errors': 'commonjs maybe-combine-errors',
    'node-gyp-build': 'commonjs node-gyp-build',
    'catering': 'commonjs catering',
  };

  config.target = 'node';

  // if (context.configurationName === 'production') {
    config.devtool = false;
  // }

  config.optimization = {
    ...config.optimization,
    splitChunks: false,
    minimize: true, // 始终启用压缩
    usedExports: true,
    sideEffects: false,
    providedExports: true,
    concatenateModules: true, // 启用模块连接
    mangleExports: true,
    removeAvailableModules: true,
    removeEmptyChunks: true,
    mergeDuplicateChunks: true,
    flagIncludedChunks: true,
    minimizer: [
      new (require('terser-webpack-plugin'))({
        terserOptions: {
          compress: {
            // 对于CLI应用，保留console输出以显示用户信息
            drop_console: false,
            drop_debugger: true,
            // 只删除调试相关的console，保留用户界面输出
            pure_funcs: ['console.debug'],
            passes: 2,
            dead_code: true,
            unused: true,
          },
          mangle: {
            toplevel: true,
          },
          format: {
            comments: false,
          },
        },
        extractComments: false,
        parallel: true,
      })
    ],
  };

  config.plugins.push(
    new webpack.IgnorePlugin({
      resourceRegExp: /^(pg-native|osx-temperature-sensor|bufferutil|utf-8-validate|@grpc\/grpc-js|@grpc\/proto-loader|kafkajs|mqtt|ioredis|amqplib|amqp-connection-manager|@nestjs\/websockets\/socket-module|class-transformer\/storage|cloudflare:sockets)$/,
    }),
    // 添加更多忽略的模块以减少bundle大小
    new webpack.IgnorePlugin({
      resourceRegExp: /^(fsevents|chokidar|watchpack|webpack-dev-server|webpack-hot-middleware|webpack-dev-middleware)$/,
    }),
    // 忽略大型开发工具和测试相关模块
    new webpack.IgnorePlugin({
      resourceRegExp: /^(typescript|prettier|eslint|jest|@types\/.*|webpack-bundle-analyzer|npm-check-updates|ts-jest|ts-node|ts-loader|@typescript-eslint\/.*|tsconfig-paths.*|@swc\/.*|@swc-node\/.*)$/,
    }),
    // 忽略可选的原生模块
    new webpack.IgnorePlugin({
      resourceRegExp: /^(node-gyp|node-pre-gyp|prebuild|prebuild-install)$/,
    }),
    // 忽略 TypeScript 编译器和相关工具
    new webpack.IgnorePlugin({
      resourceRegExp: /typescript\/lib\/.*$/,
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /\.d\.ts$/,
    }),
    // 忽略不必要的locale文件
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/,
    }),
    new webpack.NormalModuleReplacementPlugin(
      /^clone-deep$/,
      function(resource) {
        resource.request = 'data:text/javascript;base64,' + Buffer.from(`
          module.exports = function cloneDeep(obj) {
            if (obj === null || typeof obj !== 'object') return obj;
            if (obj instanceof Date) return new Date(obj.getTime());
            if (obj instanceof Array) return obj.map(item => cloneDeep(item));
            if (typeof obj === 'object') {
              const cloned = {};
              for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                  cloned[key] = cloneDeep(obj[key]);
                }
              }
              return cloned;
            }
            return obj;
          };
        `).toString('base64');
      }
    ),
    {
      apply: (compiler) => {
        compiler.hooks.afterEmit.tap('InstallNativeModules', (compilation) => {
          const outputPath = compilation.outputOptions.path;
          const scriptPath = path.resolve(__dirname, '../../../scripts/install-native-modules.js');

          try {
            console.log('🔧 Installing native modules...');
            execSync(`node "${scriptPath}" "${outputPath}"`, { stdio: 'inherit' });
          } catch (error) {
            console.error('❌ Failed to install native modules:', error.message);
          }
        });
      }
    },
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(context.configurationName || 'development'),
    })
  );

  config.module.rules.push({
    test: /\.api-schema-ts$/,
    type: 'asset/source',
  });

  config.output.devtoolModuleFilenameTemplate = function (info) {
    const rel = path.relative(process.cwd(), info.absoluteResourcePath);
    return `webpack:///./${rel}`;
  };

  return config;
});
