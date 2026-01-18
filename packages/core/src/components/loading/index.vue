<template>
  <div class="loading-container">
    <div class="loader-icon">
      <svg
        class="icon"
        viewBox="0 0 1024 1024"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        width="120"
        height="120"
      >
        <path
          d="M896 128H128c-35.2 0-64 28.8-64 64v640c0 35.2 28.8 64 64 64h768c35.2 0 64-28.8 64-64V192c0-35.2-28.8-64-64-64z m32 704c0 19.2-12.8 32-32 32H128c-19.2 0-32-12.8-32-32V320h832v512z m0-544H96v-96c0-19.2 12.8-32 32-32h768c19.2 0 32 12.8 32 32v96z"
          class="frame-path"
        ></path>
        <path d="M416 224m-32 0a32 32 0 1 0 64 0 32 32 0 1 0-64 0Z" class="dot-green"></path>
        <path d="M288 224m-32 0a32 32 0 1 0 64 0 32 32 0 1 0-64 0Z" class="dot-yellow"></path>
        <path d="M160 224m-32 0a32 32 0 1 0 64 0 32 32 0 1 0-64 0Z" class="dot-red"></path>
        <path
          d="M446.784 757.28l99.568-370.832 30.896 8.288-99.568 370.848zM405.04 711.776L269.248 576l135.776-135.76-22.656-22.64L224 576l158.4 158.4zM618.96 711.776l22.672 22.624L800 576l-158.4-158.4-22.64 22.608L754.752 576z"
          class="code-path"
        ></path>
      </svg>
    </div>
    <p class="loading-text">{{ msg }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
const msg = ref('资源加载中');

let timerId: ReturnType<typeof setInterval> | null = null;
let dotCount = 0;

function loadingMsg() {
  dotCount = (dotCount + 1) % 4;
  msg.value = '资源加载中' + '.'.repeat(dotCount);
}

onMounted(() => {
  timerId = setInterval(loadingMsg, 500);
});

onUnmounted(() => {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
});
</script>

<style scoped lang="less">
.loading-container {
  background-color: var(--codeplayer-filebar-bgc, #ffffff);
  flex-direction: column;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  .loader-icon {
    width: 120px;
    height: 120px;
    .frame-path {
      fill: var(--codeplayer-loading-frame, #34495e);
    }
    .dot-green {
      fill: var(--codeplayer-loading-dot-green, #00b42a);
    }
    .dot-yellow {
      fill: var(--codeplayer-loading-dot-yellow, #f7ba1e);
    }
    .dot-red {
      fill: var(--codeplayer-loading-dot-red, #f53f3f);
    }
    .code-path {
      fill: var(--codeplayer-brand, #006aff);
    }
  }
  .loading-text {
    color: var(--codeplayer-text-secondary, #666666);
  }
}
</style>
