const { composePlugins, withNx } = require('@nx/webpack');
const path = require('path');

// Nx plugins for webpack.
module.exports = composePlugins(withNx(), config => {
  config.module.rules.push({
    test: /\.api-schema-ts$/,
    type: 'asset/source',
  });

  // ref: https://github.com/nrwl/nx/issues/14708
  config.output.devtoolModuleFilenameTemplate = function (info) {
    const rel = path.relative(process.cwd(), info.absoluteResourcePath);
    return `webpack:///./${rel}`;
  };
  return config;
});
