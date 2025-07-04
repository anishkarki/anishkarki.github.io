document.addEventListener('DOMContentLoaded', () => {
  fetch('posts.json')
    .then(res => res.json())
    .then(posts => renderPosts(posts));
});

function renderPosts(posts) {
  const params = new URLSearchParams(window.location.search);
  const postFile = params.get('post');
  const content = document.getElementById('content');

  if (postFile) {
    const post = posts.find(p => p.file === postFile);
    if (post) {
      const heading = document.createElement('h2');
      heading.className = 'mb-4';
      heading.textContent = post.title;
      content.appendChild(heading);
    }
    fetch(postFile)
      .then(res => res.text())
      .then(md => {
        const article = document.createElement('div');
        article.innerHTML = marked.parse(md);
        content.appendChild(article);
      });
    return;
  }

  // Group posts by category
  const categories = {};
  posts.forEach(p => {
    if (!categories[p.category]) {
      categories[p.category] = [];
    }
    categories[p.category].push(p);
  });

  Object.keys(categories).forEach(cat => {
    const section = document.createElement('section');
    section.className = 'mb-5';

    const header = document.createElement('h3');
    header.className = 'mb-3';
    header.textContent = cat;
    section.appendChild(header);

    const list = document.createElement('ul');
    list.className = 'list-group';

    categories[cat].forEach(post => {
      const item = document.createElement('li');
      item.className = 'list-group-item';

      const link = document.createElement('a');
      link.href = `blog.html?post=${encodeURIComponent(post.file)}`;
      link.textContent = post.title;

      item.appendChild(link);
      list.appendChild(item);
    });

    section.appendChild(list);
    content.appendChild(section);
  });
}
