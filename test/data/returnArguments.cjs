module.exports = function returnArguments() {
  return Array.prototype.slice.call(arguments, 0);
};
