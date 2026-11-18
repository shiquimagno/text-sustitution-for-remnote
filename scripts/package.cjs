const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
// A fresh archive prevents files removed from dist lingering in an older ZIP.
fs.rmSync('PluginZip.zip', { force: true });
execFileSync('zip', ['-qr', '../PluginZip.zip', '.'], { cwd: 'dist', stdio: 'inherit' });
