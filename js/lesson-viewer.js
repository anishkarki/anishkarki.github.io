// js/lesson-viewer.js

let lessonsData = null;

async function loadLessonsData() {
  try {
    const response = await fetch('lesson-data.json');
    if (!response.ok) throw new Error('Failed to load lesson data');
    lessonsData = await response.json();
    initializeViewer();
  } catch (err) {
    console.error('Error loading lesson-data.json:', err);
    document.getElementById('lesson-content').innerHTML = 
      `<p class="text-danger">Failed to load course data.</p>`;
  }
}

function initializeViewer() {
  const urlParams = new URLSearchParams(window.location.search);
  const courseKey = urlParams.get('course');
  const fileName = urlParams.get('file');

  if (!courseKey || !fileName || !lessonsData?.[courseKey]) {
    document.getElementById('lesson-content').innerHTML = '<p class="text-danger">Invalid lesson.</p>';
    return;
  }

  const course = lessonsData[courseKey];
  const chapter = course.chapters.find(ch => ch.file === fileName);
  if (!chapter) {
    document.getElementById('lesson-content').innerHTML = '<p class="text-danger">Chapter not found.</p>';
    return;
  }

  // Update page title
  document.title = `${chapter.title} | ${course.title} | Anish Karki`;

  // Update UI
  document.getElementById('lesson-title').textContent = chapter.title;
  
  // Render meta info with icons
  const metaEl = document.getElementById('lesson-meta');
  if (metaEl) {
    metaEl.innerHTML = `
      <span class="meta-item">
        <i class="fas fa-book"></i>
        ${course.title}
      </span>
      <span class="meta-item">
        <i class="fas fa-clock"></i>
        ${chapter.duration}
      </span>
      <span class="meta-item">
        <i class="fas fa-layer-group"></i>
        Chapter ${chapter.number} of ${course.chapters.length}
      </span>
    `;
  }

  // Render sidebar
  renderSidebar(course, fileName, courseKey);

  // Load Markdown
  loadMarkdownContent(courseKey, fileName, course);

  // Setup navigation
  setupNavigation(course, fileName, courseKey);

  // Update progress bar
  updateProgressBar(course, fileName);
}

function renderSidebar(course, currentFile, courseKey) {
  const listEl = document.getElementById('chapter-list-sidebar');
  if (!listEl) return;

  const items = course.chapters.map(ch => {
    const isActive = ch.file === currentFile;
    return `
      <li class="chapter-item ${isActive ? 'current' : ''}" data-file="${ch.file}" tabindex="0" role="button">
        <span class="chapter-number">${ch.number}</span>
        <div class="chapter-info">
          <span class="chapter-item-title">${ch.title}</span>
          <span class="chapter-duration">
            <i class="fas fa-clock"></i>
            ${ch.duration}
          </span>
        </div>
      </li>
    `;
  }).join('');

  listEl.innerHTML = items;

  // Add click handlers
  listEl.querySelectorAll('.chapter-item').forEach(item => {
    item.addEventListener('click', () => {
      const file = item.dataset.file;
      window.location.href = `lesson-viewer.html?course=${courseKey}&file=${file}`;
    });
    
    // Keyboard accessibility
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const file = item.dataset.file;
        window.location.href = `lesson-viewer.html?course=${courseKey}&file=${file}`;
      }
    });
  });
}

function loadMarkdownContent(courseKey, fileName, course) {
  fetch(`lessons/${courseKey}/${fileName}`)
    .then(response => response.ok ? response.text() : Promise.reject('File not found'))
    .then(markdown => {
      // Configure marked for better rendering
      marked.setOptions({ 
        gfm: true, 
        breaks: true,
        highlight: function(code, lang) {
          if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
            try {
              return hljs.highlight(code, { language: lang }).value;
            } catch (e) {}
          }
          return code;
        }
      });
      
      const contentEl = document.getElementById('lesson-content');
      contentEl.innerHTML = marked.parse(markdown);
      
      // Apply syntax highlighting to all code blocks
      if (typeof hljs !== 'undefined') {
        contentEl.querySelectorAll('pre code').forEach((block) => {
          hljs.highlightElement(block);
        });
      }
      
      // Smooth scroll to top of content
      contentEl.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    })
    .catch(err => {
      document.getElementById('lesson-content').innerHTML = 
        `<p class="text-danger">Failed to load content: ${err}</p>`;
    });
}

function setupNavigation(course, currentFile, courseKey) {
  const currentIndex = course.chapters.findIndex(ch => ch.file === currentFile);
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  if (currentIndex > 0) {
    const prev = course.chapters[currentIndex - 1];
    prevBtn.disabled = false;
    prevBtn.innerHTML = `<i class="fas fa-arrow-left"></i> ${prev.title}`;
    prevBtn.onclick = () => navigateToChapter(courseKey, prev.file);
  } else {
    prevBtn.innerHTML = `<i class="fas fa-arrow-left"></i> Previous Chapter`;
  }

  if (currentIndex < course.chapters.length - 1) {
    const next = course.chapters[currentIndex + 1];
    nextBtn.disabled = false;
    nextBtn.innerHTML = `${next.title} <i class="fas fa-arrow-right"></i>`;
    nextBtn.onclick = () => navigateToChapter(courseKey, next.file);
  } else {
    nextBtn.innerHTML = `Next Chapter <i class="fas fa-arrow-right"></i>`;
  }
}

function updateProgressBar(course, currentFile) {
  const currentIndex = course.chapters.findIndex(ch => ch.file === currentFile);
  const progressPercent = Math.round(((currentIndex + 1) / course.chapters.length) * 100);
  
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-percent');
  
  if (progressBar) {
    progressBar.style.width = `${progressPercent}%`;
  }
  if (progressText) {
    progressText.textContent = `${progressPercent}%`;
  }
}

function navigateToChapter(courseKey, file) {
  window.location.href = `lesson-viewer.html?course=${courseKey}&file=${file}`;
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  // Arrow left/right for navigation
  if (e.key === 'ArrowLeft' && !e.target.matches('input, textarea')) {
    const prevBtn = document.getElementById('prev-btn');
    if (prevBtn && !prevBtn.disabled) {
      prevBtn.click();
    }
  }
  if (e.key === 'ArrowRight' && !e.target.matches('input, textarea')) {
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn && !nextBtn.disabled) {
      nextBtn.click();
    }
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadLessonsData();
});