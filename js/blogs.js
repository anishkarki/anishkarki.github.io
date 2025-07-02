document.addEventListener('DOMContentLoaded', () => {
  const posts = [
    {
      title: 'Migration of SQL Server On-Premise to Azure',
      file: 'DP-300_1.md',
      category: 'Azure'
    },
    {
      title: 'DP-300: Optimisation and Automation of Azure',
      file: 'DP-300-2.md',
      category: 'Azure'
    },
    {
      title: 'High Availability and Disaster Recovery',
      file: 'Dp-300-3.md',
      category: 'High Availability'
    },
    {
      title: 'Only HA and DR solutions in SQL Server',
      file: 'Only_HA.md',
      category: 'High Availability'
    },
    {
      title: 'The modern SQL Server DBA - HandBook',
      file: 'DatabaseAdmin/Interviewprep1.md',
      category: 'SQL Server'
    },
    {
      title: 'Mail is vital',
      file: 'DatabaseAdmin/AllaboutAvailabiilty.md',
      category: 'SQL Server'
    },
    {
      title: 'SQL Server architecture',
      file: 'DatabaseAdmin/interviewprep2.md',
      category: 'SQL Server'
    },
    {
      title: 'Interview Prep Day 3 - SQL Server',
      file: 'DatabaseAdmin/interviewprep3.md',
      category: 'SQL Server'
    },
    {
      title: 'All Scenario Based',
      file: 'DatabaseAdmin/interviewprep4.md',
      category: 'SQL Server'
    },
    {
      title: 'Database Backups',
      file: 'DatabaseAdmin/backupsinfo.md',
      category: 'Backup'
    },
    {
      title: 'Query Examples',
      file: 'DatabaseAdmin/Queries.md',
      category: 'Queries'
    },
    {
      title: 'Plan Change Simulation',
      file: 'DatabaseAdmin/SimulatingPlanchange.md',
      category: 'SQL Server'
    },
    {
      title: 'Installing Always on Availability Group in Docker',
      file: 'DatabaseAdmin/setup_ag_docker.md',
      category: 'Docker'
    }
  ];

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
});
