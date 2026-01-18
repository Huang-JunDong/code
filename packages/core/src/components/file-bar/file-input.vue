<script setup lang="ts">
import { ref, Ref, watch, nextTick } from 'vue';
const props = withDefaults(
  defineProps<{
    show: boolean;
    modelValue: string;
    error: string | null;
  }>(),
  {
    show: false,
    modelValue: '',
    error: null,
  }
);

const emit = defineEmits(['update:modelValue', 'handleKeyDown', 'handleBlur']);
const fileInputDOM = ref<HTMLInputElement>() as Ref<HTMLInputElement>;

watch(
  () => props.show,
  (val) => {
    if (val) {
      nextTick(() => {
        fileInputDOM.value.focus();
      });
    }
  },
  {
    immediate: true,
  }
);
</script>

<template>
  <div v-show="props.show" class="new-file-container">
    <input
      id="new-filename-input"
      ref="fileInputDOM"
      class="new-file-input"
      autoComplete="off"
      :value="props.modelValue"
      @input="(e) => emit('update:modelValue', (e.target as HTMLInputElement).value)"
      @keydown="(e) => emit('handleKeyDown', e)"
      @blur="() => emit('handleBlur')"
    />
    <div v-if="props.error" class="new-file-error">
      {{ props.error }}
    </div>
  </div>
</template>
<style scoped lang="less">
.new-file-container {
  height: 24px;
  position: relative;
  .new-file-input {
    width: 100%;
    box-sizing: border-box;
    outline: none;
    border: 1px solid var(--codeplayer-brand);
    height: 22px;
    font-size: 12px;
    padding-left: 4px;
    background-color: var(--codeplayer-filebar-bgc);
    color: var(--codeplayer-main-color);
  }
  .new-file-error {
    position: absolute;
    width: 100%;
    top: 24px;
    left: 0;
    font-size: 12px;
    color: @danger;
    border: 1px solid @danger-light-border;
    background-color: @danger-light-bg;
    text-align: center;
    padding: 3px;
    box-sizing: border-box;
  }
}
</style>
