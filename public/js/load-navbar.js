document.addEventListener("DOMContentLoaded", async function () {
    const navbarPlaceholder = document.getElementById("navbar-placeholder");
    if (navbarPlaceholder) {
        let data = await fetch("navbar.html")
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status} while fetching navbar.html`);
                }
                return response.text();
            })
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

        let moreLinks = await fetch('/api/nav-items.json').then(response => response.json());
        moreLinks.items.forEach(link => {
            const linkItem = document.createElement('li');
            linkItem.classList.add('nav-item');
            let el = document.createElement('a');
            el.href = `${link.name}.html`;
            el.classList.add('nav-link');
            el.textContent = link.text;
            el.classList.add('nav-item');
            linkItem.appendChild(el);
            navbarPlaceholder.querySelector('.navbar-links').appendChild(linkItem);
        });

        // isadmin?
        const adminToken = localStorage.getItem('adminWebsiteToken');
        if (adminToken) {
            let verify = await fetch('/api/admin/verify', {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            }).then(response => response.json());
            if (verify.isAdmin) {
                const adminLink = document.createElement('li');
                adminLink.classList.add('nav-item');
                adminLink.innerHTML = `<a class="nav-link" href="/new-page.html">New Page</a>`;
                navbarPlaceholder.querySelector('.navbar-links').appendChild(adminLink);

                // Create and add a new Logout button
                const logoutListItem = document.createElement('li');
                logoutListItem.innerHTML = `<a href="#">Logout</a>`;
                logoutListItem.querySelector('a').addEventListener('click', (event) => {
                    event.preventDefault();
                    localStorage.removeItem('adminWebsiteToken');
                    // Redirect to the admin login page
                    window.location.href = '/admin.html';
                });
                navbarPlaceholder.querySelector('.navbar-links').appendChild(logoutListItem);
            }
        }

        const navLinks = navbarPlaceholder.querySelectorAll(".navbar-links a");
        navLinks.forEach(link => {
            const linkPage = link.getAttribute("href").split("/").pop();
            if (linkPage === pageToHighlight) {
                link.classList.add("active");
            }
        });

    } else {
        console.error('Error: The div with id="navbar-placeholder" was not found in the HTML document.');
    }
});