// Enhanced Blog Management System - Updated for MD file loading
document.addEventListener('DOMContentLoaded', function () {
  // Initialize blog system
  initializeBlogSystem();
  initializeSearchFunctionality();
  initializeCategoryFiltering();
  initializeViewToggle();
  initializePagination();
  createBlogParticles();
});

// Blog data storage
let blogPosts = [];
let filteredPosts = [];
let currentCategory = 'all';
let currentPage = 1;
let postsPerPage = 100;
let currentView = 'grid';

// Initialize the main blog system
function initializeBlogSystem() {
  loadBlogPosts()
    .then(posts => {
      if (posts && posts.length > 0) {
        processBlogPosts(posts);
      } else {
        showError('No blog posts found.');
      }
    })
    .catch(error => {
      console.error('Error loading blog posts:', error);
      showError('Failed to load blog posts. Please try again later.');
    });
}

// Load blog posts from JSON file
async function loadBlogPosts() {
  try {
    const response = await fetch('posts.json');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Could not load posts.json:', error);
    throw error;
  }
}

// Process blog posts data
function processBlogPosts(posts) {
  blogPosts = posts.map(post => ({
    ...post,
    date: new Date(post.date || Date.now()),
    readTime: post.readTime || calculateReadTime(post.excerpt || ''),
    tags: post.tags || [],
    category: post.category || 'general',
    file: post.file // Ensure we have the file path
  }));

  // Sort posts by date (newest first)
  blogPosts.sort((a, b) => b.date - a.date);

  filteredPosts = [...blogPosts];

  updateCategoryCounts();
  updateTotalPostsCount();
  renderBlogPosts();

  // Show success message
  showNotification('Blog posts loaded successfully!', 'success');
}

// Calculate estimated read time
function calculateReadTime(content) {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}

// Update category counts
function updateCategoryCounts() {
  const categories = {};

  blogPosts.forEach(post => {
    categories[post.category] = (categories[post.category] || 0) + 1;
  });

  // Update DOM elements
  const totalPostsEl = document.getElementById('allCount');
  const databaseCountEl = document.getElementById('databaseCount');
  const cloudCountEl = document.getElementById('cloudCount');
  const performanceCountEl = document.getElementById('performanceCount');
  const automationCountEl = document.getElementById('automationCount');
  const analyticsCountEl = document.getElementById('analyticsCount');

  if (totalPostsEl) totalPostsEl.textContent = blogPosts.length;
  if (databaseCountEl) databaseCountEl.textContent = categories.database || 0;
  if (cloudCountEl) cloudCountEl.textContent = categories.cloud || 0;
  if (performanceCountEl) performanceCountEl.textContent = categories.performance || 0;
  if (automationCountEl) automationCountEl.textContent = categories.automation || 0;
  if (analyticsCountEl) analyticsCountEl.textContent = categories.analytics || 0;
}

// Update total posts count in hero section
function updateTotalPostsCount() {
  const totalPostsElement = document.getElementById('totalPosts');
  if (totalPostsElement) {
    animateNumber(totalPostsElement, 0, blogPosts.length, 1000);
  }
}

// Animate number counting
function animateNumber(element, start, end, duration) {
  const range = end - start;
  const startTime = performance.now();

  function updateNumber(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const current = Math.floor(start + (range * progress));

    element.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(updateNumber);
    }
  }

  requestAnimationFrame(updateNumber);
}

// Render blog posts
function renderBlogPosts() {
  const blogList = document.getElementById('blog-list');
  if (!blogList) return;

  blogList.classList.remove('loading');

  if (filteredPosts.length === 0) {
    renderEmptyState(blogList);
    return;
  }

  // Calculate pagination
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  const currentPosts = filteredPosts.slice(startIndex, endIndex);

  // Apply current view class
  blogList.className = `blog-posts-${currentView}`;

  // Render posts
  blogList.innerHTML = currentPosts.map(post => createPostHTML(post)).join('');

  // Add animations
  const postCards = blogList.querySelectorAll('.blog-post-card');
  postCards.forEach((card, index) => {
    card.style.animationDelay = `${index * 0.1}s`;
    card.classList.add('animate-in');
  });

  // Update pagination
  updatePagination(totalPages);

  // Scroll to top of posts
  if (currentPage > 1) {
    blogList.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Create HTML for a single post - Updated for proper markdown file linking
function createPostHTML(post) {
  const formattedDate = post.date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const tagsHTML = post.tags.slice(0, 4).map(tag =>
    `<span class="post-tag">${tag}</span>`
  ).join('');

  // Create the proper post URL with file parameter
  const postUrl = `post.html?file=${encodeURIComponent(post.file)}`;

  return `
    <article class="blog-post-card ${currentView === 'list' ? 'list-view' : ''}" data-category="${post.category}">
      
      <div class="post-content">
        <div class="post-meta-header">
          <div class="post-category ${post.category}">${getCategoryDisplayName(post.category)}</div>
          <div class="post-date">
            <i class="fas fa-calendar-alt"></i>
            ${formattedDate}
          </div>
        </div>
        
        <h3 class="post-title">
          <a href="${postUrl}" class="post-title-link">${post.title}</a>
        </h3>
        
        <p class="post-excerpt">${post.excerpt}</p>
        
        <div class="post-tags">${tagsHTML}</div>
      </div>
      
      <div class="post-footer">
        <div class="post-author">
          <img src="assets/profilephoto.jpg" alt="${post.author || 'Anish Karki'}" class="author-avatar-small">
          <span class="author-name">${post.author || 'Anish Karki'}</span>
        </div>
        <div class="post-read-time">
          <i class="fas fa-clock"></i>
          ${post.readTime}
        </div>
        <a href="${postUrl}" class="read-more-btn">
          Read Article <i class="fas fa-arrow-right"></i>
        </a>
      </div>
      
      <!-- Full card clickable overlay -->
      <a href="${postUrl}" class="post-link-overlay" aria-label="Read ${post.title}"></a>
    </article>
  `;
}

// Get display name for category
function getCategoryDisplayName(category) {
  const categoryNames = {
    database: 'Database Administration',
    cloud: 'Cloud Migration',
    performance: 'Performance Tuning',
    automation: 'Automation',
    analytics: 'Data Analytics',
    general: 'General'
  };
  return categoryNames[category] || category;
}

// Render empty state
function renderEmptyState(container) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">
        <i class="fas fa-search"></i>
      </div>
      <h3>No posts found</h3>
      <p>Try adjusting your search or filter criteria</p>
      <button class="quantum-btn" onclick="resetFilters()">
        <i class="fas fa-refresh me-2"></i>Reset Filters
      </button>
    </div>
  `;
}

// Show error state
function showError(message) {
  const blogList = document.getElementById('blog-list');
  if (blogList) {
    blogList.innerHTML = `
      <div class="error-state">
        <div class="error-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3>Error Loading Posts</h3>
        <p>${message}</p>
        <button class="quantum-btn" onclick="location.reload()">
          <i class="fas fa-refresh me-2"></i>Reload Page
        </button>
      </div>
    `;
  }
}

// Initialize search functionality
function initializeSearchFunctionality() {
  const searchInput = document.getElementById('blogSearch');
  if (!searchInput) return;

  let searchTimeout;

  searchInput.addEventListener('input', function (e) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      performSearch(e.target.value);
    }, 300);
  });

  // Add search button functionality
  const searchBtn = document.querySelector('.search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', function () {
      performSearch(searchInput.value);
    });
  }

  // Enter key functionality
  searchInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      performSearch(this.value);
    }
  });
}

// Perform search
function performSearch(query) {
  const searchTerm = query.toLowerCase().trim();

  if (searchTerm === '') {
    filteredPosts = blogPosts.filter(post =>
      currentCategory === 'all' || post.category === currentCategory
    );
  } else {
    filteredPosts = blogPosts.filter(post => {
      const matchesCategory = currentCategory === 'all' || post.category === currentCategory;
      const matchesSearch =
        post.title.toLowerCase().includes(searchTerm) ||
        post.excerpt.toLowerCase().includes(searchTerm) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
        (post.content && post.content.toLowerCase().includes(searchTerm));

      return matchesCategory && matchesSearch;
    });
  }

  currentPage = 1;
  renderBlogPosts();

  // Show search results notification
  if (query.trim()) {
    showNotification(`Found ${filteredPosts.length} posts matching "${query}"`, 'info');
  }
}

// Initialize category filtering
function initializeCategoryFiltering() {
  const categoryItems = document.querySelectorAll('.category-item');

  categoryItems.forEach(item => {
    item.addEventListener('click', function (e) {
      e.preventDefault();

      // Update active state
      categoryItems.forEach(cat => cat.classList.remove('active'));
      this.classList.add('active');

      // Get selected category
      currentCategory = this.getAttribute('data-category');

      // Filter posts
      filterByCategory(currentCategory);
    });
  });
}

// Filter posts by category
function filterByCategory(category) {
  const searchInput = document.getElementById('blogSearch');
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

  filteredPosts = blogPosts.filter(post => {
    const matchesCategory = category === 'all' || post.category === category;
    const matchesSearch = !searchTerm ||
      post.title.toLowerCase().includes(searchTerm) ||
      post.excerpt.toLowerCase().includes(searchTerm) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchTerm));

    return matchesCategory && matchesSearch;
  });

  currentPage = 1;
  renderBlogPosts();

  // Show filter notification
  const categoryName = getCategoryDisplayName(category);
  showNotification(`Showing ${filteredPosts.length} posts in ${categoryName}`, 'info');
}

// Initialize view toggle
function initializeViewToggle() {
  const viewButtons = document.querySelectorAll('.view-btn');

  viewButtons.forEach(btn => {
    btn.addEventListener('click', function () {
      // Update active state
      viewButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      // Get selected view
      currentView = this.getAttribute('data-view');

      // Re-render posts with new view
      renderBlogPosts();
    });
  });
}

// Initialize pagination
function initializePagination() {
  // Pagination will be updated in renderBlogPosts
}

// Update pagination
function updatePagination(totalPages) {
  const paginationContainer = document.getElementById('paginationContainer');
  if (!paginationContainer || totalPages <= 1) {
    paginationContainer.style.display = 'none';
    return;
  }

  paginationContainer.style.display = 'block';
  const pagination = paginationContainer.querySelector('.pagination');

  let paginationHTML = '';

  // Previous button
  if (currentPage > 1) {
    paginationHTML += `
      <li class="page-item">
        <a class="page-link" href="#" data-page="${currentPage - 1}">
          <i class="fas fa-chevron-left"></i>
        </a>
      </li>
    `;
  }

  // Page numbers
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);

  if (startPage > 1) {
    paginationHTML += `
      <li class="page-item">
        <a class="page-link" href="#" data-page="1">1</a>
      </li>
    `;
    if (startPage > 2) {
      paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
      <li class="page-item ${i === currentPage ? 'active' : ''}">
        <a class="page-link" href="#" data-page="${i}">${i}</a>
      </li>
    `;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
    paginationHTML += `
      <li class="page-item">
        <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
      </li>
    `;
  }

  // Next button
  if (currentPage < totalPages) {
    paginationHTML += `
      <li class="page-item">
        <a class="page-link" href="#" data-page="${currentPage + 1}">
          <i class="fas fa-chevron-right"></i>
        </a>
      </li>
    `;
  }

  pagination.innerHTML = paginationHTML;

  // Add click handlers
  pagination.querySelectorAll('.page-link[data-page]').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const page = parseInt(this.getAttribute('data-page'));
      if (page !== currentPage) {
        currentPage = page;
        renderBlogPosts();
      }
    });
  });
}

// Reset all filters
function resetFilters() {
  currentCategory = 'all';
  currentPage = 1;

  // Reset UI
  document.querySelectorAll('.category-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-category') === 'all') {
      item.classList.add('active');
    }
  });

  const searchInput = document.getElementById('blogSearch');
  if (searchInput) {
    searchInput.value = '';
  }

  // Reset filtered posts
  filteredPosts = [...blogPosts];
  renderBlogPosts();

  showNotification('Filters reset successfully!', 'success');
}

// Create blog-specific particle effects
function createBlogParticles() {
  const heroSection = document.querySelector('.blog-hero-section');
  if (!heroSection) return;

  for (let i = 0; i < 30; i++) {
    const particle = document.createElement('div');
    particle.className = 'blog-particle';
    particle.style.cssText = `
      position: absolute;
      width: ${Math.random() * 4 + 2}px;
      height: ${Math.random() * 4 + 2}px;
      background: var(--neutron-cyan);
      border-radius: 50%;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      animation: blogParticleFloat ${Math.random() * 8 + 6}s ease-in-out infinite;
      opacity: ${Math.random() * 0.5 + 0.3};
      pointer-events: none;
      z-index: 1;
    `;
    heroSection.appendChild(particle);
  }

  // Add blog particle animation
  if (!document.querySelector('#blog-particle-styles')) {
    const style = document.createElement('style');
    style.id = 'blog-particle-styles';
    style.textContent = `
      @keyframes blogParticleFloat {
        0%, 100% { 
          transform: translateY(0px) translateX(0px) rotate(0deg);
        }
        25% { 
          transform: translateY(-30px) translateX(15px) rotate(90deg);
        }
        50% { 
          transform: translateY(-15px) translateX(-20px) rotate(180deg);
        }
        75% { 
          transform: translateY(-40px) translateX(10px) rotate(270deg);
        }
      }
      
      .animate-in {
        animation: slideInUp 0.6s ease-out forwards;
      }
      
      @keyframes slideInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .empty-state, .error-state {
        text-align: center;
        padding: 4rem 2rem;
        grid-column: 1 / -1;
      }
      
      .empty-icon, .error-icon {
        font-size: 4rem;
        color: var(--cosmic-gray);
        margin-bottom: 1rem;
      }
      
      .error-icon {
        color: var(--nebula-pink);
      }
      
      .empty-state h3, .error-state h3 {
        color: var(--neutron-cyan);
        margin-bottom: 1rem;
      }
      
      .empty-state p, .error-state p {
        color: var(--cosmic-gray);
        margin-bottom: 2rem;
      }
      
      .post-link-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1;
        background: transparent;
        text-decoration: none;
      }
      
      .post-title-link, .read-more-btn {
        position: relative;
        z-index: 2;
        text-decoration: none;
        color: inherit;
      }
      
      .post-title-link:hover {
        color: var(--neutron-cyan);
        text-decoration: none;
      }
      
      .blog-post-card {
        position: relative;
        cursor: pointer;
      }
      
      .blog-post-card.list-view {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 2rem;
      }
      
      .blog-post-card.list-view .post-content {
        flex: 1;
      }
      
      .blog-post-card.list-view .post-footer {
        flex-shrink: 0;
        width: 200px;
        justify-content: flex-end;
      }
    `;
    document.head.appendChild(style);
  }
}

// Show notification
function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll('.blog-notification');
  existingNotifications.forEach(notif => notif.remove());

  const notification = document.createElement('div');
  notification.className = `blog-notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    </div>
  `;

  // Add notification styles
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: rgba(26, 27, 58, 0.95);
    border: 1px solid var(--neutron-cyan);
    border-radius: 8px;
    padding: 1rem 1.5rem;
    color: var(--stellar-white);
    z-index: 10000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    backdrop-filter: blur(10px);
    max-width: 300px;
  `;

  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);

  // Auto remove
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, 3000);
}

// Add CSS for notification content
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
  .notification-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .notification-success {
    border-color: var(--photon-green) !important;
  }
  
  .notification-error {
    border-color: var(--nebula-pink) !important;
  }
  
  .notification-info {
    border-color: var(--neutron-cyan) !important;
  }

  .post-meta-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .post-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .author-avatar-small {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--neutron-cyan);
  }

  .post-author {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: var(--cosmic-gray);
  }

  .read-more-btn {
    background: transparent;
    border: 1px solid var(--neutron-cyan);
    color: var(--neutron-cyan);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 500;
    transition: var(--transition-normal);
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .read-more-btn:hover {
    background: var(--neutron-cyan);
    color: var(--quantum-blue);
    transform: translateY(-2px);
    text-decoration: none;
  }

  .featured-badge {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: var(--plasma-gradient);
    color: var(--quantum-blue);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;
document.head.appendChild(notificationStyles);

// Export functions for external use
window.BlogSystem = {
  resetFilters,
  filterByCategory,
  performSearch,
  showNotification
};