<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue';
import { store } from '@/store';
import { message } from '@/utils';
import tippy from 'tippy.js';
import type { Instance, Props } from 'tippy.js';
import { TooltipText } from '@/constant';

const reference = ref();
let tippyDOM: Instance<Props> | undefined;

onMounted(() => {
  watch(
    () => store.theme,
    () => {
      if (tippyDOM) {
        tippyDOM.destroy();
      }
      tippyDOM = tippy(reference.value, {
        content: TooltipText.CopyCode,
        placement: 'bottom',
        arrow: false,
        theme: store.theme === 'dark' ? '' : 'light',
      }) as unknown as Instance<Props>;
    },
    { immediate: true }
  );
});

const copied = ref(false);
let timer: any;

function copyCode() {
  try {
    if (timer) {
      clearTimeout(timer);
    }
    const code = store.files[store.activeFile].code || '';
    navigator.clipboard.writeText(code);
    copied.value = true;
    timer = setTimeout(() => {
      copied.value = false;
    }, 3000);
  } catch (error) {
    message('复制失败: ' + String(error), { type: 'danger' });
  }
}
</script>

<template>
  <div
    v-if="!store.excludeTools.includes('copy')"
    ref="reference"
    @click="copyCode"
    class="toolbar-icon copy-code-icon"
    role="button"
    :aria-label="copied ? '已复制' : '复制代码'"
    tabindex="0"
    @keydown.enter="copyCode"
    @keydown.space.prevent="copyCode"
  >
    <div class="copied-box" v-if="copied">
      <span>已复制</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="16"
        height="16"
      >
        <path
          fill="currentColor"
          d="M10.0007 15.1709L19.1931 5.97852L20.6073 7.39273L10.0007 17.9993L3.63672 11.6354L5.05093 10.2212L10.0007 15.1709Z"
        ></path>
      </svg>
    </div>
    <svg
      v-else
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="16"
      height="15"
    >
      <path
        fill="currentColor"
        d="M7 6V3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3v3c0 .552-.45 1-1.007 1H4.007A1.001 1.001 0 0 1 3 21l.003-14c0-.552.45-1 1.006-1H7zM5.002 8L5 20h10V8H5.002zM9 6h8v10h2V4H9v2zm-2 5h6v2H7v-2zm0 4h6v2H7v-2z"
      />
    </svg>
  </div>
</template>

<style scoped lang="less">
@import './icon.less';

.copy-code-icon {
  width: auto;
  font-size: 12px;
  white-space: nowrap;
  flex-wrap: nowrap;
  padding: 4px 8px;
  &:hover {
    color: var(--codeplayer-text-secondary);
  }
  &:active {
    color: var(--codeplayer-text-secondary);
  }
}
.copied-box {
  display: flex;
  align-items: center;
  color: var(--codeplayer-brand);
  padding: 0 4px 0 6px;
  cursor: pointer;
  user-select: none;
}
</style>
