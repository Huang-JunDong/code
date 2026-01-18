import { MapFile } from '@/constant';

const indexHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Code</title>
  </head>
  <body>
    <div id="app"></div>
  </body>
  <script type="module">
    import './main.ts';
  </script>
</html>
`.trim();

const mainTs = `
import App from './App.svelte';
import './style.css';
import { mount } from 'svelte';

mount(App, {
  target: document.getElementById('app')!,
});
`.trim();

const appSvelte = `
<script>
  let count = 0;

  function increment() {
    count += 1;
  }

  function decrement() {
    count -= 1;
  }

  function reset() {
    count = 0;
  }
</script>

<main class="container">
  <h1>Hello Svelte!</h1>
  <p class="description">Cybernetically enhanced web apps with less code and no virtual DOM.</p>
  <div class="counter">
    <button class="btn btn-primary" on:click={decrement}>-</button>
    <span class="count">{count}</span>
    <button class="btn btn-primary" on:click={increment}>+</button>
  </div>
  <div class="actions">
    <button class="btn btn-secondary" on:click={reset}>Reset</button>
  </div>
</main>
`.trim();

const styleCss = `
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background: linear-gradient(135deg, #ff3e00 0%, #ff6b35 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.container {
  text-align: center;
  padding: 2rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  max-width: 400px;
  width: 90%;
}

h1 {
  color: #ff3e00;
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.description {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.counter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.count {
  font-size: 3rem;
  font-weight: bold;
  color: #ff3e00;
  min-width: 4rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  font-size: 1.25rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #ff3e00;
  color: white;
}

.btn-primary:hover {
  background: #ff5722;
  transform: scale(1.05);
}

.btn-primary:active {
  transform: scale(0.98);
}

.btn-secondary {
  background: #e8e8e8;
  color: #333;
}

.btn-secondary:hover {
  background: #d8d8d8;
}

.actions {
  margin-top: 1rem;
}
`.trim();

const importMap = `
{
  "imports": {
    "svelte": "https://esm.sh/svelte@5.46.4",
    "svelte/": "https://esm.sh/svelte@5.46.4/"
  }
}
`.trim();

export const SvelteTemplate = {
  'index.html': indexHtml,
  'main.ts': mainTs,
  'App.svelte': appSvelte,
  'style.css': styleCss,
  [MapFile]: importMap,
};
