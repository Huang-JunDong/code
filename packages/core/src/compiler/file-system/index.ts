import {
  HtmlTemplate,
  JsTemplate,
  ReactTemplate,
  SolidTemplate,
  SvelteTemplate,
  TsTemplate,
  Vue3Template,
  Vue2Template,
} from '@/templates';
import { File } from '@/compiler/type';

export interface FileSystem {
  // 全部文件
  files: Record<string, File>;
  // 入口文件
  entry: string;
  // 当前编辑中的文件
  activeFile: string;
  // imports map
  imports: Record<string, string>;
}

/**
 * 模板映射表 - 使用对象映射替代 if-else 链
 * 提高可维护性和可扩展性
 */
const templateMap: Record<string, Record<string, string>> = {
  vue3: Vue3Template,
  vue: Vue3Template,
  vue2: Vue2Template,
  react: ReactTemplate,
  svelte: SvelteTemplate,
  solid: SolidTemplate,
  html: HtmlTemplate,
  javascript: JsTemplate,
  js: JsTemplate,
  typescript: TsTemplate,
  ts: TsTemplate,
};

/**
 * 根据应用类型获取对应的模板
 */
export const getTemplate = (appType: string = 'vue3'): Record<string, string> => {
  return templateMap[appType.toLowerCase()] || TsTemplate;
};

/**
 * 获取文件扩展名
 */
export const getFileExtraName = (filename: string): string => {
  if (!filename) return '';
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === 0) return '';
  return filename.slice(lastDotIndex + 1);
};

/**
 * 根据文件名获取语言类型（用于 Monaco Editor）
 */
export const getFileLanguage = (filename: string): string => {
  const ext = getFileExtraName(filename);
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    svelte: 'html', // Svelte 直接使用 HTML 语言服务（语法高亮 + 智能提示）
  };
  return languageMap[ext] || ext;
};
