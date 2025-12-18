import assert from 'assert';
import call from 'node-version-call-local';

describe('exports .mjs', () => {
  it('defaults', () => {
    assert.equal(typeof call, 'function');
  });
});
