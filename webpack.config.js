const path = require('path');

module.exports = {
    entry: './index.js',
    mode: 'production',
    target: 'node',
    node: false,
    output: {
        filename: 'move-stale-issues.js',
        path: path.resolve(__dirname, 'dist')
    }
};

