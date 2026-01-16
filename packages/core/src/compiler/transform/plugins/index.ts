import transformTsPlugin from './transform-ts';
import transformVue3Plugin from './transform-vue3';
import transformVue2Plugin from './transform-vue2';
import transformReactPlugin from './transform-react';
import transformSveltePlugin from './transform-svelte';
import transformSolidPlugin from './transform-solid';
import transformCssPlugin from './transform-css';
import transformScssPlugin from './transform-scss';
import transformLessPlugin from './transform-less';
import compileModulePlugin from '@/compiler/plugins/module-factory';
import emitHtmlPlugin from '@/compiler/plugins/emit-html';

/**
 * 内置插件列表
 * 注意：插件顺序很重要！
 * - Solid 必须在 React 之前，因为两者都处理 jsx/tsx 文件
 * - Solid 通过 import-map 检测来区分项目类型
 * - React 也添加了框架检测，会跳过 Solid 项目
 */
export const builtInPlugins = (vueVersion = 3) => [
  transformTsPlugin,
  vueVersion.toString() === '2' ? transformVue2Plugin : transformVue3Plugin,
  // Solid 必须在 React 之前，两者都有框架检测逻辑
  transformSolidPlugin,
  transformReactPlugin,
  transformSveltePlugin,
  transformCssPlugin,
  transformScssPlugin,
  transformLessPlugin,
  compileModulePlugin,
  emitHtmlPlugin,
];
