const { execSync } = require('child_process');
module.exports = function childProcessVersion() {
  const childVersion = execSync('node -v', { encoding: 'utf8' }).trim();
  return { workerVersion: process.version, childVersion };
};
