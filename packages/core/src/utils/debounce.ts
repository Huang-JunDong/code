export function debounce<T extends (...args: any[]) => any>(fn: T, n = 100) {
  let handle: any;
  return (...args: Parameters<T>) => {
    if (handle) clearTimeout(handle);
    handle = setTimeout(() => {
      fn(...args);
    }, n);
  };
}
