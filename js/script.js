// Function to load navbar and footer
function loadComponent(id, file) {
    fetch(file)
        .then(response => response.text())
        .then(data => {
            document.getElementById(id).innerHTML = data;
        })
        .catch(error => console.error(`Error loading ${file}:`, error));
}

// Load components
document.addEventListener("DOMContentLoaded", function () {
    loadComponent("navbar-placeholder", "components/navbar.html");
    loadComponent("footer-placeholder", "components/footer.html");
    loadComponent("project-navbar-placeholder", "components/project-navbar.html");
});


    // Initialize AOS animation
    AOS.init({
        duration: 800,
        once: true
      });
    
      // Activate the skill progress bars on scroll
      const skillBars = document.querySelectorAll('.skill-progress-bar');
      window.addEventListener('load', function() {
        skillBars.forEach(bar => {
          const width = bar.getAttribute('data-width');
          bar.style.width = width;
        });
      });
    
      // Initialize Typed.js for the hero section
      document.addEventListener('DOMContentLoaded', function() {
        var typed = new Typed('#typed-output', {
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
        
        // Handle navbar collapse - Move inside DOMContentLoaded to ensure elements exist
        setupNavbarCollapse();
      });
    
      // Function to set up navbar collapse behavior
      function setupNavbarCollapse() {
        const navbarToggler = document.querySelector('.navbar-toggler');
        const navbarCollapse = document.querySelector('.navbar-collapse');
        
        // Skip if elements don't exist
        if (!navbarToggler || !navbarCollapse) {
          console.warn('Navbar elements not found');
          return;
        }
        
        // Use Bootstrap's collapse API directly
        const bsCollapse = new bootstrap.Collapse(navbarCollapse, {
          toggle: false
        });
        
        // Close navbar when clicking outside
        document.addEventListener('click', function(event) {
          if (navbarCollapse.classList.contains('show') && 
              !navbarToggler.contains(event.target) && 
              !navbarCollapse.contains(event.target)) {
            bsCollapse.hide();
          }
        });
        
        // Close navbar when scrolling
        let scrollTimeout;
        window.addEventListener('scroll', function() {
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(function() {
            if (navbarCollapse.classList.contains('show')) {
              bsCollapse.hide();
            }
          }, 150); // Small delay to avoid performance issues
        });
        
        // Close navbar when clicking a nav-link
        const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
        navLinks.forEach(link => {
          link.addEventListener('click', function() {
            if (navbarCollapse.classList.contains('show')) {
              bsCollapse.hide();
            }
          });
        });
      }
    
      // Smooth scrolling for navigation links
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
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
    
      // Add active class to navigation based on scroll position
      window.addEventListener('scroll', function() {
        let scrollPosition = window.scrollY;
        
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
    
        // Add backdrop blur to navbar on scroll
        const navbar = document.querySelector('.navbar');
        if (navbar) {
          if (scrollPosition > 50) {
            navbar.classList.add('shadow-sm');
          } else {
            navbar.classList.remove('shadow-sm');
          }
        }
      });

