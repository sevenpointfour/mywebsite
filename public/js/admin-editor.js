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
    const adminToken = localStorage.getItem('adminToken');
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
                console.log('Admin verification response:', { ok: response.ok, data: data });
                // Only set read-only if verification is successful and confirms isAdmin status
                isReadOnly = !(response.ok && data.isAdmin);
            } catch (error) {
                console.error('Admin verification failed:', error);
                isReadOnly = true; // Revert to read-only if verification fails
            }
        }

        // Initialize editor or readonly view AFTER admin check
        if (isReadOnly) {
            // Hide editor and show readonly content
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
                contentDiv.classList.add('readonly-content');
                editorEl.parentNode.insertBefore(contentDiv, editorEl);
            }
        } else {
            // Initialize the full editor for admins
            initializeEditor();
        }

        // Show/hide save button based on final admin status
        if (saveButton) {
            if (isReadOnly) {
                saveButton.style.display = 'none';
            } else {
                saveButton.style.display = 'block';
            }
        }
    }

    function initializeEditor() {
        // This function now contains the tinymce.init call
        if (saveButton) {
            const buttonContainer = document.createElement('div');
            buttonContainer.classList.add('admin-button-container');
            saveButton.parentNode.insertBefore(buttonContainer, saveButton);
            buttonContainer.appendChild(saveButton);

            if (isReadOnly) {
                saveButton.style.display = 'none';
            } else {
                saveButton.style.display = 'block';
                addSaveListener();

                // Add download content button
                const downloadButton = document.createElement('button');
                downloadButton.id = 'downloadContentButton';
                downloadButton.textContent = 'Download Content Backup';
                downloadButton.classList.add('admin-button'); // Add a class for styling
                buttonContainer.appendChild(downloadButton);

                downloadButton.addEventListener('click', async () => {
                    const token = localStorage.getItem('adminToken');
                    if (!token) {
                        alert('You must be logged in to download content.');
                        return;
                    }
                    try {
                        const response = await fetch('/api/admin/download-content', {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (response.ok) {
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            const now = new Date();
                            const year = now.getFullYear();
                            const month = String(now.getMonth() + 1).padStart(2, '0');
                            const day = String(now.getDate()).padStart(2, '0');
                            const hours = String(now.getHours()).padStart(2, '0');
                            const minutes = String(now.getMinutes()).padStart(2, '0');
                            const seconds = String(now.getSeconds()).padStart(2, '0');
                            const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;
                            a.download = `content_backup_${timestamp}.zip`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            window.URL.revokeObjectURL(url);
                            alert('Content backup downloaded successfully!');
                        } else {
                            const errorData = await response.json();
                            throw new Error(errorData.error || 'Failed to download content backup.');
                        }
                    } catch (error) {
                        console.error('Error downloading content backup:', error);
                        alert(`Error downloading content backup: ${error.message}`);
                    }
                });
            }
        }
        tinymce.init({
            selector: 'textarea#editor',
            readonly: false, // Always editable when this function is called
            plugins: 'code table lists image link media wordcount help',
            toolbar: 'undo redo | blocks | bold italic | alignleft aligncenter alignright | indent outdent | bullist numlist | code | table | image link media | help',
            license_key: 'gpl',
            menubar: true,
            height: 500,
            content_css: '/css/main_style.css?v=1.2',
            images_upload_handler: (blobInfo, progress) => new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.withCredentials = false;
                xhr.open('POST', '/api/admin/upload-image');
                const token = localStorage.getItem('adminToken');
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                xhr.onload = () => {
                    if (xhr.status < 200 || xhr.status >= 300) {
                        reject('HTTP Error: ' + xhr.status);
                        return;
                    }
                    const json = JSON.parse(xhr.responseText);
                    if (!json || typeof json.location != 'string') {
                        reject('Invalid JSON: ' + xhr.responseText);
                        return;
                    }
                    resolve(json.location);
                };
                xhr.onerror = () => {
                    reject('Image upload failed due to a network error. Please try again.');
                };
                const formData = new FormData();
                formData.append('folder', '_editor');
                formData.append('file', blobInfo.blob(), blobInfo.filename());
                xhr.send(formData);
            }),
            setup: function (editor) {
                editor.on('init', function () {
                    loadContent();
                });
            }
        });
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
            let newPage = window.location.pathname.endsWith('new-page.html');
            if (newPage) {
                pageNameForContent = prompt('Enter page name');
                if (!pageNameForContent) {
                    alert('Page name is required.');
                    return;
                }
                pageNameForContent = pageNameForContent.replace(/\s+/g, '-').toLowerCase();
                if (!/^[a-z0-9-]+$/.test(pageNameForContent)) {
                    alert('Page name can only contain alphanumeric characters and hyphens.');
                    return;
                }
            }
            const content = tinymce.get('editor').getContent().split("\n");
            const token = localStorage.getItem('adminToken');
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
                    let moreLinks = await fetch('/api/nav-items.json').then(response => response.json());
                    if (newPage) {
                        moreLinks.items.push({
                            name: pageNameForContent,
                            text: pageNameForContent.replace(/-/g, ' ')
                        });
                        const response = await fetch(`/api/nav-items.json`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify(moreLinks)
                        });
                        window.location.href = `${pageNameForContent}.html`;
                    } else {
                        alert('Content saved successfully!');
                    }
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
