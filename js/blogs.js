document.addEventListener('DOMContentLoaded', function() {
  fetch('posts.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(posts => {
      const blogListDiv = document.getElementById('blog-list');
      const ul = document.createElement('ul');

      function createListItem(post) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = post.file;
        a.textContent = post.title;
        li.appendChild(a);
        return li;
      }

      function buildNestedList(data, parentUl) {
        const folders = {};

        data.forEach(post => {
          const parts = post.file.split('/');
          if (parts.length > 1) {
            const folderName = parts[0];
            if (!folders[folderName]) {
              folders[folderName] = [];
            }
            folders[folderName].push({
              title: post.title,
              file: parts.slice(1).join('/') // Path relative to the folder
            });
          } else {
            parentUl.appendChild(createListItem(post));
          }
        });

        for (const folderName in folders) {
          const folderLi = document.createElement('li');
          folderLi.textContent = folderName + '/';
          const subUl = document.createElement('ul');
          buildNestedList(folders[folderName], subUl); // Recursively build sub-folders
          folderLi.appendChild(subUl);
          parentUl.appendChild(folderLi);
        }
      }

      buildNestedList(posts, ul);
      blogListDiv.appendChild(ul);
    })
    .catch(error => {
      console.error('Error fetching or parsing posts.json:', error);
      document.getElementById('blog-list').textContent = 'Could not load blog posts.';
    });
});