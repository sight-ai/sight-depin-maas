const { composePlugins, withNx } = require('@nx/webpack');
const path = require('path');
const webpack = require('webpack');
const { execSync } = require('child_process');

// Nx plugins for webpack.
module.exports = composePlugins(withNx(), (config, context) => {
  config.externals = {
    'fs': 'commonjs fs',
    'path': 'commonjs path',
    'os': 'commonjs os',
    'crypto': 'commonjs crypto',
    'http': 'commonjs http',
    'https': 'commonjs https',
    'url': 'commonjs url',
    'querystring': 'commonjs querystring',
    'stream': 'commonjs stream',
    'util': 'commonjs util',
    'events': 'commonjs events',
    'buffer': 'commonjs buffer',
    'child_process': 'commonjs child_process',
    'cluster': 'commonjs cluster',
    'dgram': 'commonjs dgram',
    'dns': 'commonjs dns',
    'net': 'commonjs net',
    'readline': 'commonjs readline',
    'repl': 'commonjs repl',
    'tls': 'commonjs tls',
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

  config.output = {
    ...config.output,
    libraryTarget: 'commonjs2',
  };

  config.optimization = {
    ...config.optimization,
    splitChunks: false,
    minimize: context.configurationName === 'production',
    usedExports: true,
    sideEffects: false,
    minimizer: context.configurationName === 'production' ? [
      new (require('terser-webpack-plugin'))({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug'],
            passes: 2,
          },
          mangle: {
            safari10: true,
          },
          format: {
            comments: false,
          },
        },
        extractComments: false,
      })
    ] : [],
  };

  config.plugins.push(
    new webpack.IgnorePlugin({
      resourceRegExp: /^(pg-native|osx-temperature-sensor|bufferutil|utf-8-validate|@grpc\/grpc-js|@grpc\/proto-loader|kafkajs|mqtt|ioredis|amqplib|amqp-connection-manager|@nestjs\/websockets\/socket-module|class-transformer\/storage|cloudflare:sockets)$/,
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
            console.log('✅ Native modules installed successfully');
          } catch (error) {
            console.warn('⚠️  Native modules installation failed, but continuing build:', error.message);
            console.log('📝 Note: Level database functionality may not work in the packaged app');
            // 不抛出错误，允许构建继续
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

  // 排除 .d.ts 文件的处理，避免 ts-loader 错误
  config.module.rules.forEach(rule => {
    if (rule.test && rule.test.toString().includes('tsx?')) {
      rule.exclude = rule.exclude || [];
      if (Array.isArray(rule.exclude)) {
        rule.exclude.push(/\.d\.ts$/);
      } else {
        rule.exclude = [rule.exclude, /\.d\.ts$/];
      }
    }
  });

  // 添加JSON文件处理规则
  // config.module.rules.push({
  //   test: /\.json$/,
  //   type: 'json',
  // });

  config.output.devtoolModuleFilenameTemplate = function (info) {
    const rel = path.relative(process.cwd(), info.absoluteResourcePath);
    return `webpack:///./${rel}`;
  };

  config.ignoreWarnings = [
    /Failed to parse source map/,
    /Module not found: Error: Can't resolve/,
    /Cannot statically analyse 'require/,
    /Critical dependency: the request of a dependency is an expression/,
    /Reading from "cloudflare:sockets" is not handled/,
  ];

  return config;
});
