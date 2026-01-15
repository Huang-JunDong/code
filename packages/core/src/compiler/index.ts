import { createHooks, Hookable } from 'hookable';
import { builtInPlugins } from './transform/plugins';
import { File } from './type';
import { Plugin, CompilerPluginParams, CompilerPluginResult } from './type';

export * from './file-system';
export * from './module';
export * from './type';

interface CompilerOptions {
  plugins?: Array<Plugin>;
  vueVersion?: 2 | 3;
}

export class Compiler {
  hooks: Hookable<Record<string, any>, string>;
  vueVersion: 2 | 3;
  private _ready: Promise<void>;

  constructor(options?: CompilerOptions) {
    this.hooks = createHooks();
    this.vueVersion = options?.vueVersion || 3;
    this._ready = this.init(options?.plugins || []);
  }

  /**
   * 等待编译器初始化完成
   */
  async ready(): Promise<void> {
    return this._ready;
  }

  private async init(_plugins: Array<Plugin>) {
    [...builtInPlugins(this.vueVersion), ..._plugins].forEach((plugin) => {
      plugin(this.hooks);
    });
    await this.hooks.callHook('after-init');
  }

  async run(params: CompilerPluginParams) {
    // 确保初始化完成
    await this._ready;
    // before-transform
    await this.hooks.callHook('before-transform', params);
    // transform
    await this.hooks.callHook('transform', params);
    // before-compile
    await this.hooks.callHook('before-compile', params);
    // compile-module
    const compiledResult = (await this.hooks.callHook(
      'compile-module',
      params
    )) as CompilerPluginResult;
    // before-emit
    await this.hooks.callHook('before-emit', params, compiledResult);
    // emit
    await this.hooks.callHook('emit', params, compiledResult);
    // after-emit
    await this.hooks.callHook('after-emit', params, compiledResult);
  }

  // 文件转换
  async transform(files: File[], result: { errors: Error[] }) {
    await this._ready;
    const transformTasks = files.map(async (file) => {
      const errors = await this.hooks.callHook('transform', file);
      if (errors) {
        result.errors.push(...errors);
      }
    });
    await Promise.all(transformTasks);
  }
}
