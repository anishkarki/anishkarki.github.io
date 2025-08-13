// Enhanced Portfolio Script with Scientific Effects
document.addEventListener("DOMContentLoaded", function () {
  // Initialize all functions
  loadComponents();
  initializeAOS();
  initializeParticleSystem();
  initializeNeuralNetwork();
  initializeDNAHelix();
  initializeTypedJS();
  initializeSkillBars();
  setupNavbar();
  setupScrollProgress();
  enableSmoothScrolling();
  initializeInteractiveElements();
  initializeScrollAnimations();
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

// Initialize AOS animation with enhanced settings
function initializeAOS() {
  if (typeof AOS !== 'undefined') {
    AOS.init({ 
      duration: 800, 
      once: true,
      offset: 100,
      easing: 'ease-out-cubic',
      delay: 0,
      anchorPlacement: 'top-bottom'
    });
  }
}

// Quantum Particle System
function initializeParticleSystem() {
  const particleSystem = document.getElementById('particleSystem');
  if (!particleSystem) return;

  const particleCount = window.innerWidth > 768 ? 50 : 25;
  
  for (let i = 0; i < particleCount; i++) {
    createQuantumParticle(particleSystem, i);
  }
}

function createQuantumParticle(container, index) {
  const particle = document.createElement('div');
  particle.className = 'quantum-particle';
  
  const size = Math.random() * 6 + 2;
  const x = Math.random() * 100;
  const y = Math.random() * 100;
  const animationDelay = Math.random() * 20;
  const animationDuration = Math.random() * 10 + 15;
  
  particle.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    left: ${x}%;
    top: ${y}%;
    animation-delay: ${animationDelay}s;
    animation-duration: ${animationDuration}s;
    opacity: ${Math.random() * 0.5 + 0.3};
  `;
  
  container.appendChild(particle);
}

// Neural Network Background
function initializeNeuralNetwork() {
  const neuralNetwork = document.getElementById('neuralNetwork');
  if (!neuralNetwork) return;

  const neuronCount = window.innerWidth > 768 ? 30 : 15;
  const synapseCount = window.innerWidth > 768 ? 15 : 8;
  
  // Create neurons
  for (let i = 0; i < neuronCount; i++) {
    createNeuron(neuralNetwork, i);
  }
  
  // Create synapses
  for (let i = 0; i < synapseCount; i++) {
    createSynapse(neuralNetwork, i);
  }
}

function createNeuron(container, index) {
  const neuron = document.createElement('div');
  neuron.className = 'neuron';
  
  neuron.style.cssText = `
    left: ${Math.random() * 100}%;
    top: ${Math.random() * 100}%;
    animation-delay: ${Math.random() * 3}s;
  `;
  
  container.appendChild(neuron);
}

function createSynapse(container, index) {
  const synapse = document.createElement('div');
  synapse.className = 'synapse';
  
  const width = Math.random() * 200 + 50;
  const rotation = Math.random() * 360;
  
  synapse.style.cssText = `
    left: ${Math.random() * 100}%;
    top: ${Math.random() * 100}%;
    width: ${width}px;
    transform: rotate(${rotation}deg);
    animation-delay: ${Math.random() * 2}s;
  `;
  
  container.appendChild(synapse);
}

// DNA Helix Visualization
function initializeDNAHelix() {
  const dnaStrand = document.getElementById('dnaStrand');
  if (!dnaStrand) return;

  const baseCount = 25;
  
  for (let i = 0; i < baseCount; i++) {
    createDNABase(dnaStrand, i, baseCount);
  }
}

function createDNABase(container, index, totalCount) {
  const base = document.createElement('div');
  base.className = 'dna-base';
  
  const angle = (index / totalCount) * 360 * 2; // Two full rotations
  const y = (index / totalCount) * 100;
  const x = 50 + 30 * Math.cos(angle * Math.PI / 180);
  
  base.style.cssText = `
    left: ${x}%;
    top: ${y}%;
    animation-delay: ${index * 0.1}s;
    animation-duration: ${Math.random() * 2 + 3}s;
  `;
  
  container.appendChild(base);
  
  // Create complementary base pair
  if (index % 2 === 0) {
    const complementaryBase = document.createElement('div');
    complementaryBase.className = 'dna-base';
    const complementaryX = 50 - 30 * Math.cos(angle * Math.PI / 180);
    
    complementaryBase.style.cssText = `
      left: ${complementaryX}%;
      top: ${y}%;
      animation-delay: ${index * 0.1 + 0.5}s;
      animation-duration: ${Math.random() * 2 + 3}s;
      background: var(--photon-green);
      box-shadow: 0 0 15px var(--photon-green);
    `;
    
    container.appendChild(complementaryBase);
  }
}

// Enhanced Typing Effect
function initializeTypedJS() {
  const typingElement = document.getElementById('typingText');
  if (!typingElement) return;

  const texts = [
    'SQL Database Administrator',
    'Cloud Migration Specialist', 
    'Azure Certified Professional',
    'Performance Tuning Expert',
    'High Availability Specialist',
    'Data Engineering Professional',
    'Enterprise Database Architect'
  ];
  
  let textIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  
  function typeWriter() {
    const currentText = texts[textIndex];
    
    if (isDeleting) {
      typingElement.textContent = currentText.substring(0, charIndex - 1);
      charIndex--;
    } else {
      typingElement.textContent = currentText.substring(0, charIndex + 1);
      charIndex++;
    }
    
    let typeSpeed = isDeleting ? 50 : 100;
    
    if (!isDeleting && charIndex === currentText.length) {
      typeSpeed = 2000; // Pause at end
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      textIndex = (textIndex + 1) % texts.length;
      typeSpeed = 500; // Pause before next text
    }
    
    setTimeout(typeWriter, typeSpeed);
  }
  
  typeWriter();
}

// Enhanced Skill Bars with Intersection Observer
function initializeSkillBars() {
  const skillBars = document.querySelectorAll('.skill-progress');
  if (!skillBars.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const bar = entry.target;
        const width = bar.getAttribute('data-width');
        
        // Add staggered animation
        setTimeout(() => {
          bar.style.width = width;
          bar.style.opacity = '1';
          
          // Add completion effect
          setTimeout(() => {
            bar.style.boxShadow = '0 0 25px rgba(45, 212, 191, 0.8)';
            setTimeout(() => {
              bar.style.boxShadow = '0 0 15px rgba(45, 212, 191, 0.5)';
            }, 200);
          }, 2000);
        }, Math.random() * 500);
        
        observer.unobserve(bar);
      }
    });
  }, { 
    threshold: 0.5,
    rootMargin: '-50px'
  });

  skillBars.forEach(bar => {
    bar.style.width = '0%';
    bar.style.opacity = '0.3';
    observer.observe(bar);
  });
}

// Enhanced Navbar with scroll effects
function setupNavbar() {
  const navbar = document.querySelector('.navbar');
  const navbarToggler = document.querySelector('.navbar-toggler');
  const navbarCollapse = document.getElementById('navbarNav');
  const navLinks = document.querySelectorAll('.nav-link');
  
  if (!navbar) return;
  
  let lastScrollY = window.scrollY;
  let isNavbarHidden = false;
  
  // Enhanced scroll behavior
  window.addEventListener('scroll', function() {
    const currentScrollY = window.scrollY;
    
    // Add scrolled class
    if (currentScrollY > 50) {
      navbar.classList.add('navbar-scrolled');
    } else {
      navbar.classList.remove('navbar-scrolled');
    }
    
    // Hide/show navbar on scroll (optional)
    if (currentScrollY > lastScrollY && currentScrollY > 100) {
      // Scrolling down
      if (!isNavbarHidden) {
        navbar.style.transform = 'translateY(-100%)';
        isNavbarHidden = true;
      }
    } else {
      // Scrolling up
      if (isNavbarHidden) {
        navbar.style.transform = 'translateY(0)';
        isNavbarHidden = false;
      }
    }
    
    lastScrollY = currentScrollY;
    
    // Update active nav link
    updateActiveNavLink(navLinks);
  });
  
  // Collapse navbar functionality
  if (navbarToggler && navbarCollapse) {
    // Close navbar when clicking on a nav link
    navLinks.forEach(link => {
      link.addEventListener('click', function() {
        if (navbarCollapse.classList.contains('show')) {
          const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
          if (bsCollapse) {
            bsCollapse.hide();
          }
        }
      });
    });
    
    // Close navbar when clicking outside
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
  }
}

// Update active navigation link based on scroll position
function updateActiveNavLink(navLinks) {
  if (!navLinks.length) return;
  
  const sections = document.querySelectorAll('section[id]');
  const scrollPosition = window.pageYOffset + 100;
  
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

// Scroll Progress Indicator
function setupScrollProgress() {
  const scrollProgress = document.querySelector('.scroll-progress');
  if (!scrollProgress) return;

  window.addEventListener('scroll', function() {
    const scrollTop = document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (scrollTop / scrollHeight) * 100;
    scrollProgress.style.width = scrolled + '%';
  });
}

// Enhanced Smooth Scrolling with easing
function enableSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href !== '#' && href.length > 1) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          const targetPosition = target.offsetTop - 80; // Account for fixed navbar
          const startPosition = window.pageYOffset;
          const distance = targetPosition - startPosition;
          const duration = Math.min(Math.abs(distance) / 2, 1000); // Dynamic duration
          let start = null;
          
          function animation(currentTime) {
            if (start === null) start = currentTime;
            const timeElapsed = currentTime - start;
            const run = easeInOutCubic(timeElapsed, startPosition, distance, duration);
            window.scrollTo(0, run);
            if (timeElapsed < duration) requestAnimationFrame(animation);
          }
          
          function easeInOutCubic(t, b, c, d) {
            t /= d / 2;
            if (t < 1) return c / 2 * t * t * t + b;
            t -= 2;
            return c / 2 * (t * t * t + 2) + b;
          }
          
          requestAnimationFrame(animation);
        }
      }
    });
  });
}

// Interactive Elements Enhancement
function initializeInteractiveElements() {
  // Enhanced hover effects for project cards
  const projectCards = document.querySelectorAll('.project-card');
  projectCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-15px) rotateX(5deg) scale(1.02)';
      this.style.boxShadow = '0 25px 70px rgba(45, 212, 191, 0.3)';
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0) rotateX(0) scale(1)';
      this.style.boxShadow = 'none';
    });
  });

  // Enhanced ripple effect for buttons
  const buttons = document.querySelectorAll('.quantum-btn');
  buttons.forEach(button => {
    button.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: quantumRipple 0.6s linear;
        pointer-events: none;
        z-index: 1;
      `;
      
      this.appendChild(ripple);
      
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });

  // Add quantum ripple animation
  if (!document.querySelector('#quantum-effects-styles')) {
    const style = document.createElement('style');
    style.id = 'quantum-effects-styles';
    style.textContent = `
      @keyframes quantumRipple {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }
      
      .quantum-card-visible {
        animation: quantumSlideIn 0.8s ease-out forwards;
      }
      
      @keyframes quantumSlideIn {
        from {
          opacity: 0;
          transform: translateY(50px) scale(0.9);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      .timeline-item-visible {
        animation: timelineSlideIn 0.6s ease-out forwards;
      }
      
      @keyframes timelineSlideIn {
        from {
          opacity: 0;
          transform: translateX(-30px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Enhanced Scroll Animations
function initializeScrollAnimations() {
  const quantumCards = document.querySelectorAll('.quantum-card');
  const timelineItems = document.querySelectorAll('.timeline-item');
  const projectCards = document.querySelectorAll('.project-card');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        
        if (element.classList.contains('quantum-card')) {
          element.classList.add('quantum-card-visible');
        } else if (element.classList.contains('timeline-item')) {
          element.classList.add('timeline-item-visible');
        } else if (element.classList.contains('project-card')) {
          element.style.animation = 'quantumSlideIn 0.8s ease-out forwards';
        }
        
        observer.unobserve(element);
      }
    });
  }, { 
    threshold: 0.1,
    rootMargin: '-20px'
  });

  [...quantumCards, ...timelineItems, ...projectCards].forEach(element => {
    observer.observe(element);
  });
}

// Parallax Effects
function initializeParallaxEffects() {
  const heroSection = document.querySelector('.hero-section');
  const dnaHelix = document.querySelector('.dna-helix');
  
  if (window.innerWidth > 768) { // Only on desktop
    window.addEventListener('scroll', function() {
      const scrolled = window.pageYOffset;
      const rate = scrolled * -0.3;
      
      if (heroSection) {
        heroSection.style.transform = `translateY(${rate}px)`;
      }
      
      if (dnaHelix) {
        dnaHelix.style.transform = `translateY(${scrolled * 0.2}px) rotateY(${scrolled * 0.1}deg)`;
      }
    });
  }
}

// Mouse Movement Effects (subtle)
function initializeMouseEffects() {
  if (window.innerWidth > 1024) { // Only on large screens
    document.addEventListener('mousemove', function(e) {
      const mouseX = e.clientX / window.innerWidth;
      const mouseY = e.clientY / window.innerHeight;
      
      // Subtle particle attraction
      const particles = document.querySelectorAll('.quantum-particle');
      particles.forEach((particle, index) => {
        if (index % 5 === 0) { // Only affect every 5th particle
          const attractionStrength = 20;
          const deltaX = (mouseX - 0.5) * attractionStrength;
          const deltaY = (mouseY - 0.5) * attractionStrength;
          
          particle.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        }
      });
    });
  }
}

// Performance Optimization
function optimizeForPerformance() {
  // Throttle resize events
  let resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
      // Reinitialize particle system with new screen size
      const particleSystem = document.getElementById('particleSystem');
      const neuralNetwork = document.getElementById('neuralNetwork');
      
      if (particleSystem) {
        particleSystem.innerHTML = '';
        initializeParticleSystem();
      }
      
      if (neuralNetwork) {
        neuralNetwork.innerHTML = '';
        initializeNeuralNetwork();
      }
    }, 250);
  });
  
  // Pause animations when tab is not visible
  document.addEventListener('visibilitychange', function() {
    const particles = document.querySelectorAll('.quantum-particle, .neuron, .synapse');
    particles.forEach(particle => {
      if (document.hidden) {
        particle.style.animationPlayState = 'paused';
      } else {
        particle.style.animationPlayState = 'running';
      }
    });
  });
}

// Initialize Contact Form Enhancement (if needed)
function initializeContactForm() {
  const contactForm = document.querySelector('#contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Add quantum loading effect
      const submitBtn = this.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      
      submitBtn.innerHTML = '<span class="loading-spinner"></span> Sending...';
      submitBtn.disabled = true;
      
      // Simulate form submission (replace with actual logic)
      setTimeout(() => {
        submitBtn.textContent = '✓ Message Sent!';
        submitBtn.style.background = 'var(--photon-green)';
        
        setTimeout(() => {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
          submitBtn.style.background = '';
          this.reset();
        }, 3000);
      }, 2000);
    });
  }
}

// Social Links Enhancement
function enhanceSocialLinks() {
  const socialLinks = document.querySelectorAll('.social-link, .footer a');
  socialLinks.forEach(link => {
    link.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-3px) scale(1.1)';
      this.style.textShadow = '0 0 20px currentColor';
      this.style.filter = 'brightness(1.2)';
    });
    
    link.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0) scale(1)';
      this.style.textShadow = 'none';
      this.style.filter = 'brightness(1)';
    });
  });
}

// Initialize all enhancements
function initializeAllEnhancements() {
  initializeParallaxEffects();
  initializeMouseEffects();
  optimizeForPerformance();
  initializeContactForm();
  enhanceSocialLinks();
}

// Call initialization after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(initializeAllEnhancements, 1000); // Delay for better performance
});

// Export functions for use in other files
window.PortfolioEffects = {
  initializeParticleSystem,
  initializeNeuralNetwork,
  initializeDNAHelix,
  initializeTypedJS,
  initializeSkillBars
};