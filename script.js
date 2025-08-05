// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeDropdowns();
    initializeWishlistButtons();
    initializeSearch();
    initializeFilters();
    initializeSmoothScrolling();
    initializeMobileMenu();
});

// Initialize all dropdown functionality
function initializeDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown');
    
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Close other dropdowns
            dropdowns.forEach(other => {
                if (other !== dropdown) {
                    other.classList.remove('active');
                }
            });
            
            // Toggle current dropdown
            dropdown.classList.toggle('active');
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown')) {
            dropdowns.forEach(dropdown => {
                dropdown.classList.remove('active');
            });
        }
    });
}

// Initialize filter dropdowns
function initializeFilters() {
    const filterGroups = document.querySelectorAll('.filter-group');
    
    filterGroups.forEach(group => {
        const toggle = group.querySelector('.filter-btn');
        
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Close other filter dropdowns
            filterGroups.forEach(other => {
                if (other !== group) {
                    other.classList.remove('active');
                }
            });
            
            // Toggle current filter dropdown
            group.classList.toggle('active');
        });
        
        // Handle filter option clicks
        const options = group.querySelectorAll('.filter-option');
        options.forEach(option => {
            option.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Update button text
                const buttonText = this.textContent;
                const button = group.querySelector('.filter-btn');
                const icon = button.querySelector('i:first-child');
                const chevron = button.querySelector('.fa-chevron-down');
                
                // Remove existing text content (keep icons)
                const textNodes = Array.from(button.childNodes).filter(node => 
                    node.nodeType === Node.TEXT_NODE
                );
                textNodes.forEach(node => node.remove());
                
                // Add new text after the first icon
                const textSpan = document.createElement('span');
                textSpan.textContent = buttonText;
                button.insertBefore(textSpan, chevron);
                
                // Close dropdown
                group.classList.remove('active');
                
                // Add active state to button
                button.classList.add('active');
                
                // Simulate filtering (in real app, this would trigger API call)
                console.log(`Filter applied: ${buttonText}`);
            });
        });
    });
    
    // Close filter dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.filter-group')) {
            filterGroups.forEach(group => {
                group.classList.remove('active');
            });
        }
    });
}

// Initialize wishlist buttons
function initializeWishlistButtons() {
    const wishlistButtons = document.querySelectorAll('.wishlist-btn');
    
    wishlistButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const icon = this.querySelector('i');
            
            if (this.classList.contains('active')) {
                // Remove from wishlist
                this.classList.remove('active');
                icon.classList.remove('fas');
                icon.classList.add('far');
                icon.style.color = '#A0AEC0';
                
                // Add animation
                this.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    this.style.transform = 'scale(1)';
                }, 150);
                
                console.log('Removed from wishlist');
            } else {
                // Add to wishlist
                this.classList.add('active');
                icon.classList.remove('far');
                icon.classList.add('fas');
                icon.style.color = '#E53E3E';
                
                // Add animation
                this.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    this.style.transform = 'scale(1)';
                }, 150);
                
                console.log('Added to wishlist');
            }
        });
    });
}

// Initialize search functionality
function initializeSearch() {
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-btn');
    
    // Search on button click
    searchBtn.addEventListener('click', function() {
        performSearch();
    });
    
    // Search on Enter key
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // Real-time search suggestions (optional)
    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        if (query.length >= 2) {
            // In a real app, this would call an API for suggestions
            console.log('Searching for:', query);
        }
    });
}

// Perform search function
function performSearch() {
    const searchInput = document.querySelector('.search-input');
    const query = searchInput.value.trim();
    
    if (query) {
        // Add loading state
        const searchBtn = document.querySelector('.search-btn');
        const originalContent = searchBtn.innerHTML;
        searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        searchBtn.classList.add('loading');
        
        // Simulate API call
        setTimeout(() => {
            searchBtn.innerHTML = originalContent;
            searchBtn.classList.remove('loading');
            console.log('Search performed for:', query);
            
            // In a real app, this would update the book grid with results
            // showSearchResults(results);
        }, 1000);
    }
}

// Initialize smooth scrolling for anchor links
function initializeSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Initialize mobile menu functionality
function initializeMobileMenu() {
    // Add mobile menu toggle if needed
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            const navMenu = document.querySelector('.nav-menu');
            navMenu.classList.toggle('active');
        });
    }
}

// CTA button functionality
document.addEventListener('DOMContentLoaded', function() {
    const ctaButtons = document.querySelectorAll('.cta-btn, .fab-btn');
    
    ctaButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Add click animation
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
            
            console.log('Sell Your Book clicked');
            // In a real app, this would navigate to the sell book page
            // window.location.href = '/sell-book';
        });
    });
});

// Book card interactions
document.addEventListener('DOMContentLoaded', function() {
    const bookCards = document.querySelectorAll('.book-card');
    
    bookCards.forEach(card => {
        card.addEventListener('click', function(e) {
            // Don't trigger if clicking on wishlist button
            if (e.target.closest('.wishlist-btn')) {
                return;
            }
            
            console.log('Book card clicked');
            // In a real app, this would navigate to the book detail page
            // const bookId = this.dataset.bookId;
            // window.location.href = `/book/${bookId}`;
        });
    });
});

// Intersection Observer for animations (optional)
function initializeAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe book cards for animation
    const bookCards = document.querySelectorAll('.book-card');
    bookCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
}

// Initialize animations when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeAnimations);

// Utility function to debounce search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add touch support for mobile devices
document.addEventListener('DOMContentLoaded', function() {
    // Add touch feedback for buttons
    const buttons = document.querySelectorAll('button, .book-card');
    
    buttons.forEach(button => {
        button.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.98)';
        });
        
        button.addEventListener('touchend', function() {
            this.style.transform = '';
        });
    });
});

// Handle window resize for responsive behavior
window.addEventListener('resize', debounce(function() {
    // Close all dropdowns on resize
    const dropdowns = document.querySelectorAll('.dropdown, .filter-group');
    dropdowns.forEach(dropdown => {
        dropdown.classList.remove('active');
    });
}, 250));

// Add keyboard navigation support
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        // Close all dropdowns on Escape key
        const dropdowns = document.querySelectorAll('.dropdown, .filter-group');
        dropdowns.forEach(dropdown => {
            dropdown.classList.remove('active');
        });
    }
});