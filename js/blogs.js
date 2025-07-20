document.addEventListener('DOMContentLoaded', function() {
  fetch('posts.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(posts => {
      const blogListDiv = document.getElementById('blog-list'); // Ensure this div exists in your HTML
      const ul = document.createElement('ul');

      function createListItem(post) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = post.file;
        // Since generatePosts.js now sets post.title to the filename,
        // this line will correctly use the filename as the link text.
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
            // Pass the original post object, which now has filename in `title`
            folders[folderName].push(post); 
            // Also update the file path for nested structure if needed
            post.file = parts.slice(1).join('/'); 

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
      document.getElementById('blog-list').textContent = 'Could not load blog posts. Make sure posts.json is generated.';
    });
});