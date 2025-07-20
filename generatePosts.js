const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === 'node_modules') return; // ignore git and node_modules directories
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

  let category = 'General'; // Default category
  // Set title to the filename, removing the .md extension
  let title = path.basename(file, '.md');

  // Check for category in brackets on the first line
  const tagMatch = lines[0].match(/\[(.*?)\]/);
  if (tagMatch) {
    category = tagMatch[1].trim();
  }

  // Removed the loop that previously extracted title from Markdown heading.
  // The title is now consistently the filename.

  // Clean up the file path for web use (remove leading './' if present, normalize slashes)
  const webFilePath = file.replace(/^\.\//, '').replace(/\\/g, '/');

  return { title, file: webFilePath, category };
}

const files = walk('.');
const posts = files.map(parseFile);

// Sort posts by file path for consistent order
posts.sort((a, b) => a.file.localeCompare(b.file));

fs.writeFileSync('posts.json', JSON.stringify(posts, null, 2));

console.log('posts.json updated successfully with filenames as titles.');
console.log(`Found ${posts.length} Markdown files.`);