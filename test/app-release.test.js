import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
test('App release manifest is public and does not disclose environment credentials', async () => {
  const server = app.listen(0);await new Promise(resolve => server.once('listening', resolve));
  try {
    const response = await fetch('http://127.0.0.1:' + server.address().port + '/api/app/version');
    assert.equal(response.status, 200);assert.equal(response.headers.get('cache-control'), 'no-store');
    const release = await response.json();
    assert.equal(typeof release.version, 'string');assert.ok(Number.isInteger(release.versionCode));
    assert.deepEqual(Object.keys(release).sort(), ['version', 'versionCode', 'downloadUrl', 'notes', 'publishedAt'].sort());
  } finally { await new Promise(resolve => server.close(resolve)); }
});
