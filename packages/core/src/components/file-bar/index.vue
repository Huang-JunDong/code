<script setup lang="ts">
import { ref, computed } from 'vue';
import { File } from '@/compiler';
import { store } from '@/store';
import AddFile from './icons/add-file.vue';
import FileInput from './file-input.vue';
import FileList from './file-list.vue';

const newFilename = ref('');
const originFilename = ref('');
const showNewFile = ref(false);

// 切换文件
const changeActiveFile = (filename: string) => {
  store.activeFile = filename;
  // 移动端选择文件后自动关闭抽屉
  if (store.isMobile) {
    store.showMobileFileBar = false;
  }
};

// 处理(新增/更改)文件
const changeFile = (newFilename: string, oldFilename: string) => {
  if (!oldFilename) {
    // add a new file
    const file = new File(newFilename, '');
    store.files[newFilename] = file;
    changeActiveFile(newFilename);
    if (!store.entry) {
      store.entry = newFilename;
    }
  } else {
    // rename filename - 使用新文件名创建新的 File 实例
    const oldFile = store.files[oldFilename];
    const renamedFile = new File(newFilename, oldFile.code);
    // 复制 editorViewState 如果存在
    if (oldFile.editorViewState) {
      renamedFile.editorViewState = oldFile.editorViewState;
    }
    const tempFiles: Record<string, InstanceType<typeof File>> = {};
    for (const key in store.files) {
      if (key !== oldFilename) {
        tempFiles[key] = store.files[key];
      }
    }
    tempFiles[newFilename] = renamedFile;
    store.files = tempFiles;
    changeActiveFile(newFilename);
    if (oldFilename === store.entry) {
      store.entry = newFilename;
    }
  }
};

// 文件名编辑完成
const handleFilenameChange = () => {
  // 如果文件名为空或未修改，不执行任何操作
  if (!newFilename.value || newFilename.value === originFilename.value) {
    newFilename.value = '';
    originFilename.value = '';
    showNewFile.value = false;
    return;
  }
  if (validateFilenameError(newFilename.value) === null) {
    changeFile(newFilename.value, originFilename.value);
  }
  newFilename.value = '';
  originFilename.value = '';
  showNewFile.value = false;
};

// 点击重命名文件
const handleEditFilename = (_originFilename?: string) => {
  originFilename.value = _originFilename || '';
  newFilename.value = originFilename.value;
  showNewFile.value = true;
};

// 处理文件 key down
const handleFilenameKeyDown = ({ key, target }: KeyboardEvent) => {
  if (key === 'Enter') {
    (target as HTMLInputElement).blur();
  }
};

// 校验文件名是否合法
const validateFilenameError = (filename: string): string | null => {
  if (!filename || filename === originFilename.value) {
    return null;
  }
  if (store.files[filename]) {
    return `已存在同名文件 ${filename}`;
  }
  return null;
};

const newFileError = computed(() => {
  return validateFilenameError(newFilename.value);
});
</script>

<template>
  <div :class="`codeplayer-files-container`">
    <div class="files-container">
      <div class="files-head">
        <div class="files-head-left">文件</div>
        <div class="files-head-right">
          <AddFile @click="() => handleEditFilename()" />
        </div>
      </div>
      <!-- 新增文件输入框: -->
      <FileInput
        v-model="newFilename"
        :show="showNewFile && !originFilename"
        :error="newFileError"
        @handle-blur="handleFilenameChange"
        @handle-key-down="handleFilenameKeyDown"
      />
      <FileList
        v-model:model-value="newFilename"
        :origin-filename="originFilename"
        :error="newFileError"
        @change-active-file="changeActiveFile"
        @handle-click-rename="handleEditFilename"
        @handle-filename-change="handleFilenameChange"
        @handle-filename-key-down="handleFilenameKeyDown"
      />
    </div>
  </div>
</template>

<style scoped lang="less">
.codeplayer-files-container {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  height: 100%;
  font-family: @font-family;
  background-color: var(--codeplayer-filebar-bgc);
  .files-container {
    width: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: 100%;
    position: relative;

    .files-head {
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 4px;
      color: var(--codeplayer-text-secondary);
      font-weight: 500;
      font-size: 12px;
      user-select: none;
      .files-head-left {
        font-size: @font-size-default;
        line-height: 20px;
      }
      .files-head-right {
        display: flex;
        align-items: center;
      }
    }
  }
}
</style>
