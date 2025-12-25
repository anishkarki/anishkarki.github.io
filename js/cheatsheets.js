// Cheatsheet Management System
document.addEventListener('DOMContentLoaded', function() {
  initializeCheatsheetSystem();
  initializeSearchFunctionality();
  initializeCategoryFiltering();
  initializeViewToggle();
  initializeModal();
});

// Data storage
let cheatsheets = [];
let filteredCheatsheets = [];
let currentCategory = 'all';
let currentPage = 1;
let itemsPerPage = 9;
let currentView = 'grid';

// Initialize the main system
function initializeCheatsheetSystem() {
  loadCheatsheets()
    .then(data => {
      if (data && data.length > 0) {
        processCheatsheets(data);
      } else {
        showEmptyState();
      }
    })
    .catch(error => {
      console.error('Error loading cheatsheets:', error);
      showError('Failed to load cheatsheets.');
    });
}

// Load cheatsheets from JSON
async function loadCheatsheets() {
  try {
    const response = await fetch('cheatsheets.json');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Could not load cheatsheets.json:', error);
    throw error;
  }
}

// Process cheatsheet data
function processCheatsheets(data) {
  cheatsheets = data.map(sheet => ({
    ...sheet,
    date: new Date(sheet.date || Date.now())
  }));
  
  // Sort by date (newest first)
  cheatsheets.sort((a, b) => b.date - a.date);
  filteredCheatsheets = [...cheatsheets];
  
  updateCategoryCounts();
  updateStats();
  renderCheatsheets();
}

// Update category counts
function updateCategoryCounts() {
  const categories = {};
  
  cheatsheets.forEach(sheet => {
    categories[sheet.category] = (categories[sheet.category] || 0) + 1;
  });
  
  const allCountEl = document.getElementById('allCount');
  const editorCountEl = document.getElementById('editorCount');
  const shellCountEl = document.getElementById('shellCount');
  const databaseCountEl = document.getElementById('databaseCount');
  const devopsCountEl = document.getElementById('devopsCount');
  const cloudCountEl = document.getElementById('cloudCount');
  
  if (allCountEl) allCountEl.textContent = cheatsheets.length;
  if (editorCountEl) editorCountEl.textContent = categories.editor || 0;
  if (shellCountEl) shellCountEl.textContent = categories.shell || 0;
  if (databaseCountEl) databaseCountEl.textContent = categories.database || 0;
  if (devopsCountEl) devopsCountEl.textContent = categories.devops || 0;
  if (cloudCountEl) cloudCountEl.textContent = categories.cloud || 0;
}

// Update stats
function updateStats() {
  const totalEl = document.getElementById('totalCheatsheets');
  if (totalEl) totalEl.textContent = cheatsheets.length;
}

// Render cheatsheets
function renderCheatsheets() {
  const container = document.getElementById('cheatsheetsContainer');
  if (!container) return;
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageItems = filteredCheatsheets.slice(startIndex, endIndex);
  
  // Update results count
  const resultsCount = document.getElementById('resultsCount');
  if (resultsCount) resultsCount.textContent = filteredCheatsheets.length;
  
  if (pageItems.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 4rem; color: #8b949e;">
        <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
        <h3 style="color: #c9d1d9;">No cheatsheets found</h3>
        <p>Try adjusting your search or category filter.</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = pageItems.map(sheet => createCheatsheetCard(sheet)).join('');
  
  // Apply view class
  container.className = `cheatsheets-container ${currentView === 'list' ? 'list-view' : ''}`;
  
  // Add click handlers
  container.querySelectorAll('.cheatsheet-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.id);
      const sheet = cheatsheets.find(s => s.id === id);
      if (sheet) openModal(sheet);
    });
  });
  
  renderPagination();
}

// Create cheatsheet card HTML
function createCheatsheetCard(sheet) {
  const dateStr = sheet.date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
  const iconMap = {
    editor: 'fa-edit',
    shell: 'fa-terminal',
    database: 'fa-database',
    devops: 'fa-infinity',
    cloud: 'fa-cloud'
  };
  
  const icon = iconMap[sheet.category] || 'fa-file-alt';
  const tags = sheet.tags.slice(0, 3).map(tag => `<span class="card-tag">${tag}</span>`).join('');
  
  return `
    <div class="cheatsheet-card" data-id="${sheet.id}">
      <div class="card-header">
        <div class="card-icon">
          <i class="fas ${icon}"></i>
        </div>
        <h3 class="card-title">${sheet.title}</h3>
      </div>
      <div class="card-body">
        <h3 class="card-title" style="display: none;">${sheet.title}</h3>
        <p class="card-description">${sheet.description}</p>
        <div class="card-meta">${tags}</div>
      </div>
      <div class="card-footer">
        <span class="card-date"><i class="far fa-calendar me-1"></i>${dateStr}</span>
        <span class="card-action">View <i class="fas fa-arrow-right"></i></span>
      </div>
    </div>
  `;
}

// Pagination
function renderPagination() {
  const container = document.getElementById('paginationContainer');
  if (!container) return;
  
  const totalPages = Math.ceil(filteredCheatsheets.length / itemsPerPage);
  
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  
  let html = '';
  
  // Previous button
  html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
    <i class="fas fa-chevron-left"></i>
  </button>`;
  
  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += `<span class="page-btn" style="cursor: default;">...</span>`;
    }
  }
  
  // Next button
  html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
    <i class="fas fa-chevron-right"></i>
  </button>`;
  
  container.innerHTML = html;
  
  // Add click handlers
  container.querySelectorAll('.page-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.dataset.page);
      if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderCheatsheets();
        window.scrollTo({ top: 400, behavior: 'smooth' });
      }
    });
  });
}

// Search functionality
function initializeSearchFunctionality() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;
  
  let debounceTimer;
  
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      filterCheatsheets();
    }, 300);
  });
}

// Category filtering
function initializeCategoryFiltering() {
  const categoryItems = document.querySelectorAll('.category-item');
  
  categoryItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      categoryItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      currentCategory = item.dataset.category;
      currentPage = 1;
      filterCheatsheets();
    });
  });
}

// Filter cheatsheets
function filterCheatsheets() {
  const searchInput = document.getElementById('searchInput');
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  
  filteredCheatsheets = cheatsheets.filter(sheet => {
    // Category filter
    const categoryMatch = currentCategory === 'all' || sheet.category === currentCategory;
    
    // Search filter
    const searchMatch = !searchTerm || 
      sheet.title.toLowerCase().includes(searchTerm) ||
      sheet.description.toLowerCase().includes(searchTerm) ||
      sheet.tags.some(tag => tag.toLowerCase().includes(searchTerm));
    
    return categoryMatch && searchMatch;
  });
  
  currentPage = 1;
  renderCheatsheets();
}

// View toggle
function initializeViewToggle() {
  const viewBtns = document.querySelectorAll('.view-btn');
  
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      viewBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      currentView = btn.dataset.view;
      renderCheatsheets();
    });
  });
}

// Modal functionality
function initializeModal() {
  const modal = document.getElementById('cheatsheetModal');
  const closeBtn = document.getElementById('closeModal');
  const overlay = modal?.querySelector('.modal-overlay');
  const copyBtn = document.getElementById('copyAllBtn');
  const printBtn = document.getElementById('printBtn');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }
  
  if (overlay) {
    overlay.addEventListener('click', closeModal);
  }
  
  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
  
  // Copy all button
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const modalBody = document.getElementById('modalBody');
      const text = modalBody.innerText;
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
          copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        }, 2000);
      });
    });
  }
  
  // Print button
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }
}

// Open modal with cheatsheet content
async function openModal(sheet) {
  const modal = document.getElementById('cheatsheetModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  
  if (!modal || !modalTitle || !modalBody) return;
  
  modalTitle.textContent = sheet.title;
  modalBody.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading content...</p></div>';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  
  try {
    const response = await fetch(sheet.file);
    if (!response.ok) throw new Error('Failed to load file');
    
    const markdown = await response.text();
    
    // Configure marked for better rendering
    marked.setOptions({
      gfm: true,
      breaks: true,
      headerIds: true
    });
    
    modalBody.innerHTML = marked.parse(markdown);
    
    // Add copy buttons to code blocks
    addCodeCopyButtons(modalBody);
    
  } catch (error) {
    console.error('Error loading cheatsheet:', error);
    modalBody.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: #8b949e;">
        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem; color: #f85149;"></i>
        <h3 style="color: #c9d1d9;">Failed to load content</h3>
        <p>Please try again later.</p>
      </div>
    `;
  }
}

// Add copy buttons to code blocks
function addCodeCopyButtons(container) {
  container.querySelectorAll('pre').forEach(pre => {
    const copyBtn = document.createElement('button');
    copyBtn.className = 'code-copy-btn';
    copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
    copyBtn.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      background: #30363d;
      border: none;
      border-radius: 4px;
      color: #8b949e;
      padding: 4px 8px;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s;
    `;
    
    pre.style.position = 'relative';
    pre.appendChild(copyBtn);
    
    pre.addEventListener('mouseenter', () => copyBtn.style.opacity = '1');
    pre.addEventListener('mouseleave', () => copyBtn.style.opacity = '0');
    
    copyBtn.addEventListener('click', () => {
      const code = pre.querySelector('code')?.textContent || pre.textContent;
      navigator.clipboard.writeText(code).then(() => {
        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
        copyBtn.style.color = '#58a6ff';
        setTimeout(() => {
          copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
          copyBtn.style.color = '#8b949e';
        }, 2000);
      });
    });
  });
}

// Close modal
function closeModal() {
  const modal = document.getElementById('cheatsheetModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Show empty state
function showEmptyState() {
  const container = document.getElementById('cheatsheetsContainer');
  if (container) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: #8b949e;">
        <i class="fas fa-folder-open" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
        <h3 style="color: #c9d1d9;">No cheatsheets yet</h3>
        <p>Cheatsheets will appear here once added.</p>
      </div>
    `;
  }
}

// Show error
function showError(message) {
  const container = document.getElementById('cheatsheetsContainer');
  if (container) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: #8b949e;">
        <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 1rem; color: #f85149;"></i>
        <h3 style="color: #c9d1d9;">Error</h3>
        <p>${message}</p>
      </div>
    `;
  }
}
