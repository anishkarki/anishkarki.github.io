// js/lesson-viewer.js

// Reuse your lessonsData (or import it)
const lessonsData = {
  ansible: {
    title: "Ansible Automation",
    description: "Master infrastructure automation with Ansible. Learn to write playbooks, manage configurations, and automate deployment workflows across multiple servers.",
    difficulty: "intermediate",
    icon: "fas fa-cogs",
    iconColor: "var(--neutron-cyan)",
    topics: ["Playbooks", "Inventory Management", "Roles & Modules", "CI/CD Integration"],
    chapters: [
      { number: 1, title: "Introduction to Ansible", description: "Understanding Ansible architecture and core concepts", duration: "30 min", file: "01-introduction.md" },
      { number: 2, title: "Installation & Setup", description: "Setting up Ansible on various platforms", duration: "25 min", file: "02-installation.md" },
      { number: 3, title: "Inventory Management", description: "Managing hosts and groups in Ansible", duration: "40 min", file: "03-inventory.md" },
      { number: 4, title: "Ad-Hoc Commands", description: "Running quick commands across multiple servers", duration: "35 min", file: "04-adhoc-commands.md" },
      { number: 5, title: "Playbooks Basics", description: "Writing your first Ansible playbooks", duration: "45 min", file: "05-playbooks-basics.md" },
      { number: 6, title: "Variables & Facts", description: "Working with variables and gathering facts", duration: "40 min", file: "06-variables-facts.md" },
      { number: 7, title: "Handlers & Templates", description: "Using handlers and Jinja2 templates", duration: "50 min", file: "07-handlers-templates.md" },
      { number: 8, title: "Roles & Galaxy", description: "Organizing playbooks with roles", duration: "55 min", file: "08-roles-galaxy.md" },
      { number: 9, title: "Ansible Vault", description: "Securing sensitive data with Vault", duration: "30 min", file: "09-vault.md" },
      { number: 10, title: "Error Handling", description: "Managing errors and conditions", duration: "35 min", file: "10-error-handling.md" },
      { number: 11, title: "Testing Playbooks", description: "Testing and debugging Ansible code", duration: "40 min", file: "11-testing.md" },
      { number: 12, title: "CI/CD Integration", description: "Integrating Ansible with CI/CD pipelines", duration: "60 min", file: "12-cicd.md" }
    ]
  },
  postgresql: {
    title: "PostgreSQL Mastery",
    description: "Complete guide to PostgreSQL from basics to advanced topics. Learn database design, query optimization, replication, and performance tuning techniques.",
    difficulty: "beginner",
    icon: "fas fa-database",
    iconColor: "var(--photon-green)",
    topics: ["SQL Fundamentals", "Query Optimization", "Replication", "Backup & Recovery"],
    chapters: [
      { number: 1, title: "Introduction to PostgreSQL", description: "Overview of PostgreSQL features and architecture", duration: "35 min", file: "01-introduction.md" },
      { number: 2, title: "Installation & Configuration", description: "Installing and configuring PostgreSQL", duration: "40 min", file: "02-installation.md" },
      { number: 3, title: "Database Design", description: "Designing efficient database schemas", duration: "60 min", file: "03-database-design.md" },
      { number: 4, title: "SQL Fundamentals", description: "Core SQL queries and operations", duration: "55 min", file: "04-sql-fundamentals.md" },
      { number: 5, title: "Advanced Queries", description: "Complex queries, CTEs, and window functions", duration: "70 min", file: "05-advanced-queries.md" },
      { number: 6, title: "Indexing Strategies", description: "Creating and optimizing indexes", duration: "50 min", file: "06-indexing.md" },
      { number: 7, title: "Query Performance Tuning", description: "Analyzing and optimizing query performance", duration: "65 min", file: "07-performance-tuning.md" },
      { number: 8, title: "Transactions & ACID", description: "Understanding transactions and concurrency", duration: "45 min", file: "08-transactions.md" },
      { number: 9, title: "Backup & Recovery", description: "Backup strategies and disaster recovery", duration: "55 min", file: "09-backup-recovery.md" },
      { number: 10, title: "Replication Setup", description: "Setting up streaming replication", duration: "60 min", file: "10-replication.md" },
      { number: 11, title: "High Availability", description: "Implementing HA with PostgreSQL", duration: "70 min", file: "11-high-availability.md" },
      { number: 12, title: "Monitoring & Logging", description: "Monitoring tools and log analysis", duration: "50 min", file: "12-monitoring.md" },
      { number: 13, title: "Security Best Practices", description: "Securing your PostgreSQL database", duration: "55 min", file: "13-security.md" },
      { number: 14, title: "Extensions & PL/pgSQL", description: "Using extensions and stored procedures", duration: "60 min", file: "14-extensions.md" },
      { number: 15, title: "Production Deployment", description: "Best practices for production environments", duration: "65 min", file: "15-production.md" }
    ]
  },
  kubernetes: {
    title: "Kubernetes Orchestration",
    description: "Deep dive into container orchestration with Kubernetes. Learn cluster management, deployment strategies, service mesh, and production-ready configurations.",
    difficulty: "advanced",
    icon: "fas fa-dharmachakra",
    iconColor: "#326CE5",
    topics: ["Pods & Deployments", "Services & Ingress", "StatefulSets", "Helm Charts"],
    chapters: [
      { number: 1, title: "Kubernetes Overview", description: "Understanding Kubernetes architecture", duration: "40 min", file: "01-overview.md" },
      { number: 2, title: "Cluster Setup", description: "Setting up local and cloud clusters", duration: "50 min", file: "02-cluster-setup.md" },
      { number: 3, title: "Pods & Containers", description: "Working with pods and containers", duration: "45 min", file: "03-pods-containers.md" },
      { number: 4, title: "Deployments", description: "Managing deployments and rollouts", duration: "55 min", file: "04-deployments.md" },
      { number: 5, title: "Services & Networking", description: "Service types and networking concepts", duration: "60 min", file: "05-services-networking.md" },
      { number: 6, title: "ConfigMaps & Secrets", description: "Managing configuration and secrets", duration: "40 min", file: "06-configmaps-secrets.md" },
      { number: 7, title: "Persistent Storage", description: "Working with volumes and storage", duration: "55 min", file: "07-persistent-storage.md" },
      { number: 8, title: "StatefulSets", description: "Managing stateful applications", duration: "50 min", file: "08-statefulsets.md" },
      { number: 9, title: "Ingress Controllers", description: "Setting up ingress for external access", duration: "45 min", file: "09-ingress.md" },
      { number: 10, title: "Resource Management", description: "CPU and memory limits and requests", duration: "40 min", file: "10-resource-management.md" },
      { number: 11, title: "Helm Package Manager", description: "Using Helm for application deployment", duration: "60 min", file: "11-helm.md" },
      { number: 12, title: "Monitoring & Logging", description: "Prometheus and ELK stack integration", duration: "65 min", file: "12-monitoring.md" },
      { number: 13, title: "Security & RBAC", description: "Implementing security policies", duration: "55 min", file: "13-security-rbac.md" },
      { number: 14, title: "Production Best Practices", description: "Running Kubernetes in production", duration: "70 min", file: "14-production.md" }
    ]
  },
  automation: {
    title: "Automation with Bash & Python",
    description: "Learn to automate repetitive tasks using Bash scripting and Python. Build powerful automation tools for system administration and DevOps workflows.",
    difficulty: "intermediate",
    icon: "fas fa-robot",
    iconColor: "#FFB800",
    topics: ["Bash Scripting", "Python Automation", "Cron Jobs", "Log Processing"],
    chapters: [
      { number: 1, title: "Bash Scripting Basics", description: "Introduction to shell scripting", duration: "40 min", file: "01-bash-basics.md" },
      { number: 2, title: "Advanced Bash Techniques", description: "Functions, arrays, and advanced patterns", duration: "50 min", file: "02-advanced-bash.md" },
      { number: 3, title: "Text Processing", description: "sed, awk, and grep mastery", duration: "45 min", file: "03-text-processing.md" },
      { number: 4, title: "Python for Automation", description: "Python basics for system automation", duration: "55 min", file: "04-python-automation.md" },
      { number: 5, title: "File Operations", description: "Working with files and directories", duration: "40 min", file: "05-file-operations.md" },
      { number: 6, title: "System Administration", description: "Automating system admin tasks", duration: "50 min", file: "06-system-admin.md" },
      { number: 7, title: "API Integration", description: "Working with REST APIs in Python", duration: "55 min", file: "07-api-integration.md" },
      { number: 8, title: "Log Processing", description: "Analyzing and processing logs", duration: "45 min", file: "08-log-processing.md" },
      { number: 9, title: "Scheduled Tasks", description: "Cron jobs and task scheduling", duration: "35 min", file: "09-scheduled-tasks.md" },
      { number: 10, title: "Building CLI Tools", description: "Creating command-line applications", duration: "60 min", file: "10-cli-tools.md" }
    ]
  }
};

// Parse URL
const urlParams = new URLSearchParams(window.location.search);
const courseKey = urlParams.get('course');
const fileName = urlParams.get('file');

if (!courseKey || !fileName) {
  document.getElementById('lesson-content').innerHTML = '<p class="text-danger">Invalid lesson URL.</p>';
  throw new Error('Missing course or file parameter');
}

const course = lessonsData[courseKey];
if (!course) {
  document.getElementById('lesson-content').innerHTML = `<p class="text-danger">Course "${courseKey}" not found.</p>`;
  throw new Error(`Unknown course: ${courseKey}`);
}

const chapter = course.chapters.find(ch => ch.file === fileName);
if (!chapter) {
  document.getElementById('lesson-content').innerHTML = `<p class="text-danger">Chapter "${fileName}" not found.</p>`;
  throw new Error(`Chapter not found: ${fileName}`);
}

// Update header
document.getElementById('lesson-title').textContent = chapter.title;
document.getElementById('lesson-meta').textContent = `${course.title} • ${chapter.duration}`;

// Render sidebar chapter list
const chapterListEl = document.getElementById('chapter-list-sidebar');
let sidebarHTML = '';
course.chapters.forEach((ch, index) => {
  const isActive = ch.file === fileName;
  sidebarHTML += `
    <li class="chapter-item ${isActive ? 'current' : ''}" data-file="${ch.file}">
      <span class="chapter-number">${ch.number}</span>
      ${ch.title}
    </li>
  `;
});
chapterListEl.innerHTML = sidebarHTML;

// Add click handlers to sidebar items
document.querySelectorAll('.chapter-item').forEach(item => {
  item.addEventListener('click', () => {
    const file = item.dataset.file;
    window.location.href = `lesson-viewer.html?course=${courseKey}&file=${file}`;
  });
});

// Fetch and render Markdown
fetch(`lessons/${courseKey}/${fileName}`)
  .then(response => {
    if (!response.ok) throw new Error(`Failed to load ${fileName}`);
    return response.text();
  })
  .then(markdown => {
    marked.setOptions({ gfm: true, breaks: true });
    document.getElementById('lesson-content').innerHTML = marked.parse(markdown);
  })
  .catch(err => {
    console.error('Error loading lesson:', err);
    document.getElementById('lesson-content').innerHTML = 
      `<p class="text-danger">Failed to load lesson: ${err.message}</p>`;
  });

// Navigation buttons
const currentIndex = course.chapters.findIndex(ch => ch.file === fileName);
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

if (currentIndex > 0) {
  const prev = course.chapters[currentIndex - 1];
  prevBtn.disabled = false;
  prevBtn.onclick = () => {
    window.location.href = `lesson-viewer.html?course=${courseKey}&file=${prev.file}`;
  };
}

if (currentIndex < course.chapters.length - 1) {
  const next = course.chapters[currentIndex + 1];
  nextBtn.disabled = false;
  nextBtn.onclick = () => {
    window.location.href = `lesson-viewer.html?course=${courseKey}&file=${next.file}`;
  };
}