document.addEventListener("DOMContentLoaded", function () {
  loadComponents();
  initializeAOS();
  initializeSkillBars();
  initializeTypedJS();
  setupNavbarCollapse();
  enableSmoothScrolling();
  trackActiveNavLinks();
});

// Function to load navbar and footer components
function loadComponent(id, file) {
  fetch(file)
    .then(response => response.text())
    .then(data => document.getElementById(id).innerHTML = data)
    .catch(error => console.error(`Error loading ${file}:`, error));
}

function loadComponents() {
  const components = [
    { id: "navbar-placeholder", file: "components/navbar.html" },
    { id: "footer-placeholder", file: "components/footer.html" },
    { id: "project-navbar-placeholder", file: "components/project-navbar.html" }
  ];

  components.forEach(comp => loadComponent(comp.id, comp.file));
}

// Initialize AOS animation
function initializeAOS() {
  AOS.init({ duration: 800, once: true });
}

// Activate skill progress bars on scroll
function initializeSkillBars() {
  const skillBars = document.querySelectorAll('.skill-progress-bar');
  window.addEventListener('load', function () {
    skillBars.forEach(bar => {
      const width = bar.getAttribute('data-width');
      bar.style.width = width;
    });
  });
}

// Initialize Typed.js for dynamic text in the hero section
function initializeTypedJS() {
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

// Handle navbar collapse behavior
function setupNavbarCollapse() {
  const navbarToggler = document.querySelector(".navbar-toggler");
  const navbarCollapse = document.querySelector(".navbar-collapse");

  if (!navbarToggler || !navbarCollapse) return;

  // Close navbar when clicking outside
  document.addEventListener("click", function (event) {
    if (!navbarToggler.contains(event.target) && !navbarCollapse.contains(event.target)) {
      closeNavbar();
    }
  });

  // Close navbar on scroll
  window.addEventListener("scroll", closeNavbar);

  // Toggle navbar when clicking the toggler button
  navbarToggler.addEventListener("click", function (event) {
    event.stopPropagation(); // Prevent immediate closure
  });

  function closeNavbar() {
    if (navbarCollapse.classList.contains("show")) {
      navbarToggler.click();
    }
  }
}

// Smooth scrolling for navigation links
function enableSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        window.scrollTo({
          top: target.offsetTop - 70,
          behavior: 'smooth'
        });
      }
    });
  });
}

// Add active class to navigation based on scroll position
function trackActiveNavLinks() {
  window.addEventListener('scroll', function () {
    const scrollPosition = window.scrollY;

    document.querySelectorAll('section').forEach(section => {
      const sectionTop = section.offsetTop - 100;
      const sectionHeight = section.offsetHeight;
      const sectionId = section.getAttribute('id');

      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        document.querySelectorAll('.nav-link').forEach(navLink => {
          navLink.classList.remove('active');
          if (navLink.getAttribute('href') === `#${sectionId}`) {
            navLink.classList.add('active');
          }
        });
      }
    });

    updateNavbarStyle(scrollPosition);
  });
}

// Add backdrop blur to navbar on scroll
function updateNavbarStyle(scrollPosition) {
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    navbar.classList.toggle('shadow-sm', scrollPosition > 50);
  }
}
