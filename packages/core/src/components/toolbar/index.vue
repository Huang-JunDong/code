<script setup lang="ts">
import { computed } from 'vue';
import { store } from '@/store';
import SettingIcon from './icons/setting.vue';
import RefreshIcon from './icons/refresh.vue';
import ShareIcon from './icons/share.vue';
import DocsIcon from './icons/docs.vue';
import GithubIcon from './icons/git.vue';
import CopyIcon from './icons/copy.vue';
import ConsoleIcon from './icons/console.vue';

const showDivider = computed(() => {
  if (
    store.excludeTools.includes('docs') &&
    store.excludeTools.includes('github')
  ) {
    return false;
  }
  if (
    store.excludeTools.includes('refresh') &&
    store.excludeTools.includes('share') &&
    store.excludeTools.includes('copy') &&
    store.excludeTools.includes('console')
  ) {
    return false;
  }
  return true;
});

const toggleMobileFileBar = () => {
  store.showMobileFileBar = !store.showMobileFileBar;
};
</script>

<template>
  <div class="codeplayer-toolbar" :class="`codeplayer-toolbar-top`">
    <div class="toolbar-left">
      <!-- 移动端显示文件栏切换按钮 -->
      <button 
        v-if="store.isMobile && store.showFileBar" 
        class="mobile-menu-btn"
        @click="toggleMobileFileBar"
        title="文件列表"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        </svg>
      </button>
      <SettingIcon />
    </div>
    <div class="toolbar-right">
      <DocsIcon />
      <GithubIcon />
      <div class="vertical-divider" v-if="showDivider && !store.isMobile"></div>
      <ConsoleIcon />
      <CopyIcon />
      <RefreshIcon />
      <ShareIcon />
    </div>
  </div>
</template>

<style scoped lang="less">
.codeplayer-toolbar {
  height: 36px;
  min-height: 36px;
  box-sizing: border-box;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  order: 1;
  border-bottom: 1px solid var(--codeplayer-border-color);
  background-color: var(--codeplayer-toolbar-bgc);
  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: @gap-1;
    .vertical-divider {
      width: 0;
      height: 15px;
      margin: 0 6px;
      border-right: 1px solid var(--codeplayer-tertiary-color);
    }
  }
  .mobile-menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    color: var(--codeplayer-secondary-color);
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s ease;

    &:hover {
      background-color: var(--codeplayer-hover-bgc);
      color: var(--codeplayer-main-color);
    }

    &:active {
      background-color: var(--codeplayer-active-bgc);
    }
  }
}
</style>
