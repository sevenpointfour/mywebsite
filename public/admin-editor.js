function initializeAdminEditor() {
    // Derive pageNameForContent from the HTML filename
    let pageNameForContent = window.location.pathname.split("/").pop() || "index.html";
    if (pageNameForContent.endsWith('.html')) {
        pageNameForContent = pageNameForContent.slice(0, -5);
    }
    if (pageNameForContent === "" || pageNameForContent === "index.html") {
        pageNameForContent = "index";
    }

    if (document.querySelector('.content-html')) {
        document.querySelector('.content-html .page-title-section h1').textContent = pageNameForContent.replace(/-/g, ' ');
        document.head.title = pageNameForContent.replace(/-/g, ' ');
    }
    const adminToken = localStorage.getItem('adminWebsiteToken');
    const saveButton = document.getElementById('saveButton');
    const statusDiv = document.getElementById('status');
    let isReadOnly = !adminToken;

    async function initializePage() {
        if (adminToken) {
            try {
                const response = await fetch('/api/admin/verify', {
                    headers: { 'Authorization': `Bearer ${adminToken}` }
                });
                const data = await response.json();
                if (response.ok && data.isAdmin) {
                    isReadOnly = false;
                }
            } catch (error) {
                console.error('Admin verification failed:', error);
            }
        }

        if (saveButton) {
            if (isReadOnly) {
                saveButton.style.display = 'none';
            } else {
                saveButton.style.display = 'block';
                addSaveListener();
            }
        }

        if (isReadOnly) {
            // Extract local variable for the editorEl
            const editorEl = document.querySelector('textarea#editor');
            if (editorEl) {
                editorEl.style.display = 'none';
                let contentDiv = document.createElement('div');
                contentDiv.classList.add('readonly-content');
                const response = await fetch(`/api/page-content/${pageNameForContent}`);
                if (!response.ok) throw new Error(`Failed to load content. Status: ${response.status}`);
                const data = await response.json();
                contentDiv.innerHTML = getContent(data);
                contentDiv.style.display = 'block';
                contentDiv.classList.add('readonly-content'); // Add a class for styling if needed
                editorEl.parentNode.insertBefore(contentDiv, editorEl);
            }
        } else {
            tinymce.init({
                selector: 'textarea#editor',
                readonly: isReadOnly,
                plugins: 'code table lists image link media wordcount help',
                toolbar: isReadOnly ? false : 'undo redo | blocks | bold italic | alignleft aligncenter alignright | indent outdent | bullist numlist | code | table | image link media | help',
                menubar: !isReadOnly,
                height: 500,
                setup: function (editor) {
                    editor.on('init', function () {
                        loadContent();
                    });
                }
            });
        }
    }

    async function loadContent() {
        if (statusDiv) statusDiv.textContent = `Loading content for '${pageNameForContent}'...`;
        try {
            const response = await fetch(`/api/page-content/${pageNameForContent}`);
            if (!response.ok) throw new Error(`Failed to load content. Status: ${response.status}`);
            const data = await response.json();
            tinymce.get('editor').setContent(getContent(data));
            if (statusDiv) statusDiv.textContent = `Content for '${pageNameForContent}' loaded.`;
        } catch (error) {
            console.error('Error loading content:', error);
            if (statusDiv) statusDiv.textContent = `Error: ${error.message}`;
        }
    }

    function addSaveListener() {
        if (saveButton) saveButton.addEventListener('click', async () => {
            const content = tinymce.get('editor').getContent().split("\n");
            const token = localStorage.getItem('adminWebsiteToken');
            if (!token) {
                alert('You must be logged in to save content.');
                if (statusDiv) statusDiv.textContent = 'Error: Not logged in.';
                return;
            }
            if (statusDiv) statusDiv.textContent = `Saving content for '${pageNameForContent}'...`;
            try {
                const response = await fetch(`/api/page-content/${pageNameForContent}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ content: content })
                });
                const result = await response.json();
                if (response.ok) {
                    if (statusDiv) statusDiv.textContent = result.message || 'Content saved successfully!';
                    alert('Content saved successfully!');
                } else {
                    throw new Error(result.error || 'An unknown error occurred.');
                }
            } catch (error) {
                console.error('Error saving content:', error);
                if (statusDiv) statusDiv.textContent = `Error saving content: ${error.message}`;
                alert(`Error saving content: ${error.message}`);
            }
        });
    }

    initializePage();
}

document.addEventListener('DOMContentLoaded', initializeAdminEditor);

function getContent(data) {
    let content;
    if (data && data.content) {
        if (typeof data.content === 'string') {
            content = data.content;
        } else if (Array.isArray(data.content)) {
            content = data.content.join('\n');
        }
    }
    return content || '';
}
