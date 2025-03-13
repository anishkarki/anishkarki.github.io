document.addEventListener("DOMContentLoaded", function () {
  // Initialize all functions
  loadComponents();
  initializeAOS();
  initializeSkillBars();
  initializeTypedJS();
  setupNavbar();
  enableSmoothScrolling();
});

// Function to load navbar and footer components
function loadComponents() {
  const components = [
    { id: "navbar-placeholder", file: "components/navbar.html" },
    { id: "footer-placeholder", file: "components/footer.html" },
    { id: "project-navbar-placeholder", file: "components/project-navbar.html" }
  ];

  components.forEach(comp => {
    const element = document.getElementById(comp.id);
    if (element) {
      fetch(comp.file)
        .then(response => response.text())
        .then(data => element.innerHTML = data)
        .then(() => {
          // Initialize navbar functionality after navbar is loaded
          if (comp.id === "navbar-placeholder") {
            setupNavbar();
          }
        })
        .catch(error => console.error(`Error loading ${comp.file}:`, error));
    }
  });
}

// Initialize AOS animation
function initializeAOS() {
  if (typeof AOS !== 'undefined') {
    AOS.init({ duration: 800, once: true });
  }
}

// Activate skill progress bars on scroll
function initializeSkillBars() {
  const skillBars = document.querySelectorAll('.skill-progress-bar');
  if (skillBars.length) {
    skillBars.forEach(bar => {
      const width = bar.getAttribute('data-width');
      bar.style.width = width;
    });
  }
}

// Initialize Typed.js for dynamic text in the hero section
function initializeTypedJS() {
  const typedElement = document.getElementById('typed-output');
  if (typedElement && typeof Typed !== 'undefined') {
    new Typed('#typed-output', {
      strings: [
        'Database Administrator',
        'Data Analytics Professional',
        'Azure Cloud Specialist',
        'SQL Expert & Python Developer'
      ],
      typeSpeed: 50,
      backSpeed: 30,
      backDelay: 2000,
      loop: true
    });
  }
}

// Setup all navbar related functionality
function setupNavbar() {
  const navbar = document.querySelector('.navbar');
  const navbarToggler = document.querySelector('.navbar-toggler');
  const navbarCollapse = document.getElementById('navbarNav');
  const navLinks = document.querySelectorAll('.nav-link');
  
  if (!navbar || !navbarToggler || !navbarCollapse) return;
  
  // Change navbar style on scroll
  window.addEventListener('scroll', function() {
    if (window.scrollY > 50) {
      navbar.classList.add('navbar-scrolled', 'shadow-sm');
    } else {
      navbar.classList.remove('navbar-scrolled', 'shadow-sm');
    }
    
    // Update active nav link
    updateActiveNavLink(navLinks);
  });
  
  // Collapse navbar when clicking on a nav link
  navLinks.forEach(link => {
    link.addEventListener('click', function() {
      const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
      if (bsCollapse && window.innerWidth < 992) {
        bsCollapse.hide();
      }
    });
  });
  
  // Collapse navbar when clicking outside
  document.addEventListener('click', function(event) {
    const isNavbarCollapse = navbarCollapse.contains(event.target);
    const isNavbarToggler = navbarToggler.contains(event.target);
    
    if (!isNavbarCollapse && !isNavbarToggler && navbarCollapse.classList.contains('show')) {
      const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
      if (bsCollapse) {
        bsCollapse.hide();
      }
    }
  });
  
  // Initial active state
  updateActiveNavLink(navLinks);
}

// Update active navigation link based on scroll position
function updateActiveNavLink(navLinks) {
  if (!navLinks.length) return;
  
  const sections = document.querySelectorAll('section[id]');
  const scrollPosition = window.pageYOffset + 100; // Offset for fixed navbar
  
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.offsetHeight;
    const sectionId = section.getAttribute('id');
    
    if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${sectionId}`) {
          link.classList.add('active');
        }
      });
    }
  });
}

// Enable smooth scrolling for anchor links
function enableSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href !== '#') {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          window.scrollTo({
            top: target.offsetTop - 70,
            behavior: 'smooth'
          });
        }
      }
    });
  });
}