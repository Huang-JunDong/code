export type HrType = {
  type: 'hr';
};

export type LiType = {
  type: 'li';
  text: string;
  disabled?: boolean;
  callback: EventListener;
  close?: boolean;
  uniqueActive?: boolean;
  arrow?: boolean;
};

export interface AttrsType {
  class?: string;
  style?: string | { [key: string]: string };
}

export type ItemType = AttrsType & ElementType;

export type UlType = {
  type: 'ul';
  text: string;
  disabled?: boolean;
  children: ItemType[];
};
export type ElementType = HrType | LiType | UlType;

type GetKeysType<T> = T extends ElementType ? keyof T : never;

type ElementKeysType = GetKeysType<ElementType>;

type MenuLifecycleHook = (this: any) => void;

export type ConfigType = {
  el: string | HTMLElement;
  mode?: 'contextmenu' | 'click'; // 模式, 默认为contextmenu
  theme?: string; // 主题样式, 默认为auto
  minWidth?: string | number; // 最小宽度
  maxWidth?: string | number; // 最大宽度
  include?: string[] | RegExp; // 包含的元素
  exclude?: string[] | RegExp; // 排除的元素
  defaultProps?: {
    // 默认参数配置项
    [key in ElementKeysType]?: string;
  };
  beforeInit?: MenuLifecycleHook; // 初始化前
  afterInit?: MenuLifecycleHook; // 初始化后
  beforeShow?: MenuLifecycleHook; // 显示菜单前
  afterShow?: MenuLifecycleHook; // 显示菜单后
  beforeHide?: MenuLifecycleHook; // 隐藏菜单前
  afterHide?: MenuLifecycleHook; // 隐藏菜单后
  color?: 'dark' | 'light';
};

export type OptionsType =
  | ItemType[]
  | ((e: Event, config: ConfigType) => ItemType[] | Promise<ItemType[]>);

export interface MenuElement extends HTMLElement {
  direction?: LayoutMenuDirection;
}

// type RequireKeys = 'el'
export const ConnectOffset = 5;

export const ATTR_LIST = ['class', 'style'];

export const SPLIT_SYMBOL = {
  class: ' ',
  style: ';',
};

export const enum LayoutMenuDirection {
  Left = -1,
  Right = 1,
}
