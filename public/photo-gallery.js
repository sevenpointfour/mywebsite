let slideIndex = 0;
const slide = document.querySelector('.carousel-slide');
const dotsContainer = document.querySelector('.dots-container');
let slides;
let dots;

async function init() {
    const response = await fetch('/api/images');
    const data = await response.json();
    const images = data.images;

    images.forEach(imageName => {
        const img = document.createElement('img');
        img.src = `/photos/${imageName}`;
        img.alt = imageName;
        slide.appendChild(img);

        const dot = document.createElement('span');
        dot.classList.add('dot');
        dot.addEventListener('click', () => {
            slideIndex = Array.from(dots).indexOf(dot);
            showSlides();
        });
        dotsContainer.appendChild(dot);
    });

    slides = document.querySelectorAll('.carousel-slide img');
    dots = document.querySelectorAll('.dot');
    showSlides();
}

function showSlides() {
    if (slideIndex >= slides.length) {
        slideIndex = 0;
    }
    if (slideIndex < 0) {
        slideIndex = slides.length - 1;
    }

    slide.style.transform = `translateX(${-slideIndex * 100}%)`;

    dots.forEach(dot => dot.classList.remove('active'));
    dots[slideIndex].classList.add('active');
}

document.querySelector('.prev').addEventListener('click', () => {
    slideIndex--;
    showSlides();
});

document.querySelector('.next').addEventListener('click', () => {
    slideIndex++;
    showSlides();
});

init();