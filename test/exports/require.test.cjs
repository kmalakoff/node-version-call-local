const assert = require('assert');
const call = require('node-version-call-local');

describe('exports .cjs', () => {
  it('defaults', () => {
    assert.equal(typeof call, 'function');
  });
});
