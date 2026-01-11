const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, 'Posts');
const outputFile = path.join(__dirname, 'posts.json');

// Helper to recursively get files
function getAllFiles(dirPath, arrayOfFiles) {
    files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else {
            if (file.toLowerCase().endsWith('.md')) {
                arrayOfFiles.push(fullPath);
            }
        }
    });

    return arrayOfFiles;
}

try {
    const allFiles = getAllFiles(postsDir);
    const posts = [];
    let idCounter = 1;

    console.log(`Found ${allFiles.length} markdown files.`);

    allFiles.forEach(filePath => {
        const content = fs.readFileSync(filePath, 'utf8');

        // Skip empty files
        if (!content || content.trim().length === 0) {
            console.log(`Skipping empty file: ${filePath}`);
            return;
        }

        // Calculate relative path for URL
        const relativePath = path.relative(__dirname, filePath).replace(/\\/g, '/');

        // Default Metadata
        let title = path.basename(filePath, '.md');
        // Beautify title if it's just a filename (replace -/_ with space, title case)
        if (title.match(/[-_]/)) {
            title = title.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }

        let excerpt = '';
        let date = fs.statSync(filePath).mtime.toISOString(); // Default to file modification time
        let category = 'General';
        let tags = [];
        let readTime = '5 min read';

        // Parse Frontmatter if exists
        // Frontmatter is between first two --- lines
        const fmRegex = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/;
        const fmMatch = content.match(fmRegex);

        let contentBody = content;

        if (fmMatch) {
            contentBody = content.replace(fmMatch[0], ''); // Remove frontmatter from body
            const fm = fmMatch[1];

            // Extract fields
            const titleMatch = fm.match(/title:\s*(.*)/i);
            if (titleMatch) title = titleMatch[1].replace(/^["']|["']$/g, '').trim();

            const dateMatch = fm.match(/date:\s*(.*)/i);
            if (dateMatch) {
                const parsedDate = new Date(dateMatch[1]);
                if (!isNaN(parsedDate)) date = parsedDate.toISOString();
            }

            const catMatch = fm.match(/category:\s*(.*)/i);
            if (catMatch) category = catMatch[1].trim();

            // Extract tags: tags: [a, b] or tags:\n - a
            const tagsMatch = fm.match(/tags:\s*\[(.*?)\]/is);
            if (tagsMatch) {
                tags = tagsMatch[1].split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
            } else {
                // Try list format
                const tagsListMatch = fm.match(/tags:\s*\n((?:\s*-\s*.*\n?)+)/i);
                if (tagsListMatch) {
                    tags = tagsListMatch[1].split('\n').map(l => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean);
                }
            }

            const excMatch = fm.match(/excerpt:\s*(.*)/i);
            if (excMatch) excerpt = excMatch[1].trim();
        } else {
            // Fallback: Try to find first H1 for title
            const h1Match = content.match(/^#\s+(.+)$/m);
            if (h1Match) {
                title = h1Match[1].trim();
                // contentBody = content.replace(h1Match[0], ''); // Don't remove title from content, usually useful
            }
        }

        // Infer category from directory if generic
        if (category === 'General') {
            const parentDir = path.basename(path.dirname(filePath));
            if (parentDir !== 'Posts') {
                category = parentDir;
                // Beautify category
                category = category.replace(/([A-Z])/g, ' $1').trim(); // Split CamelCase
            }
        }

        // Generate Excerpt if missing
        if (!excerpt) {
            // Remove markdown symbols #, *, [, ]
            const plainText = contentBody.replace(/[#*\[\]`]/g, '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
            excerpt = plainText.substring(0, 200).trim() + '...';
        }

        // Calculate Read Time
        const words = contentBody.split(/\s+/).length;
        readTime = Math.ceil(words / 200) + ' min read';

        // Ensure tags has at least category
        if (tags.length === 0) tags = [category];

        posts.push({
            id: idCounter++,
            title: title,
            excerpt: excerpt,
            content: contentBody, // Include full content for search
            category: category,
            tags: tags,
            date: date,
            author: 'Anish Karki',
            featured: false, // User requested no featured for now
            readTime: readTime,
            file: relativePath
        });
    });

    // Write JSON
    fs.writeFileSync(outputFile, JSON.stringify(posts, null, 2));
    console.log(`Successfully generated posts.json with ${posts.length} posts.`);

} catch (err) {
    console.error('Error regenerating posts:', err);
}
