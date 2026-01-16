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
    import './main.tsx';
  </script>
</html>
`.trim();

const mainTsx = `
import { render } from 'solid-js/web';
import App from './App.tsx';
import './style.css';

render(() => <App />, document.getElementById('app')!);
`.trim();

const appTsx = `
import { createSignal } from 'solid-js';

function App() {
  const [count, setCount] = createSignal(0);

  return (
    <main class="container">
      <h1>Hello Solid!</h1>
      <p class="description">A declarative, efficient, and flexible JavaScript library for building user interfaces.</p>
      <div class="counter">
        <button class="btn btn-primary" onClick={() => setCount(count() - 1)}>-</button>
        <span class="count">{count()}</span>
        <button class="btn btn-primary" onClick={() => setCount(count() + 1)}>+</button>
      </div>
      <div class="actions">
        <button class="btn btn-secondary" onClick={() => setCount(0)}>Reset</button>
      </div>
    </main>
  );
}

export default App;
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  color: #2c4f7c;
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
  color: #2c4f7c;
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
  background: #2c4f7c;
  color: white;
}

.btn-primary:hover {
  background: #335d92;
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
    "solid-js": "https://esm.sh/solid-js@1.8.7",
    "solid-js/": "https://esm.sh/solid-js@1.8.7/"
  }
}
`.trim();

export const SolidTemplate = {
  'index.html': indexHtml,
  'main.tsx': mainTsx,
  'App.tsx': appTsx,
  'style.css': styleCss,
  [MapFile]: importMap,
};
