const path = require('path')

module.exports = {
  entry: './src/main.ts',
  target: 'node',
  mode: 'production',
  devtool: false,
  externals: {
    // Optional peer deps that @nestjs packages try to import (never used at runtime)
    '@fastify/static': 'commonjs @fastify/static',
    'fastify': 'commonjs fastify',
    // class-transformer/storage must NOT be external — server-bundle has no node_modules
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      'class-transformer/storage': require.resolve('class-transformer/cjs/storage'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            configFile: 'tsconfig.build.json',
          },
        },
        exclude: [/node_modules/, /seed.*\.ts$/, /generate-license/],
      },
    ],
  },
  output: {
    filename: 'server.cjs',
    path: path.resolve(__dirname, '../client/server-bundle'),
    libraryTarget: 'commonjs2',
  },
  node: { __dirname: false, __filename: false },
  optimization: { minimize: false },
}
