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
  </body>
  <script type="module">
    import './index.ts';
  </script>
</html>
`.trim();

const indexTs = `
import "layui/dist/css/layui.css";
import "layui";

const { layer } = window['layui'];
`.trim();

const importMap = `
{
  "imports": {
    "layui": "https://esm.sh/layui@2.9.8",
    "layui/": "https://esm.sh/layui@2.9.8/"
  }
}
`.trim();

export const TsTemplate = {
  'index.html': indexHtml,
  'index.ts': indexTs,
  [MapFile]: importMap,
};
