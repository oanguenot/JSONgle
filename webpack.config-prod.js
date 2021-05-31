const path = require('path');

 module.exports = {
   entry: './src/index.js',
   mode: "production",
   output: {
     path: path.resolve(__dirname, 'dist'),
     filename: 'JSONgle.js',
    library: {
      name: 'JSONgle',
      type: 'umd',
      export: 'default',
    },
   },
 };
