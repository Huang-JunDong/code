/// <reference types="vite/client" />

declare module '*.vue' {
  import { defineComponent } from 'vue';
  const Component: ReturnType<typeof defineComponent>;
  export default Component;
}

declare interface Window {
  __eruda: any;
}

// Monaco 语言模式类型声明
// 这些模块的 setupMode 函数用于手动初始化语言服务
// 绕过 onLanguage 回调在打包后不触发的问题
declare module 'monaco-editor/esm/vs/language/css/cssMode' {
  export function setupMode(defaults: any): void;
}

declare module 'monaco-editor/esm/vs/language/html/htmlMode' {
  export function setupMode(defaults: any): import('monaco-editor').IDisposable;
}

declare module 'monaco-editor/esm/vs/language/json/jsonMode' {
  export function setupMode(defaults: any): void;
}

// Babel standalone 类型声明
declare module '@babel/standalone' {
  export function transform(
    code: string,
    options?: {
      filename?: string;
      presets?: Array<string | [string, Record<string, any>]>;
      plugins?: Array<string | [string, Record<string, any>]>;
      [key: string]: any;
    }
  ): { code: string | null; map?: any; ast?: any };

  export function registerPreset(name: string, preset: any): void;
  export function registerPlugin(name: string, plugin: any): void;

  export const availablePresets: Record<string, any>;
  export const availablePlugins: Record<string, any>;
}
