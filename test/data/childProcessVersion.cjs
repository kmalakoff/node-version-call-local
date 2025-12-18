var cp = require('child_process');
module.exports = function childProcessVersion() {
  var childVersion = cp.execSync('node -v', { encoding: 'utf8' }).trim();
  return { workerVersion: process.version, childVersion: childVersion };
};
