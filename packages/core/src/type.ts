export type Control = 'refresh' | 'copy' | 'share' | 'docs' | 'github' | 'format' | 'console';

/**
 * 支持的应用类型
 * - vue/vue3: Vue 3.x 应用
 * - vue2: Vue 2.x 应用
 * - react: React 应用
 * - svelte: Svelte 应用
 * - solid: Solid.js 应用
 * - html: 纯 HTML 页面
 * - javascript/js: JavaScript 项目
 * - typescript/ts: TypeScript 项目
 */
export type AppType =
  | 'vue'
  | 'vue2'
  | 'vue3'
  | 'react'
  | 'svelte'
  | 'solid'
  | 'html'
  | 'javascript'
  | 'js'
  | 'typescript'
  | 'ts';

/**
 * 验证是否为有效的 AppType
 */
export function isValidAppType(value: string): value is AppType {
  const validTypes: AppType[] = [
    'vue',
    'vue2',
    'vue3',
    'react',
    'svelte',
    'solid',
    'html',
    'javascript',
    'js',
    'typescript',
    'ts',
  ];
  return validTypes.includes(value as AppType);
}

/**
 * 标准化 AppType（处理别名）
 */
export function normalizeAppType(appType: string): AppType {
  const aliasMap: Record<string, AppType> = {
    vue: 'vue3',
    js: 'javascript',
    ts: 'typescript',
  };
  const normalized = appType.toLowerCase();
  if (aliasMap[normalized]) {
    return aliasMap[normalized];
  }
  return isValidAppType(normalized) ? normalized : 'typescript';
}

export interface OnlineEditorOptions {
  /**
   * @description_en Whether to display the side file column, default value is true
   * @description_zh 是否展示侧文件栏，默认为 true
   */
  showFileBar?: boolean;
  /**
   * @description_en Whether to display the code editor, default value is true
   * @description_zh 是否展示代码编辑区，默认为 true
   */
  showCode?: boolean;
  /**
   * @description_en Whether to display the web preview, default value is true
   * @description_zh 是否展示 web 可视区，默认为 true
   */
  showPreview?: boolean;
  /**
   * @description_en Whether to display the toolbar, default value is true
   * @description_zh 是否展示工具栏，默认为 true
   */
  showToolbar?: boolean;
  /**
   * @description_en Entry file name
   * @description_zh 入口文件的文件名，若不设置，默认将第一个文件作为入口文件
   */
  entry?: string;
  /**
   * @description_en Entry file name
   * @description_zh 初始化展示代码的文件的文件名
   */
  activeFile?: string;
  /**
   * @description_en Initialization files JSON string, format: Record<filename, code>
   * @description_zh 初始化文件 map，格式为：Record<filename, code>
   */
  initFiles?: Record<string, string>;
  /**
   * @description_en Application type. If initFiles is not configured, the initial file will be automatically generated according to the appType; If initFiles is configured, this item is invalid
   * @description_zh 应用类型。若未配置 initFiles，会根据 appType 自动生成初始文件；若配置了 initFiles，此项失效
   */
  appType?: AppType;
  /**
   * @description_en Control buttons to be removed from the toolbar
   * @description_zh 工具栏要移除的工具按钮
   */
  excludeTools?: Control[];
  /**
   * @description_en The initial font-size of code
   * @description_zh 初始的代码字号
   */
  codeSize?: number;
  /**
   * @description_en The version of vue compiler
   * @description_zh vue 解析器的版本
   */
  vueVersion?: 2 | 3;
  /**
   * @description_en The theme
   * @description_zh 主题
   */
  theme?: 'light' | 'dark';
  /**
   * @description_en Whether to open the console
   * @description_zh 是否默认打开控制台
   */
  openConsole?: boolean;
  /**
   * @description_en Whether to show the eruda
   * @description_zh 是否展示 eruda
   */
  showEruda?: boolean;
  /**
   * @description_en The link of document
   * @description_zh 文档链接地址
   */
  document?: string;
  /**
   * @description_en The link of github
   * @description_zh github 地址
   */
  github?: string;
}

export interface EditorExportFile {
  filename: string;
  code: string;
  isEntry: boolean;
  isActive: boolean;
}
