const HtmlWebpackPlugin = require("html-webpack-plugin");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const TSLintPlugin = require("tslint-webpack-plugin");
const FriendlyErrorsPlugin = require("friendly-errors-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require('copy-webpack-plugin');
const path = require("path");

const resolve = path.resolve

const webpack = require('webpack')

const plugins = [
  new HtmlWebpackPlugin({
    filename: "index.html",
    template: path.resolve(__dirname, "../storyDemo.html"),
  }),
  new CleanWebpackPlugin(),
  // new TSLintPlugin({
  //   files: ["./src/**/*.ts"],
  // }),
  new FriendlyErrorsPlugin({
    compilationSuccessInfo: {
      messages: ["You application is running here http://localhost:3000"],
      notes: ["Some additionnal notes to be displayed upon successful compilation"],
    },
    onErrors: function(severity, errors) {},
    clearConsole: true,
    additionalFormatters: [],
    additionalTransformers: [],
  }),
  new MiniCssExtractPlugin({
    filename: "[name].[hash].scss",
    chunkFilename: "[id].css"
  }),
  new CopyPlugin([
    { from: resolve(__dirname, '../assets'), to: resolve(__dirname, '../dist') },
  ])
  // new webpack.ProvidePlugin({
  //   "avc.wasm": "avc.wasm",
  //   'Decoder': 'Decoder',
  //   'Player': 'Player',
  //   'YUVCanvas': 'YUVCanvas'
  // })
];

module.exports = plugins;
