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
import React from "react";
import { createRoot } from "react-dom/client";
import App from './App.tsx';

const root = createRoot(document.getElementById('app'));
root.render(<App />)
`.trim();

const appTsx = `
import React from 'react';
import { Button, Space } from 'antd';

const App: React.FC = () => (
  <Space wrap>
   
  </Space>
);

export default App;
`.trim();

const importMap = `
{
  "imports": {
    "react": "https://esm.sh/react@19.2.1",
    "react/": "https://esm.sh/react@19.2.1/",
    "react-dom": "https://esm.sh/react-dom@19.2.1",
    "react-dom/": "https://esm.sh/react-dom@19.2.1/",
    "antd": "https://esm.sh/antd@5.29.3?external=react,react-dom,@ant-design/colors,@ant-design/fast-color,@rc-component/mini-decimal,react-is&bundle",
    "@ant-design/icons": "https://esm.sh/@ant-design/icons@5.6.1?external=react,react-dom,@ant-design/colors",
    "@ant-design/colors": "https://fastly.jsdelivr.net/npm/@ant-design/colors@7.2.1/+esm",
    "@ant-design/fast-color": "https://fastly.jsdelivr.net/npm/@ant-design/fast-color@2.0.6/+esm",
    "@rc-component/mini-decimal": "https://fastly.jsdelivr.net/npm/@rc-component/mini-decimal@1.1.3/+esm",
    "antd-style": "https://esm.sh/antd-style@3.7.1?external=react,react-dom,antd",
    "antd-style/": "https://esm.sh/antd-style@3.7.1/",
    "react-is": "https://esm.sh/react-is@19.2.1",
    "react-is/": "https://esm.sh/react-is@19.2.1/"
  }
}
`.trim();

export const ReactTemplate = {
  'index.html': indexHtml,
  'main.tsx': mainTsx,
  'App.tsx': appTsx,
  [MapFile]: importMap,
};
