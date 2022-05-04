const webpack = require('webpack')
const path = require('path')

IndexLoader = {
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
  ]
}

module.exports = [IndexLoader];
