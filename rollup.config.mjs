import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const banner = '/*! @ostrio/analytics-middleware v1.0.1 | BSD-3-Clause */';

const externals = ['ostrio-analytics', 'node:https', 'node:http', 'https', 'http'];

const isExternal = (id) =>
  externals.some((name) => id === name || id.startsWith(`${name}/`));

const serverResolve = resolve({ preferBuiltins: true });
const clientResolve = resolve({ browser: true, preferBuiltins: false });

const serverPlugins = [
  serverResolve,
  commonjs(),
  typescript({ compilerOptions: { target: 'ES2022', module: 'ESNext' } })
];

const clientPlugins = [
  clientResolve,
  commonjs(),
  typescript({ compilerOptions: { target: 'ES2022', module: 'ESNext' } })
];

const makeConfig = (input, outputFile, format, plugins) => ({
  input,
  output: {
    file: outputFile,
    format,
    exports: 'named',
    sourcemap: false,
    banner
  },
  external: isExternal,
  plugins,
  treeshake: true
});

export default [
  makeConfig('src/index.ts', 'dist/index.js', 'esm', serverPlugins),
  makeConfig('src/index.ts', 'dist/index.cjs', 'cjs', serverPlugins),
  makeConfig('src/client.ts', 'dist/client.js', 'esm', clientPlugins),
  makeConfig('src/client.ts', 'dist/client.cjs', 'cjs', clientPlugins)
];
