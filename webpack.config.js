const webpack = require('webpack')
const path = require('path')

IndexLoader = {
  devtool: "inline-source-map",
  entry: './index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'build'),
    libraryTarget: 'var',
    library: 'MinervaStory'
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser'
    })
  ],
  devServer: {
    static: { directory: path.join(__dirname, 'build') },
    // compress: false,
    // port: 8080,
  },
}

module.exports = IndexLoader;
