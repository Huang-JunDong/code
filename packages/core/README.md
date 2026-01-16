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

- 🎨 **多框架支持** - 支持 Vue 2/3、React、HTML、JavaScript、TypeScript
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

### AppType 类型

```typescript
type AppType = 'vue' | 'vue2' | 'vue3' | 'react' | 'html' | 'javascript' | 'js' | 'typescript' | 'ts';
```

### Control 类型

```typescript
type Control = 'refresh' | 'copy' | 'share' | 'docs' | 'github' | 'format' | 'console';
```

## 📄 License

[MIT](./LICENSE)
