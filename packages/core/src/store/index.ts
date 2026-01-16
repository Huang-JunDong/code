import { reactive, watch } from 'vue';
import type { File } from '@/compiler';
import type { Control } from '@/type';
import { utoa } from '@/utils';
import { LocalThemeKey } from '@/constant';

export type Theme = 'light' | 'dark';
export type MobileView = 'code' | 'preview';

// 移动端断点
const MOBILE_BREAKPOINT = 768;

// 检测是否为移动端
const checkIsMobile = () => window.innerWidth < MOBILE_BREAKPOINT;

export interface Store {
  entry: string;
  activeFile: string;
  files: Record<string, File>;
  showToolbar: boolean;
  showFileBar: boolean;
  showCode: boolean;
  showPreview: boolean;
  showEruda: boolean;
  openConsole: boolean;
  reverse: boolean;
  excludeTools: Control[];
  editor: any | null; // code Mirror 编辑器
  rerenderID: number; // 用于 preview 刷新的标识，当点击刷新按钮该值 +1 触发刷新
  codeSize: number;
  vueVersion: 2 | 3;
  typescriptVersion: string;
  theme: Theme;
  reloadLanguageTools: (withMarkers?: boolean) => void;
  document: string;
  github: string;
  // 移动端相关
  isMobile: boolean;
  mobileView: MobileView;
  showMobileFileBar: boolean;
}

const params = new URLSearchParams(location.search);

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function safeParseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  for (let i = 0; i < 3; i++) {
    const decoded = safeDecodeURIComponent(value);
    try {
      return JSON.parse(decoded) as T;
    } catch {}
    try {
      return JSON.parse(value) as T;
    } catch {}
    if (decoded === value) {
      break;
    }
    value = decoded;
  }
  return fallback;
}

export const store = reactive<Store>({
  // 文件系统相关
  entry: safeDecodeURIComponent(params.get('entry') || 'index.html'),
  files: {},
  activeFile: safeDecodeURIComponent(params.get('activeFile') || ''),
  showToolbar: params.get('showToolbar') !== 'false',
  showFileBar: params.get('showFileBar') !== 'false',
  showCode: params.get('showCode') !== 'false',
  showPreview: params.get('showPreview') !== 'false',
  showEruda: params.get('showEruda') === 'true',
  openConsole: params.get('openConsole') === 'true',
  reverse: params.get('reverse') === 'true',
  excludeTools: safeParseJson<Control[]>(params.get('excludeTools'), []),
  editor: null,
  rerenderID: 0,
  codeSize: Number(params.get('codeSize') || 14),
  vueVersion: Number(params.get('vueVersion') || 3) as 2 | 3,
  typescriptVersion: '5.0.4',
  theme:
    (params.get('theme') as Theme) ||
    (localStorage.getItem(LocalThemeKey) as Theme) ||
    'light',
  reloadLanguageTools: () => {},
  document: safeDecodeURIComponent(params.get('document') || 'https://github.com'),
  github: safeDecodeURIComponent(params.get('github') || 'https://github.com'),
  // 移动端相关
  isMobile: checkIsMobile(),
  mobileView: 'code',
  showMobileFileBar: false,
});

// 监听窗口大小变化，更新移动端状态
const handleResize = () => {
  store.isMobile = checkIsMobile();
  // 切换到桌面端时，关闭移动端文件栏
  if (!store.isMobile) {
    store.showMobileFileBar = false;
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('resize', handleResize);
}

watch(
  () => store.files,
  (val) => {
    if (!val) {
      return;
    }
    const fileMap: Record<string, string> = {};
    for (let key in store.files) {
      fileMap[key] = store.files[key].code;
    }
    location.hash = utoa(JSON.stringify(fileMap));
  },
  { deep: true }
);

watch(
  () => store.theme,
  (val) => {
    document.body.className = `codeplayer-theme-${val}`;
  },
  { immediate: true }
);

function syncStoreToUrl(keys: string[]) {
  for (let key of keys) {
    watch(
      () => store[key as keyof typeof store],
      (val) => {
        if (val !== undefined) {
          const url = new URL(location.href);
          if (typeof val === 'object') {
            url.searchParams.set(key, JSON.stringify(val));
          } else {
            url.searchParams.set(key, String(val));
          }
          history.pushState({}, '', url);
        }
      },
      { deep: true }
    );
  }
}

syncStoreToUrl([
  'entry',
  'activeFile',
  'showToolbar',
  'showFileBar',
  'showCode',
  'showPreview',
  'showEruda',
  'openConsole',
  'reverse',
  'excludeTools',
  'codeSize',
  'theme',
]);
