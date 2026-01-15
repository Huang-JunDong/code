<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue';
import { store } from '@/store';
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
        content: TooltipText.FormatCode,
        placement: 'bottom',
        arrow: false,
        theme: store.theme === 'dark' ? '' : 'light',
      }) as unknown as Instance<Props>;
    },
    { immediate: true }
  );
});
</script>

<template>
  <div
    v-if="!store.excludeTools.includes('format')"
    ref="reference"
    class="toolbar-icon format-code-icon"
    role="button"
    aria-label="格式化代码"
    tabindex="0"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
      <path
        fill="currentColor"
        d="M4 19h6v-2H4v2zM20 5H4v2h16V5zm-3 6H4v2h13.25c1.1 0 2 .9 2 2s-.9 2-2 2H15v-2l-3 3l3 3v-2h2c2.21 0 4-1.79 4-4s-1.79-4-4-4z"
      />
    </svg>
  </div>
</template>

<style scoped lang="less">
@import './icon.less';

.format-code-icon {
  width: auto;
  font-size: 12px;
  white-space: nowrap;
  flex-wrap: nowrap;
  padding: 4px 8px;
  &:hover {
    color: var(--codeplayer-brand-active);
  }
}
</style>
