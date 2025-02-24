// module.exports = function override(config, env) {
//   // Optionally remove or conditionally apply fallback based on Webpack version
//   if (parseInt(config.webpack.version.split('.')[0]) >= 5) {
//     config.resolve = {
//       ...config.resolve,
//       fallback: {
//         "stream": require.resolve("stream-browserify"),
//         // add other fallbacks if needed...
//       }
//     };
//   }
//   return config;
// }