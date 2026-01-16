<template>
  <div class="app-type-switcher" :class="{ 'is-mobile': isMobile }">
    <div class="switcher-trigger" @click="toggleMenu" :class="{ active: isOpen }">
      <span class="label">模板:</span>
      <span class="value">{{ currentAppType }}</span>
      <svg class="arrow" :class="{ rotated: isOpen }" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
      </svg>
    </div>
    <Transition name="dropdown">
      <ul v-show="isOpen" class="type-list">
        <li 
          v-for="type in appTypes" 
          :key="type" 
          @click="selectType(type)" 
          :class="{ selected: type === currentAppType }"
        >
          <span class="type-icon">{{ getTypeIcon(type) }}</span>
          <span class="type-name">{{ type }}</span>
          <svg v-if="type === currentAppType" class="check-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        </li>
      </ul>
    </Transition>
  </div>
  <OnlineEditor :options="options" class="codeplayer-container"></OnlineEditor>
</template>

<script setup lang="ts">
import OnlineEditor, { OnlineEditorOptions, AppType } from 'online-editor';
import { ref, computed, onMounted, onUnmounted } from 'vue';

const MOBILE_BREAKPOINT = 768;

const appTypes = ['vue3', 'react', 'vue2', 'solid', 'svelte', 'ts', 'js'];
const storageKey = 'appType';
const THEME_STORAGE_KEY = 'onlineeditor_local_theme_key';

type Theme = 'light' | 'dark';

const resolveInitialTheme = (): Theme => {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('theme');
  if (fromUrl === 'light' || fromUrl === 'dark') {
    return fromUrl;
  }

  const fromStorage = localStorage.getItem(THEME_STORAGE_KEY);
  if (fromStorage === 'light' || fromStorage === 'dark') {
    return fromStorage;
  }

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
  return prefersDark ? 'dark' : 'light';
};

const initialTheme = resolveInitialTheme();

const isMobile = ref(window.innerWidth < MOBILE_BREAKPOINT);

const handleResize = () => {
  isMobile.value = window.innerWidth < MOBILE_BREAKPOINT;
};

const getTypeIcon = (type: string) => {
  const icons: Record<string, string> = {
    vue3: '🟢',
    vue2: '🟩',
    react: '⚛️',
    solid: '💠',
    svelte: '🔥',
    ts: '🔷',
    js: '🟨'
  };
  return icons[type] || '📄';
};

const urlParams = new URLSearchParams(window.location.search);
const typeFromUrl = urlParams.get('type');
const typeFromStorage = localStorage.getItem(storageKey);

let initialType = 'vue3';

if (typeFromUrl && appTypes.includes(typeFromUrl)) {
  initialType = typeFromUrl;
  localStorage.setItem(storageKey, typeFromUrl);
} else if (typeFromStorage && appTypes.includes(typeFromStorage)) {
  initialType = typeFromStorage;
}

const currentAppType = ref(initialType);
const isOpen = ref(false);

const options = computed<OnlineEditorOptions>(() => ({
  appType: currentAppType.value as AppType,
  theme: initialTheme,
  showEruda: true,
  openConsole: true,
  document: 'https://github.com/Huang-JunDong/code#readme',
  github: 'https://github.com/Huang-JunDong/code',
}));

const toggleMenu = () => {
  isOpen.value = !isOpen.value;
};

const selectType = (type: string) => {
  if (type === currentAppType.value) {
    isOpen.value = false;
    return;
  }

  currentAppType.value = type;
  localStorage.setItem(storageKey, type);
  isOpen.value = false;

  const cleanUrl = window.location.origin + window.location.pathname;


  if (window.location.href === cleanUrl) {
    window.location.reload();
  } else {
    window.location.href = cleanUrl;
  }
};


const closeMenu = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest('.app-type-switcher')) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', closeMenu);
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  document.removeEventListener('click', closeMenu);
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped lang="less">
@mobile-breakpoint: 768px;
@toolbar-height: 36px;

:global(body.codeplayer-theme-light) .app-type-switcher {
  --website-switcher-hover-bgc: rgba(0, 0, 0, 0.05);
  --website-switcher-list-hover-bgc: rgba(0, 0, 0, 0.06);
  --website-switcher-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

:global(body.codeplayer-theme-dark) .app-type-switcher {
  --website-switcher-hover-bgc: rgba(255, 255, 255, 0.08);
  --website-switcher-list-hover-bgc: rgba(255, 255, 255, 0.06);
  --website-switcher-shadow: 0 8px 24px rgba(0, 0, 0, 0.56);
}

.app-type-switcher {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  height: @toolbar-height;
  display: flex;
  align-items: center;
  z-index: 100;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  user-select: none;
}

.switcher-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  color: var(--codeplayer-text-secondary, #666);

  &:hover {
    background-color: var(--website-switcher-hover-bgc, rgba(0, 0, 0, 0.05));
    color: var(--codeplayer-main-color, #333);
  }

  &.active {
    background-color: var(--website-switcher-hover-bgc, rgba(0, 0, 0, 0.05));
    color: var(--codeplayer-brand, #0969da);
  }

  .label {
    color: var(--codeplayer-tertiary-color, #999);
    font-weight: 400;
    font-size: 12px;
  }

  .value {
    font-weight: 600;
    color: var(--codeplayer-brand, #0969da);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .arrow {
    color: var(--codeplayer-tertiary-color, #999);
    transition: transform 0.2s ease;
    margin-left: 2px;

    &.rotated {
      transform: rotate(180deg);
    }
  }
}

.type-list {
  position: absolute;
  top: calc(@toolbar-height + 4px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--codeplayer-float-bgc, #ffffff);
  border: 1px solid var(--codeplayer-border-color, #e1e4e8);
  border-radius: 8px;
  box-shadow: var(--website-switcher-shadow, 0 8px 24px rgba(0, 0, 0, 0.12));
  padding: 4px;
  list-style: none;
  min-width: 140px;

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 4px;
    font-size: 13px;
    color: var(--codeplayer-main-color, #333);
    transition: all 0.15s ease;

    .type-icon {
      font-size: 14px;
      width: 18px;
      text-align: center;
    }

    .type-name {
      flex: 1;
      text-transform: uppercase;
      font-weight: 500;
      letter-spacing: 0.3px;
    }

    .check-icon {
      color: var(--codeplayer-brand, #0969da);
    }

    &:hover {
      background-color: var(--website-switcher-list-hover-bgc, #f6f8fa);
    }

    &.selected {
      background-color: var(--website-switcher-hover-bgc, rgba(0, 0, 0, 0.05));
      color: var(--codeplayer-brand, #0969da);
    }
  }
}

// Dropdown 过渡动画
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: top center;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-6px) scale(0.96);
}

.dropdown-enter-to,
.dropdown-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}

// 移动端样式
.app-type-switcher.is-mobile {
  left: auto;
  right: 70px;
  transform: none;

  .switcher-trigger {
    padding: 4px 8px;
    gap: 4px;

    .label {
      display: none;
    }

    .value {
      font-size: 12px;
    }

    .arrow {
      width: 12px;
      height: 12px;
    }
  }

  .type-list {
    left: 0;
    right: auto;
    transform: none;
    min-width: 120px;

    li {
      padding: 8px 10px;
      gap: 6px;
      font-size: 12px;

      .type-icon {
        font-size: 12px;
        width: 16px;
      }

      .check-icon {
        width: 14px;
        height: 14px;
      }
    }
  }
}

// 移动端下拉动画调整
.app-type-switcher.is-mobile {
  .dropdown-enter-from,
  .dropdown-leave-to {
    transform: translateY(-6px) scale(0.96);
  }

  .dropdown-enter-to,
  .dropdown-leave-from {
    transform: translateY(0) scale(1);
  }
}

.codeplayer-container {
  max-height: 100vh;
  height: 100vh;
}

// 移动端全局适配
@media screen and (max-width: @mobile-breakpoint) {
  .codeplayer-container {
    border-radius: 0;
  }
}
</style>
