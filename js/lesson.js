// js/lessons.js

let lessonsData = null;

// Fetch lesson data from JSON
async function loadLessonsData() {
  try {
    const response = await fetch('lesson-data.json');
    if (!response.ok) throw new Error('Failed to load lesson data');
    lessonsData = await response.json();
    renderLessons();
    setupFiltering();
  } catch (err) {
    console.error('Error loading lesson-data.json:', err);
    document.getElementById('lessons-list').innerHTML = 
      `<div class="alert alert-danger">Failed to load courses. Please try again later.</div>`;
  }
}

// DOM References
const lessonsList = document.getElementById('lessons-list');
const lessonModal = document.getElementById('lessonModal');
const modalTitle = document.getElementById('modalTitle');
const modalDescription = document.getElementById('modalDescription');
const modalChapters = document.getElementById('modalChapters');

// Helper: Capitalize first letter
const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);

// Render lesson cards
function renderLessons() {
  if (!lessonsList || !lessonsData) return;

  const lessonEntries = Object.entries(lessonsData);
  let html = '';

  lessonEntries.forEach(([id, lesson], index) => {
    const delay = index * 100;
    const difficultyClass = `difficulty-${lesson.difficulty}`;
    const difficultyText = capitalize(lesson.difficulty);
    const topicsHtml = lesson.topics.map(tag => `<span class="topic-tag">${tag}</span>`).join('');

    html += `
      <div class="lesson-card"
           data-aos="fade-up"
           data-aos-delay="${delay}"
           data-difficulty="${lesson.difficulty}"
           data-lesson="${id}">
        <span class="difficulty-badge ${difficultyClass}">${difficultyText}</span>
        <div class="lesson-icon">
          <i class="${lesson.icon}" style="color: ${lesson.iconColor};"></i>
        </div>
        <h3 class="lesson-title">${lesson.title}</h3>
        <p class="lesson-description">${lesson.description}</p>
        <div class="lesson-meta">
          <div class="lesson-meta-item">
            <i class="fas fa-book"></i>
            <span>${lesson.chapters.length} Chapters</span>
          </div>
        </div>
        <div class="lesson-topics">${topicsHtml}</div>
      </div>
    `;
  });

  lessonsList.innerHTML = html;

  // Rebind card click events
  document.querySelectorAll('.lesson-card').forEach(card => {
    card.addEventListener('click', () => openLessonModal(card.dataset.lesson));
  });

  // Refresh AOS
  if (typeof AOS !== 'undefined') AOS.refresh();
}

// Modal functions
function openLessonModal(lessonId) {
  const lesson = lessonsData?.[lessonId];
  if (!lesson || !lessonModal) return;

  modalTitle.textContent = lesson.title;
  modalDescription.textContent = lesson.description;

  const chaptersHtml = lesson.chapters.map(ch => `
    <div class="chapter-item" onclick="openChapter('${lessonId}', '${ch.file}')">
      <div>
        <span class="chapter-number">${ch.number}</span>
        <span class="chapter-title">${ch.title}</span>
      </div>
      <div class="chapter-description">${ch.description}</div>
      <div class="chapter-duration">
        <i class="fas fa-clock"></i> <span>${ch.duration}</span>
      </div>
    </div>
  `).join('');

  modalChapters.innerHTML = chaptersHtml;
  lessonModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLessonModal() {
  if (lessonModal) {
    lessonModal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}

// Other functions (filtering, particles, etc.)
function setupFiltering() {
  document.querySelectorAll('[data-difficulty]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.category-item').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.difficulty;
      document.querySelectorAll('.lesson-card').forEach(card => {
        card.style.display = (filter === 'all' || card.dataset.difficulty === filter) ? 'block' : 'none';
      });
    });
  });
}

function createLessonParticles() {
  // ... (your existing particle code)
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  if (typeof AOS !== 'undefined') {
    AOS.init({ duration: 800, once: true, offset: 100 });
  }
  createLessonParticles();
  loadLessonsData(); // ← Load JSON here
});

// Expose for inline onclick (if needed)
window.openChapter = (course, file) => {
  window.location.href = `lesson-viewer.html?course=${encodeURIComponent(course)}&file=${encodeURIComponent(file)}`;
};
window.closeLessonModal = closeLessonModal;