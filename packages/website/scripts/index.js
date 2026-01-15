const fs = require('fs');
const path = require('path');

const directoryPath = path.resolve(__dirname, '../dist');

function replaceWorkerUrls(filePath) {
  let data = fs.readFileSync(filePath, 'utf8');
  const workerPattern = /new Worker\(""\+new URL\(""\+new URL\("([^"]+\.js)",import\.meta\.url\)\.href,self\.location\)\.href\)/g;
  const newData = data.replace(workerPattern, (match, workerPath) => {
    return `new Worker(URL.createObjectURL(new Blob([\`importScripts("\${new URL("${workerPath}",location.href).href}")\`],{type:"text/javascript"})))`;
  });
  if (newData !== data) {
    fs.writeFileSync(filePath, newData, 'utf8');
    console.log('Updated:', filePath);
  }
}

function traverseDirectory(dir) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      traverseDirectory(filePath);
    } else if (file.endsWith('.js')) {
      replaceWorkerUrls(filePath);
    }
  });
}

traverseDirectory(directoryPath);
