// js/lesson-viewer.js

let lessonsData = null;

async function loadLessonsData() {
  try {
    const response = await fetch('../lesson-data.json'); // Adjust path if needed
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

  // Update UI
  document.getElementById('lesson-title').textContent = chapter.title;
  document.getElementById('lesson-meta').textContent = `${course.title} • ${chapter.duration}`;

  // Render sidebar
  renderSidebar(course, fileName, courseKey);

  // Load Markdown
  loadMarkdownContent(courseKey, fileName);

  // Setup navigation
  setupNavigation(course, fileName, courseKey);
}

function renderSidebar(course, currentFile, courseKey) {
  const listEl = document.getElementById('chapter-list-sidebar');
  if (!listEl) return;

  const items = course.chapters.map(ch => {
    const isActive = ch.file === currentFile;
    return `
      <li class="chapter-item ${isActive ? 'current' : ''}" data-file="${ch.file}">
        <span class="chapter-number">${ch.number}</span>
        ${ch.title}
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
  });
}

function loadMarkdownContent(courseKey, fileName) {
  fetch(`lessons/${courseKey}/${fileName}`)
    .then(response => response.ok ? response.text() : Promise.reject('File not found'))
    .then(markdown => {
      marked.setOptions({ gfm: true, breaks: true });
      document.getElementById('lesson-content').innerHTML = marked.parse(markdown);
    })
    .catch(err => {
      document.getElementById('lesson-content').innerHTML = 
        `<p class="text-danger">Failed to load content: ${err.message}</p>`;
    });
}

function setupNavigation(course, currentFile, courseKey) {
  const currentIndex = course.chapters.findIndex(ch => ch.file === currentFile);
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  if (currentIndex > 0) {
    const prev = course.chapters[currentIndex - 1];
    prevBtn.disabled = false;
    prevBtn.onclick = () => navigateToChapter(courseKey, prev.file);
  }

  if (currentIndex < course.chapters.length - 1) {
    const next = course.chapters[currentIndex + 1];
    nextBtn.disabled = false;
    nextBtn.onclick = () => navigateToChapter(courseKey, next.file);
  }
}

function navigateToChapter(courseKey, file) {
  window.location.href = `lesson-viewer.html?course=${courseKey}&file=${file}`;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadLessonsData();
});