async function init() {
    fetch('/api/images').then(response => response.json()).then(data => {
        for (let i of data.images) {
            let url = `/photos/${i}`;
            // clone #gallery-item-template
            let template = document.getElementById('gallery-item-template').content.cloneNode(true);
            template.querySelector('img').src = url;
            template.querySelector('img').alt = i;
            template.querySelector('p').textContent = i.replace('.jpg', '').replace('.png', '').replace('.gif', '');
            document.querySelector('.gallery-grid').appendChild(template);
        }
    });
}

init();