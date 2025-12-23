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

// Calculate total duration for a course
function calculateTotalDuration(chapters) {
  let totalMinutes = 0;
  chapters.forEach(ch => {
    const match = ch.duration.match(/(\d+)/);
    if (match) totalMinutes += parseInt(match[1]);
  });
  
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${totalMinutes} min`;
}

// Render lesson cards
function renderLessons() {
  if (!lessonsList || !lessonsData) return;

  const lessonEntries = Object.entries(lessonsData);
  let html = '';

  lessonEntries.forEach(([id, lesson], index) => {
    const delay = index * 100;
    const difficultyClass = `difficulty-${lesson.difficulty}`;
    const difficultyText = capitalize(lesson.difficulty);
    const topicsHtml = lesson.topics.slice(0, 4).map(tag => `<span class="topic-tag">${tag}</span>`).join('');
    const totalDuration = calculateTotalDuration(lesson.chapters);

    html += `
      <div class="lesson-card"
           data-aos="fade-up"
           data-aos-delay="${delay}"
           data-difficulty="${lesson.difficulty}"
           data-lesson="${id}"
           tabindex="0"
           role="button"
           aria-label="Open ${lesson.title} course">
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
          <div class="lesson-meta-item">
            <i class="fas fa-clock"></i>
            <span>${totalDuration}</span>
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
    
    // Keyboard accessibility
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLessonModal(card.dataset.lesson);
      }
    });
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
    <div class="chapter-item" 
         onclick="openChapter('${lessonId}', '${ch.file}')"
         tabindex="0"
         role="button"
         aria-label="Open ${ch.title}">
      <span class="chapter-number">${ch.number}</span>
      <div class="chapter-info">
        <span class="chapter-title">${ch.title}</span>
        <p class="chapter-description">${ch.description}</p>
        <span class="chapter-duration">
          <i class="fas fa-clock"></i> ${ch.duration}
        </span>
      </div>
    </div>
  `).join('');

  modalChapters.innerHTML = chaptersHtml;
  
  // Add keyboard handlers to chapter items
  modalChapters.querySelectorAll('.chapter-item').forEach(item => {
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        item.click();
      }
    });
  });
  
  lessonModal.classList.add('active');
  document.body.style.overflow = 'hidden';
  
  // Focus trap and close on escape
  lessonModal.focus();
}

function closeLessonModal() {
  if (lessonModal) {
    lessonModal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && lessonModal?.classList.contains('active')) {
    closeLessonModal();
  }
});

// Close modal on backdrop click
if (lessonModal) {
  lessonModal.addEventListener('click', (e) => {
    if (e.target === lessonModal) {
      closeLessonModal();
    }
  });
}

// Filtering functionality
function setupFiltering() {
  document.querySelectorAll('.category-item[data-difficulty]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.category-item').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.difficulty;
      document.querySelectorAll('.lesson-card').forEach(card => {
        if (filter === 'all' || card.dataset.difficulty === filter) {
          card.style.display = '';
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

function createLessonParticles() {
  // Particle animation for lessons page
  const particleContainer = document.querySelector('.particle-system');
  if (!particleContainer) return;
  
  for (let i = 0; i < 30; i++) {
    const particle = document.createElement('div');
    particle.className = 'quantum-particle';
    particle.style.cssText = `
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      width: ${Math.random() * 4 + 2}px;
      height: ${Math.random() * 4 + 2}px;
      animation-delay: ${Math.random() * 5}s;
      animation-duration: ${Math.random() * 10 + 15}s;
    `;
    particleContainer.appendChild(particle);
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  if (typeof AOS !== 'undefined') {
    AOS.init({ duration: 800, once: true, offset: 100 });
  }
  createLessonParticles();
  loadLessonsData();
});

// Expose for inline onclick (if needed)
window.openChapter = (course, file) => {
  window.location.href = `lesson-viewer.html?course=${encodeURIComponent(course)}&file=${encodeURIComponent(file)}`;
};
window.closeLessonModal = closeLessonModal;