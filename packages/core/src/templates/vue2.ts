import { MapFile } from '@/constant';

const indexHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Code</title>
  </head>
  <body>
    <div id="app"></div>
  </body>
  <script type="module">
    import './main.ts';
  </script>
</html>
`.trim();

const mainTs = `
import Vue from 'vue';
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import App from './App.vue';

Vue.use(ElementUI);

new Vue({
  el: '#app',
  render: h => h(App)
});
`.trim();

const appVue = `
<template>
  <div>
 
  </div>
</template>

<script>
export default {
  data() {
    return {
      buttonText: 'Default'
    }
  }
}
</script>

<style scoped>
</style>
`.trim();

const importMap = `
{
  "imports": {
    "vue": "https://esm.sh/vue@2.7.15",
    "element-ui": "https://esm.sh/element-ui@2.5.0",
    "element-ui/": "https://esm.sh/element-ui@2.5.0/"
  }
}
`.trim();

export const Vue2Template = {
  'index.html': indexHtml,
  'main.ts': mainTs,
  'App.vue': appVue,
  [MapFile]: importMap,
};
