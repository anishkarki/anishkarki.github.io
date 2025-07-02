const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.git') return; // ignore git directory
      results = results.concat(walk(p));
    } else if (entry.isFile() && p.endsWith('.md')) {
      results.push(p);
    }
  });
  return results;
}

function parseFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  let category = 'General';
  let title = path.basename(file);
  const tagMatch = lines[0].match(/\[(.*?)\]/);
  if (tagMatch) {
    category = tagMatch[1].trim();
  }
  for (const line of lines) {
    const m = line.match(/^#+\s*(.+)/);
    if (m) {
      title = m[1].replace(/\s*\[.*?\]\s*$/, '').trim();
      break;
    }
  }
  return { title, file: file.replace(/^\.\//, ''), category };
}

const files = walk('.');
const posts = files.map(parseFile);
fs.writeFileSync('posts.json', JSON.stringify(posts, null, 2));
