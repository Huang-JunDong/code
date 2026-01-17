# Online Editor

<p align="center">
  浏览器代码编辑器 & 可视化运行组件，支持 Vue/React 等框架的在线编辑与预览
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/online-editor"><img src="https://img.shields.io/npm/v/online-editor.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/online-editor"><img src="https://img.shields.io/npm/dm/online-editor.svg" alt="npm downloads"></a>
  <a href="https://github.com/Huang-JunDong/code/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/online-editor.svg" alt="license"></a>
</p>

---

## ✨ 特性

- 🎨 **多框架支持** - 支持 Vue 2/3、React、Svelte、Solid、HTML、JavaScript、TypeScript
- 🚀 **Monaco Editor** - 基于 VS Code 同款编辑器，提供专业的代码编辑体验
- 📱 **响应式布局** - 同时支持桌面端和移动端
- 🎯 **即时预览** - 实时编译运行，所见即所得
- 🎛️ **高度可配置** - 丰富的配置项满足各种场景需求
- 🌙 **主题切换** - 支持亮色/暗色主题

## 📦 安装

```bash
# npm
npm install online-editor

# yarn
yarn add online-editor

# pnpm
pnpm add online-editor
```

## 🔨 使用

### 基础用法

```vue
<script setup>
import OnlineEditor from 'online-editor';
import 'online-editor/style.css';
</script>

<template>
  <OnlineEditor />
</template>
```

### 配置选项

```vue
<script setup>
import OnlineEditor from 'online-editor';
import 'online-editor/style.css';

const options = {
  appType: 'vue3',
  theme: 'dark',
  showFileBar: true,
  showToolbar: true,
};
</script>

<template>
  <OnlineEditor :options="options" />
</template>
```

### 自定义初始文件

```vue
<script setup>
import OnlineEditor from 'online-editor';
import 'online-editor/style.css';

const options = {
  initFiles: {
    'App.vue': `<template>
  <h1>Hello World!</h1>
</template>`,
    'main.js': `import { createApp } from 'vue';
import App from './App.vue';
createApp(App).mount('#app');`,
  },
  entry: 'main.js',
};
</script>

<template>
  <OnlineEditor :options="options" />
</template>
```

## ⚙️ 配置项

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `showFileBar` | `boolean` | `true` | 是否展示侧文件栏 |
| `showCode` | `boolean` | `true` | 是否展示代码编辑区 |
| `showPreview` | `boolean` | `true` | 是否展示预览区 |
| `showToolbar` | `boolean` | `true` | 是否展示工具栏 |
| `entry` | `string` | - | 入口文件名，默认第一个文件 |
| `activeFile` | `string` | - | 初始展示的文件 |
| `initFiles` | `Record<string, string>` | - | 初始化文件 map |
| `appType` | `AppType` | - | 应用类型 |
| `excludeTools` | `Control[]` | - | 工具栏要移除的按钮 |
| `codeSize` | `number` | - | 代码字号 |
| `vueVersion` | `2 \| 3` | `3` | Vue 编译器版本 |
| `theme` | `'light' \| 'dark'` | `'light'` | 主题 |
| `openConsole` | `boolean` | `false` | 是否默认打开控制台 |
| `showEruda` | `boolean` | `false` | 是否展示 Eruda 调试工具 |
| `document` | `string` | - | 文档链接地址 |
| `github` | `string` | - | GitHub 地址 |

## 📣 事件

| 事件名 | 参数 | 说明 |
|------|------|------|
| `code-change` | `EditorExportFile[]` | 编辑器内容变化时触发，实时导出全部文件代码 |

```vue
<script setup lang="ts">
import OnlineEditor, { type EditorExportFile } from 'online-editor';
import 'online-editor/style.css';

const handleCodeChange = (files: EditorExportFile[]) => {
  console.log(files);
};
</script>

<template>
  <OnlineEditor @code-change="handleCodeChange" />
</template>
```

### AppType 类型

```typescript
type AppType = 'vue' | 'vue2' | 'vue3' | 'react' | 'svelte' | 'solid' | 'html' | 'javascript' | 'js' | 'typescript' | 'ts';
```

### Control 类型

```typescript
type Control = 'refresh' | 'copy' | 'share' | 'docs' | 'github' | 'format' | 'console';
```

## 🏗️ 生产环境构建（Worker 兼容）

`online-editor` 依赖 Monaco 等能力，会用到 Web Worker。在某些静态部署场景（相对路径、非根路径、CDN/反向代理等）下，构建产物里的 Worker chunk 地址可能解析不符合预期，导致 Worker 404 或无法启动。

一个通用做法是在构建完成后对产物做一次“构建后补丁”：把特定形式的 `new Worker(new URL(..., import.meta.url))` 改写为 `Blob + importScripts(...)`，让 Worker 使用 `location.href` 来解析并加载对应的 worker chunk。

```js
const fs = require('fs');
const path = require('path');

const distDir = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.resolve(process.cwd(), 'dist');

function replaceWorkerUrls(filePath) {
  const data = fs.readFileSync(filePath, 'utf8');
  const workerPattern =
    /new Worker\(""\+new URL\(""\+new URL\("([^"]+\.js)",import\.meta\.url\)\.href,self\.location\)\.href\)/g;

  const newData = data.replace(workerPattern, (match, workerPath) => {
    return `new Worker(URL.createObjectURL(new Blob([\`importScripts("\${new URL("${workerPath}",location.href).href}")\`],{type:"text/javascript"})))`;
  });

  if (newData !== data) fs.writeFileSync(filePath, newData, 'utf8');
}

function traverseDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) traverseDirectory(filePath);
    else if (file.endsWith('.js')) replaceWorkerUrls(filePath);
  }
}

traverseDirectory(distDir);
```

构建命令示例：

```json
{
  "scripts": {
    "build": "vite build && node ./scripts/patch-workers.cjs dist"
  }
}
```

## 📄 License

[MIT](./LICENSE)
