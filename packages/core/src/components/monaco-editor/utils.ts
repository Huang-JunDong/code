import { Uri, editor } from 'monaco-editor';

export function getOrCreateModel(uri: Uri, lang: string | undefined, value: string) {
  const model = editor.getModel(uri);
  if (model) {
    // 确保语言正确设置
    if (lang && model.getLanguageId() !== lang) {
      editor.setModelLanguage(model, lang);
    }
    if (model.getValue() !== value) {
      model.setValue(value);
    }
    return model;
  }
  return editor.createModel(value, lang, uri);
}
