import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const config = require('../webpack.config.js');

test('el cargador rechaza widgets arbitrarios y URLs externas', () => {
  const html = config.plugins.find((p: any) => p.constructor.name === 'HtmlWebpackPlugin').userOptions.templateContent;
  const code = html.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
  for (const widget of ['index', 'probe', 'probe_status', 'catalog', 'https://evil.example/payload', '//evil.example/payload', '../private/key', '<script>', '']) {
    const loaded: any[] = [];
    const document = { body: { textContent: '', appendChild: (s: any) => loaded.push(s) }, createElement: () => ({}) };
    const run = () => runInNewContext(code, { URLSearchParams, window: { location: { search: '?widgetName=' + encodeURIComponent(widget) } }, document });
    if (['index', 'probe', 'probe_status', 'catalog'].includes(widget)) {
      run(); assert.equal(loaded[0].src, `./${widget}-sandbox.js`);
    } else { assert.throws(run, /Unknown widget/); assert.equal(loaded.length, 0); }
  }
});
test('servidor en loopback, sin HMR y sin CORS para sitios arbitrarios', () => {
  assert.equal(config.devServer.host, '127.0.0.1');
  assert.equal(config.devServer.hot, false);
  const headers = (origin: string) => config.devServer.headers({ headers: { origin } });
  assert.equal(headers('https://evil.example')['Access-Control-Allow-Origin'], undefined);
  assert.equal(headers('https://www.remnote.com')['Access-Control-Allow-Origin'], 'https://www.remnote.com');
  assert.equal(headers('app://js')['Access-Control-Allow-Origin'], 'app://js');
  assert.equal(headers('null')['Access-Control-Allow-Origin'], 'null');
});
test('gitignore protege secretos y generados sin excluir código ni lockfile', () => {
  const git = mkdtempSync(join(tmpdir(), 'remnote-ignore-'));
  try {
    execFileSync('git', ['init', '--bare', '--quiet', git]);
    const ignored = ['.env', '.env.production', '.npmrc', 'secret.pem', 'credentials-dev.json', 'exports/notes.json', 'trace.har', 'node_modules/x.js', 'dist/index.js', 'PluginZip.zip', '.agents/skills/x/SKILL.md'];
    const tracked = ['.env.example', 'package-lock.json', 'src/widgets/index.tsx', 'AGENTS.md', 'openspec/config.yaml'];
    const result = execFileSync('git', ['--git-dir=' + git, '--work-tree=' + process.cwd(), 'check-ignore', '--no-index', '--stdin'], { input: [...ignored, ...tracked].join('\n') + '\n', encoding: 'utf8' });
    const found = new Set(result.trim().split('\n'));
    for (const path of ignored) assert.ok(found.has(path), path);
    for (const path of tracked) assert.ok(!found.has(path), path);
  } finally { rmSync(git, { recursive: true, force: true }); }
});
