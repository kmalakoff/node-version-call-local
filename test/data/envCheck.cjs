module.exports = function envCheck(callback) {
  callback(null, process.env.TEST_ENV_VAR);
};
