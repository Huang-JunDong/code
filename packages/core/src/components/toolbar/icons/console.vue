<script lang="ts" setup>
import { store } from '@/store';
import { onMounted, ref, watch } from 'vue';
import tippy from 'tippy.js';
import type { Instance, Props } from 'tippy.js';
import { TooltipText } from '@/constant';

const reference = ref();
let tippyDOM: Instance<Props> | undefined;

onMounted(() => {
  watch(
    () => [store.theme, store.openConsole],
    () => {
      if (tippyDOM) {
        tippyDOM.destroy();
      }
      tippyDOM = tippy(reference.value, {
        content: TooltipText.ToggleConsole(store.openConsole),
        placement: 'bottom',
        arrow: false,
        theme: store.theme === 'dark' ? '' : 'light',
      }) as unknown as Instance<Props>;
    },
    { immediate: true }
  );
});

function toggle() {
  store.openConsole = !store.openConsole;
}
</script>

<template>
  <div
    v-if="!store.excludeTools.includes('console')"
    ref="reference"
    @click="toggle"
    class="toolbar-icon"
    :class="{ active: store.openConsole }"
    role="button"
    :aria-label="TooltipText.ToggleConsole(store.openConsole)"
    tabindex="0"
    @keydown.enter="toggle"
    @keydown.space.prevent="toggle"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="18"
      height="18"
    >
      <path
        fill="currentColor"
        d="M20,19V7H4V19H20M20,5A2,2 0 0,1 22,7V19A2,2 0 0,1 20,21H4A2,2 0 0,1 2,19V7C2,5.89 2.9,5 4,5H20M13,17V15H18V17H13M9.58,13L5.57,9H8.4L11.7,12.3C12.09,12.69 12.09,13.33 11.7,13.72L8.42,17H5.59L9.58,13Z"
      />
    </svg>
  </div>
</template>
<style scoped lang="less">
@import './icon.less';
.active {
  color: var(--codeplayer-brand);
  background-color: var(--codeplayer-icon-hover-bgc);
}
</style>
