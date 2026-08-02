// Developer Command Center & Cheatsheet Management System
document.addEventListener('DOMContentLoaded', function() {
  initializeCheatsheetSystem();
  initializeSearchAndTagFilter();
  initializeCategoryTabs();
  initializeViewToggle();
});

// State management
let cheatsheets = [];
let filteredCheatsheets = [];
let currentCategory = 'all';
let currentTag = '';
let searchQuery = '';
let currentPage = 1;
let itemsPerPage = 9;
let currentView = 'grid';

// Category icon map
const categoryIcons = {
  shell: 'fa-terminal',
  devops: 'fa-infinity',
  editor: 'fa-edit',
  database: 'fa-database',
  cloud: 'fa-cloud',
  programming: 'fa-code'
};

// Complexity badge map
const complexityBadges = {
  editor: 'ESSENTIAL',
  devops: 'PRODUCTION',
  shell: 'ADVANCED',
  database: 'HIGH-PERF',
  cloud: 'ENTERPRISE'
};

// Quick sample commands preview map per cheatsheet
const codePreviews = {
  1: ':#,#s/foo/bar/g  # Multi-line block substitute',
  2: 'terraform plan -out=tfplan && terraform apply tfplan',
  3: 'python3 -m venv venv && source venv/bin/activate',
  4: 'Ctrl + Shift + L  # Select all occurrences of current selection',
  5: 'git log --oneline --graph --all --decorate',
  6: 'awk \'{print $1, $4}\' access.log | sort | uniq -c',
  7: 'SELECT pg_size_pretty(pg_database_size(current_database()));',
  8: 'sed -i \'s/old_val/new_val/g\' *.conf',
  9: 'tmux new-session -s dev \\; split-window -h'
};

// Initialize system
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
      showEmptyState();
    });
}

async function loadCheatsheets() {
  try {
    const response = await fetch('cheatsheets.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Could not fetch cheatsheets.json:', error);
    throw error;
  }
}

function processCheatsheets(data) {
  cheatsheets = data.map(sheet => ({
    ...sheet,
    date: new Date(sheet.date || Date.now())
  }));

  cheatsheets.sort((a, b) => b.date - a.date);
  filteredCheatsheets = [...cheatsheets];

  updateCounts();
  renderCheatsheets();
}

function updateCounts() {
  const counts = { all: cheatsheets.length, shell: 0, devops: 0, editor: 0, database: 0, cloud: 0 };
  
  cheatsheets.forEach(s => {
    if (counts[s.category] !== undefined) counts[s.category]++;
  });

  document.querySelectorAll('[id$="Count"]').forEach(el => {
    const key = el.id.replace('Count', '');
    if (counts[key] !== undefined) {
      el.textContent = counts[key];
    }
  });

  const totalEl = document.getElementById('totalCheatsheets');
  if (totalEl) totalEl.textContent = cheatsheets.length;
}

function renderCheatsheets() {
  const container = document.getElementById('cheatsheetsContainer');
  if (!container) return;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const pageItems = filteredCheatsheets.slice(startIndex, startIndex + itemsPerPage);

  const resultsCount = document.getElementById('resultsCount');
  if (resultsCount) resultsCount.textContent = filteredCheatsheets.length;

  if (pageItems.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="fas fa-search-minus text-muted" style="font-size: 3rem; opacity: 0.5;"></i>
        <h4 class="mt-3 text-light">No command sheets match your filter</h4>
        <p class="text-muted">Try clearing your search query or selecting another tag.</p>
        <button class="btn btn-outline-info rounded-pill px-4" onclick="clearFilters()">Reset All Filters</button>
      </div>
    `;
    return;
  }

  container.className = `cheatsheets-container ${currentView === 'list' ? 'list-view' : 'grid-view'}`;
  container.innerHTML = pageItems.map(sheet => createCardHTML(sheet)).join('');

  renderPagination();
}

function createCardHTML(sheet) {
  const catIcon = categoryIcons[sheet.category] || 'fa-scroll';
  const badgeLabel = complexityBadges[sheet.category] || 'PRO';
  const previewCode = codePreviews[sheet.id] || `${sheet.tags[0] || 'cmd'} --help`;

  const tagsHTML = sheet.tags.slice(0, 4).map(t => `<span class="card-tag">#${t}</span>`).join('');

  return `
    <div class="cheatsheet-card" data-id="${sheet.id}">
      <div>
        <div class="card-top-row">
          <span class="card-cat-badge">
            <i class="fas ${catIcon} me-1"></i>${sheet.category}
          </span>
          <span class="card-complexity">${badgeLabel}</span>
        </div>
        <h3 class="card-title">${sheet.title}</h3>
        <p class="card-description">${sheet.description}</p>
        
        <div class="card-code-preview">
          <code>${previewCode}</code>
          <button class="copy-mini-btn" onclick="copyCodeSnippet(event, '${escapeQuotes(previewCode)}')" title="Copy Command">
            <i class="fas fa-copy"></i>
          </button>
        </div>

        <div class="card-tags">${tagsHTML}</div>
      </div>

      <div class="card-footer-actions">
        <button class="btn-preview-modal" onclick="openQuickViewModal(${sheet.id})">
          <i class="fas fa-eye me-1"></i> Quick View
        </button>
        <a href="cheatsheet-viewer.html?id=${sheet.id}" class="link-full-sheet">
          Full Sheet <i class="fas fa-arrow-right"></i>
        </a>
      </div>
    </div>
  `;
}

function escapeQuotes(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function filterCheatsheets() {
  filteredCheatsheets = cheatsheets.filter(sheet => {
    const matchesCategory = (currentCategory === 'all' || sheet.category === currentCategory);
    
    const matchesTag = !currentTag || sheet.tags.some(t => t.toLowerCase() === currentTag.toLowerCase());
    
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || (
      sheet.title.toLowerCase().includes(q) ||
      sheet.description.toLowerCase().includes(q) ||
      sheet.category.toLowerCase().includes(q) ||
      sheet.tags.some(t => t.toLowerCase().includes(q))
    );

    return matchesCategory && matchesTag && matchesSearch;
  });

  currentPage = 1;
  renderCheatsheets();
}

function initializeSearchAndTagFilter() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      filterCheatsheets();
    });
  }

  // Quick tag pill buttons
  document.querySelectorAll('.tag-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag;
      if (currentTag === tag) {
        currentTag = '';
        btn.classList.remove('active');
      } else {
        document.querySelectorAll('.tag-pill').forEach(b => b.classList.remove('active'));
        currentTag = tag;
        btn.classList.add('active');
      }
      filterCheatsheets();
    });
  });
}

function initializeCategoryTabs() {
  document.querySelectorAll('.cat-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category;
      filterCheatsheets();
    });
  });
}

function initializeViewToggle() {
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.dataset.view;
      renderCheatsheets();
    });
  });
}

function clearFilters() {
  currentCategory = 'all';
  currentTag = '';
  searchQuery = '';
  
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';

  document.querySelectorAll('.cat-tab').forEach((btn, i) => {
    btn.classList.toggle('active', i === 0);
  });
  document.querySelectorAll('.tag-pill').forEach(b => b.classList.remove('active'));

  filterCheatsheets();
}

function renderPagination() {
  const container = document.getElementById('paginationContainer');
  if (!container) return;

  const totalPages = Math.ceil(filteredCheatsheets.length / itemsPerPage);
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = `<div class="btn-group me-2" role="group">`;
  for (let i = 1; i <= totalPages; i++) {
    html += `
      <button type="button" class="btn btn-outline-info ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">
        ${i}
      </button>
    `;
  }
  html += `</div>`;
  container.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;
  renderCheatsheets();
  window.scrollTo({ top: 350, behavior: 'smooth' });
}

// Quick Preview Modal
async function openQuickViewModal(id) {
  const sheet = cheatsheets.find(s => s.id === id);
  if (!sheet) return;

  const modal = document.getElementById('cheatsheetModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalCategory = document.getElementById('modalCategory');
  const modalBody = document.getElementById('modalBody');
  const openFullBtn = document.getElementById('openFullBtn');

  if (modalTitle) modalTitle.textContent = sheet.title;
  if (modalCategory) modalCategory.textContent = sheet.category.toUpperCase();
  if (openFullBtn) openFullBtn.onclick = () => window.location.href = `cheatsheet-viewer.html?id=${sheet.id}`;

  if (modalBody) {
    modalBody.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-info" role="status"></div></div>`;
  }

  if (modal) modal.classList.add('active');

  try {
    const res = await fetch(sheet.file);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const mdText = await res.text();
    
    if (modalBody && typeof marked !== 'undefined') {
      modalBody.innerHTML = marked.parse(mdText);
      // Attach copy handlers to pre/code tags in modal
      modalBody.querySelectorAll('pre').forEach(pre => {
        pre.style.cursor = 'pointer';
        pre.title = 'Click to copy code block';
        pre.onclick = () => copyCodeSnippet(null, pre.innerText);
      });
    }
  } catch (err) {
    if (modalBody) {
      modalBody.innerHTML = `<p class="text-danger">Could not load preview content. Please click "Open Full Sheet".</p>`;
    }
  }
}

function closeCheatsheetModal() {
  const modal = document.getElementById('cheatsheetModal');
  if (modal) modal.classList.remove('active');
}

// Copy Code Snippet Toast Logic
function copyCodeSnippet(event, text) {
  if (event) event.stopPropagation();

  navigator.clipboard.writeText(text).then(() => {
    showCopyToast('Command copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy code snippet:', err);
  });
}

function showCopyToast(msg) {
  const toast = document.getElementById('copyToast');
  if (toast) {
    toast.innerHTML = `<i class="fas fa-check-circle me-2 text-success"></i> ${msg}`;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }
}
