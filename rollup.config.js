import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';

const production = !process.env.ROLLUP_WATCH;

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: true,
        exports: 'named'
      },
      {
        file: 'dist/index.mjs',
        format: 'es',
        sourcemap: true,
        exports: 'named'
      }
    ],
    external: ['node-fetch', 'crypto', 'os', 'fs', 'path'],
    plugins: [
      resolve({
        preferBuiltins: true,
        exportConditions: ['node', 'module', 'import', 'default']
      }),
      commonjs({
        transformMixedEsModules: true
      }),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        sourceMap: true,
        compilerOptions: {
          declarationMap: false,
          target: 'ES2020'
        }
      }),
      production && terser({
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      })
    ],
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      unknownGlobalSideEffects: false
    }
  },
  {
    input: 'src/index.ts',
    output: [{
      file: 'dist/index.d.ts',
      format: 'es',
      banner: '// Type definitions for Aizu Analytics Node.js SDK'
    }],
    plugins: [dts({
      respectExternal: true
    })]
  }
];