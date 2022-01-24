const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');

module.exports = {
    entry: './github-action.js',
    mode: 'production',
    target: 'node',
    node: false,
    output: {
        filename: 'github-action.js',
        path: path.resolve(__dirname, 'dist')
    },
    optimization: {
        minimizer: [ new TerserPlugin({ extractComments: false }) ],
    },
};

