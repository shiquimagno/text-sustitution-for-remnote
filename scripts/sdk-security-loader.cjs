const { patchSdk } = require('./sdk-security.cjs');
module.exports = function(source) { return patchSdk(source, this.resourcePath); };
