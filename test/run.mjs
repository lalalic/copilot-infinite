/**
 * Build test bundles from source, then run node:test.
 * Usage: node test/run.mjs
 */
import * as esbuild from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

mkdirSync('test/out', { recursive: true });

// Bundle questions.ts for testing — expose all exports
await esbuild.build({
  entryPoints: ['src/questions.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: 'test/out/questions.js',
  sourcemap: true,
  minify: false,
  external: ['vscode'],
  target: ['node20'],
});

console.log('Test bundles built.\n');

// Run tests
try {
  execFileSync('node', ['--test', 'test/questions.test.cjs', 'test/e2e-as-real-user.test.cjs', 'test/clarify-idea.test.cjs'], {
    stdio: 'inherit',
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...process.env, NODE_OPTIONS: '' },
  });
} catch {
  process.exit(1);
}
