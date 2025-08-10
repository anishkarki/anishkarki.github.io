document.addEventListener('DOMContentLoaded', function () {
  createParticles();

  fetch('posts.json')
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then(posts => {
      const blogListDiv = document.getElementById('blog-list');
      blogListDiv.classList.remove('loading');
      blogListDiv.innerHTML = '';
      const rootUl = document.createElement('ul');
      buildPostTree(posts, rootUl);
      blogListDiv.appendChild(rootUl);
    })
    .catch(error => {
      console.error('Error fetching or parsing posts.json:', error);
      document.getElementById('blog-list').innerHTML = `
        <div class="error">
          <i class="fas fa-exclamation-triangle"></i><br>
          Could not load blog posts. Make sure posts.json is valid.
        </div>`;
    });

  function buildPostTree(posts, parentUl) {
    const tree = {};

    posts.forEach(post => {
      const pathParts = post.file.split('/');
      let current = tree;

      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        if (!current[part]) {
          current[part] = (i === pathParts.length - 1) ? post : {};
        }
        current = current[part];
      }
    });

    generateTreeDOM(tree, parentUl);
  }

  function generateTreeDOM(tree, parentUl) {
    Object.entries(tree).forEach(([name, node]) => {
      const li = document.createElement('li');

      if (typeof node === 'object' && !node.title) {
        const folderSpan = document.createElement('span');
        folderSpan.textContent = name;
        li.appendChild(folderSpan);

        const nestedUl = document.createElement('ul');
        generateTreeDOM(node, nestedUl);
        li.appendChild(nestedUl);
      } else {
        const link = document.createElement('a');
        link.href = `post.html?file=${encodeURIComponent(node.file)}`;
        link.textContent = node.title || name.replace(/\.md$/, '');
        link.target = '_blank';
        li.appendChild(link);
      }

      parentUl.appendChild(li);
    });
  }
});