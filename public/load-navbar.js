document.addEventListener("DOMContentLoaded", function() {
    const navbarPlaceholder = document.getElementById("navbar-placeholder");
    if (navbarPlaceholder) {
        fetch("navbar.html")
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status} while fetching navbar.html`);
                }
                return response.text();
            })
            .then(data => {
                navbarPlaceholder.innerHTML = data;

                // Determine which navigation link to highlight
                const actualPageName = window.location.pathname.split("/").pop() || "index.html";
                let pageToHighlight = actualPageName;

                // Mappings from detail pages to their main navigation item's filename
                const pageGroupMappings = {
                    // About section
                    "about-us-detail.html": "about.html",
                    "our-team.html": "about.html",
                    "our-philosophy.html": "about.html",
                    "a-to-z.html": "about.html",
                    // Services section
                    "consultation-info.html": "services.html",
                    "detox-program.html": "services.html",
                    "beyond74-program.html": "services.html",
                    "health-awareness-course.html": "services.html",
                    "introduction-talks.html": "services.html",
                    "1yr-training-course.html": "services.html",
                    "dhanwantari-yog-training.html": "services.html",
                    // Resources section
                    "all-video-resources.html": "resources.html",
                    "all-audio-resources.html": "resources.html",
                    // Testimonials section
                    "all-written-testimonials.html": "testimonials.html",
                    "all-video-testimonials.html": "testimonials.html"
                };

                if (pageGroupMappings[actualPageName]) {
                    pageToHighlight = pageGroupMappings[actualPageName];
                }

                const navLinks = navbarPlaceholder.querySelectorAll(".navbar-links a");
                navLinks.forEach(link => {
                    const linkPage = link.getAttribute("href").split("/").pop();
                    if (linkPage === pageToHighlight) {
                        link.classList.add("active");
                    }
                });
            })
            .catch(error => {
                console.error('Error loading navbar:', error);
                navbarPlaceholder.innerHTML = `<p style="color: red; text-align: center; padding: 10px; border: 1px solid red;">Error: Could not load navigation bar. (${error.message})</p>`;
            });
    } else {
        console.error('Error: The div with id="navbar-placeholder" was not found in the HTML document.');
    }
});