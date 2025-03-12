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
