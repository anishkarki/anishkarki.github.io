// Cheatsheet Viewer JS
document.addEventListener('DOMContentLoaded', function() {
  loadCheatsheet();
});

let cheatsheetData = null;

async function loadCheatsheet() {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'));
  
  if (!id) {
    showError('No cheatsheet specified');
    return;
  }
  
  try {
    // Load cheatsheets.json to get metadata
    const response = await fetch('cheatsheets.json');
    const cheatsheets = await response.json();
    
    cheatsheetData = cheatsheets.find(c => c.id === id);
    
    if (!cheatsheetData) {
      showError('Cheatsheet not found');
      return;
    }
    
    // Update page title
    document.title = `${cheatsheetData.title} | Anish Karki`;
    document.getElementById('cheatsheet-title').textContent = cheatsheetData.title;
    
    // Update meta info
    const meta = document.getElementById('cheatsheet-meta');
    const date = new Date(cheatsheetData.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    const tags = cheatsheetData.tags.map(t => `<span class="meta-tag">${t}</span>`).join('');
    meta.innerHTML = `
      <span><i class="far fa-calendar"></i> ${date}</span>
      <span><i class="far fa-user"></i> ${cheatsheetData.author}</span>
      <span>${tags}</span>
    `;
    
    // Load markdown content
    const mdResponse = await fetch(cheatsheetData.file);
    if (!mdResponse.ok) throw new Error('Failed to load markdown');
    
    const markdown = await mdResponse.text();
    renderContent(markdown);
    
  } catch (error) {
    console.error('Error loading cheatsheet:', error);
    showError('Failed to load cheatsheet');
  }
}

function renderContent(markdown) {
  const content = document.getElementById('cheatsheet-content');
  
  // Configure marked
  marked.setOptions({
    highlight: function(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(code, { language: lang }).value;
        } catch (e) {}
      }
      return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true
  });
  
  // Render markdown
  content.innerHTML = marked.parse(markdown);
  
  // Generate TOC
  generateTOC();
  
  // Setup copy and print buttons
  setupActions();
  
  // Add smooth scroll for anchor links
  content.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

function generateTOC() {
  const content = document.getElementById('cheatsheet-content');
  const tocList = document.getElementById('toc-list');
  const headings = content.querySelectorAll('h2, h3');
  
  if (headings.length === 0) {
    document.getElementById('toc-sidebar').style.display = 'none';
    return;
  }
  
  let tocHTML = '';
  
  headings.forEach((heading, index) => {
    // Add ID if not present
    if (!heading.id) {
      heading.id = `section-${index}`;
    }
    
    const level = heading.tagName.toLowerCase();
    const text = heading.textContent;
    
    tocHTML += `
      <li>
        <a href="#${heading.id}" class="toc-${level}">${text}</a>
      </li>
    `;
  });
  
  tocList.innerHTML = tocHTML;
  
  // Add click handlers
  tocList.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Update active state
        tocList.querySelectorAll('a').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      }
    });
  });
  
  // Scroll spy
  setupScrollSpy(headings);
}

function setupScrollSpy(headings) {
  const tocLinks = document.querySelectorAll('.toc-list a');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        tocLinks.forEach(link => link.classList.remove('active'));
        const activeLink = document.querySelector(`.toc-list a[href="#${entry.target.id}"]`);
        if (activeLink) activeLink.classList.add('active');
      }
    });
  }, {
    rootMargin: '-100px 0px -70% 0px'
  });
  
  headings.forEach(heading => observer.observe(heading));
}

function setupActions() {
  const copyBtn = document.getElementById('copyAllBtn');
  const printBtn = document.getElementById('printBtn');
  
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const content = document.getElementById('cheatsheet-content');
      navigator.clipboard.writeText(content.innerText).then(() => {
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
          copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy All';
        }, 2000);
      });
    });
  }
  
  if (printBtn) {
    printBtn.addEventListener('click', () => window.print());
  }
}

function showError(message) {
  document.getElementById('cheatsheet-title').textContent = 'Error';
  document.getElementById('cheatsheet-content').innerHTML = `
    <div class="error-state" style="text-align: center; padding: 4rem 2rem;">
      <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--cs-error); margin-bottom: 1rem;"></i>
      <h3 style="color: var(--cs-text-primary);">${message}</h3>
      <p style="color: var(--cs-text-muted);">Please go back and try again.</p>
      <a href="cheatsheets.html" class="back-btn" style="margin-top: 1rem;">
        <i class="fas fa-arrow-left"></i> Back to Cheatsheets
      </a>
    </div>
  `;
}
