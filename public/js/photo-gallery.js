
let slideIndex = 0;
const slide = document.querySelector('.carousel-slide');
const progressBar = document.querySelector('.progress-bar');
const folderTabsContainer = document.getElementById('folder-tabs');
let allImagesByFolder = {};
let currentFolder = 'root';
let slides;
let autoSlideInterval;

function isAdmin() {
    return !!localStorage.getItem('adminToken');
}

function showSlides(isAutoSlide = false) {
    const imagesInCurrentFolder = allImagesByFolder[currentFolder] || [];
    if (!slides || slides.length === 0 || imagesInCurrentFolder.length === 0) {
        slide.style.transform = '';
        progressBar.style.width = '0%';
        return;
    }

    if (isAutoSlide) {
        slideIndex++;
        if (slideIndex >= slides.length) {
            const folders = Object.keys(allImagesByFolder);
            const currentFolderIndex = folders.indexOf(currentFolder);
            const nextFolderIndex = (currentFolderIndex + 1) % folders.length;
            currentFolder = folders[nextFolderIndex];
            slideIndex = 0;
            renderImages();
            updateFolderTabs();
        }
    }

    if (slideIndex >= slides.length) {
        slideIndex = 0;
    }
    if (slideIndex < 0) {
        slideIndex = slides.length - 1;
    }

    slide.style.transform = `translateX(${-slideIndex * 100}%)`;

    const progress = ((slideIndex + 1) / slides.length) * 100;
    progressBar.style.width = `${progress}%`;
}

function startInterval() {
    clearInterval(autoSlideInterval);
    autoSlideInterval = setInterval(() => {
        showSlides(true); // Pass true for auto-slide
    }, 5000);
}

function resetInterval() {
    if (!isAdmin()) {
        startInterval();
    }
}

async function deleteImage(imagePath) {
    if (!confirm(`Are you sure you want to delete ${imagePath}?`)) {
        return;
    }

    const token = localStorage.getItem('adminToken');
    try {
        const response = await fetch(`/api/images/${imagePath}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.ok) {
            init(currentFolder); // Re-initialize the gallery, staying in the current folder
        } else {
            alert('Failed to delete image.');
        }
    } catch (error) {
        console.error('Error deleting image:', error);
        alert('An error occurred while deleting the image.');
    }
}

function renderImages() {
    slide.innerHTML = ''; // Clear previous images
    const adminMode = isAdmin();
    const imagesToDisplay = allImagesByFolder[currentFolder] || [];

    const imageFiles = adminMode ? imagesToDisplay : imagesToDisplay.filter(i => !i.startsWith('_editor/'));

    if (imageFiles.length === 0) {
        slide.innerHTML = '<p>No images in this folder.</p>';
        slides = [];
        showSlides();
        return;
    }

    imageFiles.forEach(imagePath => {
        const wrapper = document.createElement('div');
        wrapper.className = 'carousel-item-wrapper';

        const img = document.createElement('img');
        img.src = `/photos/${imagePath}`;
        img.alt = imagePath;
        wrapper.appendChild(img);

        if (adminMode) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = 'Delete';
            deleteBtn.title = `Delete ${imagePath}`;
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteImage(imagePath);
            };
            wrapper.appendChild(deleteBtn);
        }
        slide.appendChild(wrapper);
    });

    slides = document.querySelectorAll('.carousel-item-wrapper');
    showSlides();
}

function updateFolderTabs() {
    document.querySelectorAll('.folder-tab').forEach(btn => {
        if (btn.dataset.folder === currentFolder) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function createFolderTabs() {
    folderTabsContainer.innerHTML = '';
    const adminMode = isAdmin();
    let folders = Object.keys(allImagesByFolder);

    if (!adminMode) {
        folders = folders.filter(folder => !folder.startsWith('_'));
    }

    if (folders.length > 1) {
        folders.forEach(folder => {
            const button = document.createElement('button');
            button.className = 'folder-tab';
            button.dataset.folder = folder;
            button.textContent = folder === 'root' ? 'Root' : folder;
            button.onclick = () => {
                currentFolder = folder;
                slideIndex = 0;
                updateFolderTabs();
                renderImages();
                resetInterval();
            };
            folderTabsContainer.appendChild(button);
        });
        updateFolderTabs();
    }
}

async function init(initialFolder = null) {
    const adminMode = isAdmin();
    if (adminMode) {
        document.body.classList.add('admin-mode');
    } else {
        document.body.classList.remove('admin-mode');
    }

    const response = await fetch('/api/images.json');
    const data = await response.json();
    allImagesByFolder = data.imagesByFolder;

    if (initialFolder && allImagesByFolder[initialFolder]) {
        currentFolder = initialFolder;
    } else if (allImagesByFolder['Gallery']) {
        currentFolder = 'Gallery';
    } else if (allImagesByFolder['root']) {
        currentFolder = 'root';
    } else if (Object.keys(allImagesByFolder).length > 0) {
        currentFolder = Object.keys(allImagesByFolder)[0];
    } else {
        currentFolder = 'root'; // Default if no folders exist
    }

    createFolderTabs();
    renderImages();

    if (!adminMode) {
        startInterval();
    } else {
        deactivateUpload();
        clearInterval(autoSlideInterval);
    }
}

document.querySelector('.prev').addEventListener('click', () => {
    slideIndex--;
    showSlides();
    resetInterval();
});

document.querySelector('.next').addEventListener('click', () => {
    slideIndex++;
    showSlides();
    resetInterval();
});

// Upload functionality
const uploadContainer = document.getElementById('upload-container');
const fileInput = document.getElementById('file-input');
const uploadButton = document.getElementById('upload-button');
const addImageBtn = document.getElementById('add-image-btn');
const closeUploadBtn = document.getElementById('close-upload-btn');
const copyImageUrlBtn = document.getElementById('copy-image-url-btn');
const addFolderBtn = document.getElementById('add-folder-btn');

if (copyImageUrlBtn) {
    copyImageUrlBtn.addEventListener('click', () => {
        if (slides && slides.length > 0 && slides[slideIndex]) {
            const currentImage = slides[slideIndex].querySelector('img');
            if (currentImage) {
                const imageUrl = new URL(currentImage.src, window.location.origin).href;
                navigator.clipboard.writeText(imageUrl).then(() => {
                    alert('Image URL copied to clipboard!');
                }, (err) => {
                    console.error('Failed to copy image URL: ', err);
                    alert('Failed to copy URL.');
                });
            }
        } else {
            alert('No image to copy.' + slides.length);
        }
    });
}

if (addFolderBtn) {
    addFolderBtn.addEventListener('click', () => {
        const folderName = prompt("Enter new folder name:");
        if (folderName) {
            const sanitizedFolderName = folderName.replace(/[^a-zA-Z0-9-_]/g, ''); // Basic sanitization
            if (sanitizedFolderName) {
                if (!allImagesByFolder[sanitizedFolderName]) {
                    allImagesByFolder[sanitizedFolderName] = [];
                }
                currentFolder = sanitizedFolderName;
                createFolderTabs();
                renderImages();
            } else {
                alert("Invalid folder name. Please use alphanumeric characters, hyphens, or underscores.");
            }
        }
    });
}

function activateUpload() {
    if (uploadContainer) {
        uploadContainer.style.display = 'flex';
    }
}

function deactivateUpload() {
    if (uploadContainer) {
        uploadContainer.style.display = 'none';
    }
}

if (addImageBtn) {
    addImageBtn.addEventListener('click', activateUpload);
}

if (closeUploadBtn) {
    closeUploadBtn.addEventListener('click', deactivateUpload);
}

if (uploadContainer) {
    uploadContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadContainer.classList.add('dragover');
    });

    uploadContainer.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadContainer.classList.remove('dragover');
    });

    uploadContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadContainer.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            uploadFile(files[0]);
        }
    });

    uploadButton.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            uploadFile(fileInput.files[0]);
        }
    });

    window.addEventListener('paste', (e) => {
        if (uploadContainer.style.display !== 'flex') return;
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const blob = item.getAsFile();
                uploadFile(blob);
                break; 
            }
        }
    });
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('folder', currentFolder);
    formData.append('file', file);

    const token = localStorage.getItem('adminToken');
    try {
        const response = await fetch('/api/admin/upload-image', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (response.ok) {
            deactivateUpload();
            init(currentFolder); // Re-initialize the gallery, staying in the current folder
        } else {
            const errorData = await response.json();
            alert(`Failed to upload image: ${errorData.error}`);
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        alert('An error occurred while uploading the image.');
    }
}

init();

document.addEventListener('DOMContentLoaded', () => {
    const editorElement = document.getElementById('editor');
    const saveButton = document.getElementById('saveButton');
    const statusElement = document.getElementById('status');

    if (editorElement) {
        initializeEditor('photo-gallery', editorElement, saveButton, statusElement);
    }
});
