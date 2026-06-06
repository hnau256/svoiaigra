const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

function read(name) {
  return fs.readFileSync(path.join(ROOT, name), 'utf-8');
}

function write(name, content) {
  fs.writeFileSync(path.join(ROOT, name), content, 'utf-8');
  console.log('  built: ' + name);
}

function build(target) {
  const sharedCSS = read('src/shared/styles.css');
  const sharedJS = read('src/shared/data.js');
  const targetCSS = read('src/' + target + '/styles.css');
  const targetJS = read('src/' + target + '/index.js');

  const titles = { editor: 'Редактор вопросов', game: 'Своя игра' };

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titles[target]}</title>
<style>
${sharedCSS}
${targetCSS}
</style>
</head>
<body>
<div id="app"></div>
<div id="modal-container"></div>
<script>
${sharedJS}
${targetJS}
</script>
</body>
</html>`;

  write(target + '.html', html);
}

console.log('Building...');
build('editor');
build('game');
console.log('Done.');
