const fs = require('node:fs');
const assert = require('node:assert/strict');
const { parseManifest } = require('./sdk-security.cjs').loadPatchedSdk();
const release = process.argv.includes('--release');
const source = fs.readFileSync('public/manifest.json', 'utf8');
assert.ok(Buffer.byteLength(source) <= 16384, 'Development manifest exceeds 16 KiB.');
const manifest = JSON.parse(source);
// Check bounds before entering the SDK schemas, which do not cap these arrays.
assert.ok(Array.isArray(manifest.requiredScopes) && manifest.requiredScopes.length <= 8, 'Too many permission scopes.');
assert.ok(manifest.theme === undefined || (Array.isArray(manifest.theme) && manifest.theme.length <= 2), 'Invalid theme list size.');
const result = parseManifest(manifest);
assert.equal(result.success, true, JSON.stringify(result.success ? [] : result.errors, null, 2));
assert.equal(manifest.requestNative, false);
assert.deepEqual(manifest.requiredScopes, [{
  type: 'DescendantsOfName', remName: 'Prueba de sustituciones', level: 'ReadCreateModify',
}]);
if (release) {
  const repositoryUrl = /^https:\/\/github\.com\/[a-z0-9-]+\/(?=[a-z0-9_.-]*[a-z0-9_-])[a-z0-9_.-]+$/i;
  assert.ok(repositoryUrl.test(manifest.repoUrl), 'Usa en repoUrl la URL HTTPS del repositorio público de GitHub antes de generar el paquete de publicación.');
}
console.log('El manifiesto cumple el esquema del SDK y el alcance sandbox de la beta.');
