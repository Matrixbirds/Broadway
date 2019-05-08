const path = require("path");
const loaders = require("./loaders");
const plugins = require("./plugins");

const jquery = require("jquery")

const resolve = path.resolve;

module.exports = {
  entry: {
    jquery: resolve(__dirname, '../node_modules/jquery'),
    index: "./src/main.js",
  },
  devtool: "inline-source-map",
  module: loaders,
  plugins,
  resolve: {
    extensions: [ ".js", ".wasm" ],
  },
  output: {
    webassemblyModuleFilename: "[modulehash].wasm",
    filename: "[name].js",
    path: path.resolve(__dirname, "../dist"),
  },
  optimization: {
    minimize: false,
  },
  devServer: {
    // host: 'localhost.specialurl.com',
    // https: true,
    overlay: {
      warnings: true,
      errors: true,
    },
    // hot: true,
    contentBase: path.join(__dirname, "./"),
    compress: true,
    progress: true,
    open: true,
    proxy: {
      '/socket.io': {
        target: 'ws://localhost:3000',
        ws: true
        // changeOrigin: true,
        // pathRewrite: {
        //   "^/socket.io": "/socket.io"
        // }
      }
    }
  },
};
