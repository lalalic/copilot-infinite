import * as esbuild from 'esbuild';
import { rm } from 'node:fs/promises';

const watch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: 'out/extension.js',
  sourcemap: true,
  minify: false,
  external: ['vscode'],
  target: ['node20'],
  logLevel: 'info'
};

if (watch) {
  await rm('out', { recursive: true, force: true });
  const context = await esbuild.context(buildOptions);
  await context.watch();
  console.log('esbuild watching for changes...');
} else {
  await rm('out', { recursive: true, force: true });
  await esbuild.build(buildOptions);
}