import assert from 'assert';

import callDefault, { bind, call } from 'node-version-call-local';

describe('exports .ts', () => {
  it('default export is call function', () => {
    assert.equal(typeof callDefault, 'function');
  });

  it('named export call is a function', () => {
    assert.equal(typeof call, 'function');
  });

  it('named export bind is a function', () => {
    assert.equal(typeof bind, 'function');
  });
});
