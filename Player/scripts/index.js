const path = require("path");
const loaders = require("./loaders");
const plugins = require("./plugins");

const jquery = require("jquery")

const resolve = path.resolve;

module.exports = {
  entry: {
    jquery: resolve(__dirname, '../node_modules/jquery'),
    // stream: resolve(__dirname, "../stream"),
    // 'jquery-ui.css': resolve(__dirname, '../jquery-ui.css'),
    // mp4: resolve(__dirname, "../mp4"),
    // "avc.wasm": resolve(__dirname, "../avc.wasm"),
    // Decoder: resolve(__dirname, "../Decoder.js"),
    // Player: resolve(__dirname, "../Player.js"),
    index: "./src/main.js",
    // broadway: resolve(__dirname, "../broadway"),
  },
  devtool: "inline-source-map",
  module: loaders,
  plugins,
  resolve: {
    // extensions: [ ".tsx", ".ts", ".js" ],
    alias: {
      // "avc.wasm": resolve(__dirname, "../avc.wasm"),
      // Decoder: resolve(__dirname, "../Decoder"),
      // Player: resolve(__dirname, "../Player"),
      // YUVCanvas: resolve(__dirname, "../YUVCanvas"),
    },
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
    open: true
  },
};
