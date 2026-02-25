// Gallery JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const galleryGrid = document.getElementById('gallery-grid');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('gallery-search');
    const loadMoreBtn = document.getElementById('load-more');
    const modal = document.getElementById('project-modal');
    const modalBody = modal.querySelector('.modal-body');
    const modalClose = modal.querySelector('.modal-close');
    
    // State
    let currentFilter = 'all';
    let currentSearch = '';
    let visibleItems = 12; // Number of items initially visible
    let itemsPerLoad = 4; // Number of items to load each time
    let galleryItems = [];
    
    // Project data (would typically come from an API)
    const projectDetails = {
        1: {
            title: 'Residencial Green Valley',
            category: 'residential',
            categoryLabel: 'Residencial',
            description: 'Projeto residencial contemporâneo localizado em área nobre, com conceito aberto e integração total com a natureza. A casa foi projetada para aproveitar ao máximo a iluminação natural e a ventilação cruzada, com grandes painéis de vidro que se abrem completamente para o jardim.',
            images: [
                'assets/images/projects/residential-1.jpg',
                'assets/images/projects/residential-1a.jpg',
                'assets/images/projects/residential-1b.jpg',
                'assets/images/projects/residential-1c.jpg'
            ],
            specs: [
                { icon: 'fa-ruler-combined', label: 'Área Total', value: '450 m²' },
                { icon: 'fa-bed', label: 'Quartos', value: '4 (3 suítes)' },
                { icon: 'fa-bath', label: 'Banheiros', value: '5' },
                { icon: 'fa-car', label: 'Garagem', value: '4 vagas' },
                { icon: 'fa-calendar', label: 'Ano de Conclusão', value: '2022' },
                { icon: 'fa-map-pin', label: 'Localização', value: 'São Paulo/SP' }
            ]
        },
        2: {
            title: 'Shopping Downtown',
            category: 'commercial',
            categoryLabel: 'Comercial',
            description: 'Centro comercial moderno com conceito de "open mall", integrando áreas internas e externas. O projeto prioriza a circulação fluida e a experiência do cliente, com amplos corredores, praças de alimentação ao ar livre e áreas de convivência.',
            images: [
                'assets/images/projects/commercial-1.jpg',
                'assets/images/projects/commercial-1a.jpg',
                'assets/images/projects/commercial-1b.jpg',
                'assets/images/projects/commercial-1c.jpg'
            ],
            specs: [
                { icon: 'fa-ruler-combined', label: 'Área Total', value: '15.000 m²' },
                { icon: 'fa-store', label: 'Lojas', value: '120' },
                { icon: 'fa-utensils', label: 'Restaurantes', value: '15' },
                { icon: 'fa-film', label: 'Cinemas', value: '8 salas' },
                { icon: 'fa-calendar', label: 'Ano de Conclusão', value: '2021' },
                { icon: 'fa-map-pin', label: 'Localização', value: 'Campinas/SP' }
            ]
        },
        // Add more project details for each project
    };
    
    // Initialize gallery
    function initGallery() {
        galleryItems = Array.from(document.querySelectorAll('.gallery-item'));
        filterGallery();
        setupLazyLoading();
    }
    
    // Filter gallery based on category and search
    function filterGallery() {
        galleryItems.forEach((item, index) => {
            const category = item.dataset.category;
            const title = item.dataset.title.toLowerCase();
            
            const matchesFilter = currentFilter === 'all' || category === currentFilter;
            const matchesSearch = title.includes(currentSearch.toLowerCase());
            
            if (matchesFilter && matchesSearch) {
                if (index < visibleItems) {
                    item.style.display = 'block';
                    setTimeout(() => item.classList.add('visible'), 50);
                } else {
                    item.style.display = 'none';
                    item.classList.remove('visible');
                }
            } else {
                item.style.display = 'none';
                item.classList.remove('visible');
            }
        });
        
        // Show/hide load more button
        const visibleCount = galleryItems.filter(item => 
            item.style.display === 'block' && item.classList.contains('visible')
        ).length;
        
        const totalVisible = galleryItems.filter(item => {
            const category = item.dataset.category;
            const title = item.dataset.title.toLowerCase();
            const matchesFilter = currentFilter === 'all' || category === currentFilter;
            const matchesSearch = title.includes(currentSearch.toLowerCase());
            return matchesFilter && matchesSearch;
        }).length;
        
        if (loadMoreBtn) {
            if (visibleCount >= totalVisible) {
                loadMoreBtn.style.display = 'none';
            } else {
                loadMoreBtn.style.display = 'inline-block';
            }
        }
    }
    
    // Load more items
    function loadMore() {
        loadMoreBtn.classList.add('loading');
        
        // Simulate loading delay
        setTimeout(() => {
            visibleItems += itemsPerLoad;
            filterGallery();
            loadMoreBtn.classList.remove('loading');
        }, 500);
    }
    
    // Setup lazy loading for images
    function setupLazyLoading() {
        const images = document.querySelectorAll('.gallery-item img');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.src;
                    observer.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    }
    
    // Open modal with project details
    function openProjectModal(projectId) {
        const project = projectDetails[projectId];
        if (!project) return;
        
        let html = `
            <div class="project-detail">
                <div class="project-detail-gallery">
                    <div class="project-detail-main-image">
                        <img src="${project.images[0]}" alt="${project.title}">
                    </div>
                    <div class="project-detail-thumbnails">
        `;
        
        project.images.forEach((image, index) => {
            html += `
                <div class="project-detail-thumbnail ${index === 0 ? 'active' : ''}" data-index="${index}">
                    <img src="${image}" alt="Thumbnail ${index + 1}">
                </div>
            `;
        });
        
        html += `
                    </div>
                </div>
                <div class="project-detail-info">
                    <h2>${project.title}</h2>
                    <span class="project-detail-category">${project.categoryLabel}</span>
                    <p class="project-detail-description">${project.description}</p>
                    <div class="project-detail-specs">
        `;
        
        project.specs.forEach(spec => {
            html += `
                <div class="spec-item">
                    <i class="fas ${spec.icon}"></i>
                    <div class="spec-item-content">
                        <div class="spec-item-label">${spec.label}</div>
                        <div class="spec-item-value">${spec.value}</div>
                    </div>
                </div>
            `;
        });
        
        html += `
                    </div>
                    <div class="project-detail-actions">
                        <a href="index.html#budget" class="btn btn-primary">Solicitar Orçamento Similar</a>
                        <button class="btn btn-secondary modal-close-btn">Fechar</button>
                    </div>
                </div>
            </div>
        `;
        
        modalBody.innerHTML = html;
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Setup thumbnail clicks
        const thumbnails = modalBody.querySelectorAll('.project-detail-thumbnail');
        const mainImage = modalBody.querySelector('.project-detail-main-image img');
        
        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', function() {
                thumbnails.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                mainImage.src = this.querySelector('img').src;
            });
        });
        
        // Setup close button
        modalBody.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    }
    
    // Close modal
    function closeModal() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    // Event Listeners
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            visibleItems = 12; // Reset visible items
            filterGallery();
        });
    });
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            currentSearch = this.value;
            visibleItems = 12; // Reset visible items
            filterGallery();
        });
    }
    
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMore);
    }
    
    // View project buttons
    document.querySelectorAll('.view-project').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const projectId = this.dataset.project;
            openProjectModal(projectId);
        });
    });
    
    // Modal close
    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }
    
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Escape key to close modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            closeModal();
        }
    });
    
    // Initialize gallery
    initGallery();
    
    // Animate stats numbers
    const stats = document.querySelectorAll('.stat-number');
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const stat = entry.target;
                const target = parseInt(stat.getAttribute('data-count'));
                let count = 0;
                const increment = target / 50;
                
                const updateCount = () => {
                    if (count < target) {
                        count += increment;
                        stat.textContent = Math.ceil(count);
                        requestAnimationFrame(updateCount);
                    } else {
                        stat.textContent = target + '+';
                    }
                };
                
                updateCount();
                statsObserver.unobserve(stat);
            }
        });
    }, { threshold: 0.5 });
    
    stats.forEach(stat => statsObserver.observe(stat));
});