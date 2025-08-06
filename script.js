// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeDropdowns();
    initializeWishlistButtons();
    initializeSearch();
    initializeFilters();
    initializeSmoothScrolling();
    initializeMobileMenu();
    initializeInfiniteScroll();
    
    // Load initial books
    loadBooks();
});

// Open Library API configuration (Free, no API key required)
const BOOKS_API_BASE_URL = 'https://openlibrary.org';
const DEFAULT_SEARCH_TERMS = ['bestseller', 'popular', 'award winner', 'classic literature', 'new york times bestseller', 'pulitzer prize'];

// Global variables for pagination
let currentPage = 1;
let isLoading = false;
let hasMoreResults = true;
let currentSearchTerm = null;
let totalBooksFound = 0;
let currentFilters = {
    genre: '',
    language: '',
    year: '',
    sort: 'relevance'
};

// No fallback books - rely on API only

// Load books from API
async function loadBooks(searchTerm = null, page = 1, append = false) {
    const booksGrid = document.querySelector('.books-grid');
    const sectionTitle = document.querySelector('.section-title');
    
    // Show loading state
    if (!append) {
        booksGrid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading books...</div>';
    }
    
    try {
        let books = [];
        
        if (searchTerm) {
            // Search for specific books
            const searchResult = await searchBooks(searchTerm, page, currentFilters);
            books = searchResult.books;
            totalBooksFound = searchResult.total;
            currentSearchTerm = searchTerm;
            sectionTitle.textContent = `Search Results for "${searchTerm}" (${totalBooksFound} books found)`;
        } else {
            // Load popular books for initial display
            books = await getPopularBooks();
            
            totalBooksFound = books.length;
            currentSearchTerm = null;
            sectionTitle.textContent = 'Popular Books';
        }
        
        if (append) {
            appendBooks(books);
        } else {
            displayBooks(books);
        }
        
        // Update pagination state
        currentPage = page;
        hasMoreResults = books.length > 0;
        
    } catch (error) {
        console.error('Error loading books:', error);
        if (!append) {
            // Show error message if API fails completely
            console.log('API failed, showing error message');
            booksGrid.innerHTML = '<div class="no-results">Unable to load books. Please check your internet connection and try again.</div>';
            totalBooksFound = 0;
            currentSearchTerm = null;
            sectionTitle.textContent = 'Popular Books';
        }
    }
}

// Search books using Open Library API with pagination and filters
async function searchBooks(query, page = 1, filters = {}) {
    const limit = 20;
    const offset = (page - 1) * limit;
    
    // Build query with filters
    let searchQuery = query;
    
    // Add genre filter
    if (filters.genre) {
        searchQuery += ` subject:${filters.genre}`;
    }
    
    // Add language filter
    if (filters.language) {
        searchQuery += ` language:${filters.language}`;
    }
    
    // Add year filter
    if (filters.year) {
        const [startYear, endYear] = filters.year.split('-');
        if (endYear) {
            searchQuery += ` first_publish_year:[${startYear} TO ${endYear}]`;
        } else {
            searchQuery += ` first_publish_year:${startYear}`;
        }
    }
    
    // Build URL with sort parameter
    let url = `${BOOKS_API_BASE_URL}/search.json?q=${encodeURIComponent(searchQuery)}&limit=${limit}&offset=${offset}`;
    
    // Add sort parameter
    if (filters.sort && filters.sort !== 'relevance') {
        url += `&sort=${filters.sort}`;
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.docs) {
        return { books: [], total: 0 };
    }
    
    const books = data.docs.map(item => formatBookData(item));
    const total = data.numFound || 0;
    
    return { books, total };
}

// Get popular books for initial display
async function getPopularBooks() {
    const books = [];
    
    // First, try to get trending books from Open Library
    try {
        const trendingResponse = await fetch(`${BOOKS_API_BASE_URL}/trending.json`);
        const trendingData = await trendingResponse.json();
        
        if (trendingData && trendingData.length > 0) {
            console.log('Using trending books from Open Library API');
            // Take the first 12 trending books
            const trendingBooks = trendingData.slice(0, 12);
            
            // Format trending books
            for (const book of trendingBooks) {
                const formattedBook = formatBookData(book);
                // Try to get detailed rating data for trending books
                if (book.key) {
                    try {
                        const ratingResponse = await fetch(`${BOOKS_API_BASE_URL}${book.key}/ratings.json`);
                        const ratingData = await ratingResponse.json();
                        if (ratingData && ratingData.summary) {
                            formattedBook.averageRating = ratingData.summary.average;
                            formattedBook.ratingsCount = ratingData.summary.count;
                        }
                    } catch (error) {
                        console.log(`Could not fetch detailed ratings for ${book.title}`);
                    }
                }
                books.push(formattedBook);
            }
        }
    } catch (error) {
        console.error('Error loading trending books:', error);
    }
    
    // If we don't have enough trending books, supplement with search results
    if (books.length < 12) {
        // Use more reliable search terms that are likely to return results
        const searchTerms = [
            'fiction',
            'romance',
            'mystery',
            'science fiction',
            'biography',
            'history',
            'self help',
            'cooking',
            'travel',
            'business'
        ];
        
        // Search for books using different terms
        for (const term of searchTerms) {
            if (books.length >= 24) break; // Don't exceed 24 books
            
            try {
                const response = await fetch(`${BOOKS_API_BASE_URL}/search.json?q=${encodeURIComponent(term)}&limit=8&sort=rating desc`);
                const data = await response.json();
                
                if (data.docs && data.docs.length > 0) {
                    const newBooks = data.docs.map(item => formatBookData(item));
                    books.push(...newBooks);
                }
            } catch (error) {
                console.error(`Error loading books for term "${term}":`, error);
            }
        }
        
        // Try to get some highly rated books with different approaches
        const ratingQueries = [
            'rating_average:[3 TO 5]',
            'first_publish_year:[2020 TO 2024]',
            'subject:fiction',
            'subject:romance',
            'subject:mystery'
        ];
        
        for (const query of ratingQueries) {
            if (books.length >= 24) break;
            
            try {
                const response = await fetch(`${BOOKS_API_BASE_URL}/search.json?q=${encodeURIComponent(query)}&limit=6&sort=rating desc`);
                const data = await response.json();
                
                if (data.docs && data.docs.length > 0) {
                    const newBooks = data.docs.map(item => formatBookData(item));
                    books.push(...newBooks);
                }
            } catch (error) {
                console.error(`Error loading books for query "${query}":`, error);
            }
        }
        
        // Try to get some bestselling and award-winning books
        const bestsellerQueries = [
            'bestseller',
            'award winner',
            'pulitzer prize',
            'man booker prize',
            'national book award'
        ];
        
        for (const query of bestsellerQueries) {
            if (books.length >= 24) break;
            
            try {
                const response = await fetch(`${BOOKS_API_BASE_URL}/search.json?q=${encodeURIComponent(query)}&limit=5&sort=rating desc`);
                const data = await response.json();
                
                if (data.docs && data.docs.length > 0) {
                    const newBooks = data.docs.map(item => formatBookData(item));
                    books.push(...newBooks);
                }
            } catch (error) {
                console.error(`Error loading books for query "${query}":`, error);
            }
        }
    }
    
    // Remove duplicates and limit to 24 books for better variety
    const uniqueBooks = books.filter((book, index, self) => 
        index === self.findIndex(b => b.key === book.key)
    ).slice(0, 24);
    
    // If we still don't have enough books, try a fallback approach
    if (uniqueBooks.length < 12) {
        try {
            const response = await fetch(`${BOOKS_API_BASE_URL}/search.json?q=*&limit=20&sort=rating desc`);
            const data = await response.json();
            
            if (data.docs && data.docs.length > 0) {
                const fallbackBooks = data.docs.map(item => formatBookData(item));
                uniqueBooks.push(...fallbackBooks.filter(book => 
                    !uniqueBooks.some(existing => existing.key === book.key)
                ));
            }
        } catch (error) {
            console.error('Error loading fallback books:', error);
        }
    }
    
    return uniqueBooks.slice(0, 24);
}

// Format book data from Open Library API response
function formatBookData(item) {
    return {
        id: item.key,
        title: item.title || 'Unknown Title',
        author: item.author_name ? item.author_name.join(', ') : 'Unknown Author',
        description: item.description || 'No description available.',
        coverImage: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : 'https://via.placeholder.com/128x200/4A5568/FFFFFF?text=No+Book+Cover+Available',
        publishedDate: item.first_publish_year,
        pageCount: item.number_of_pages_median,
        categories: item.subject || [],
        averageRating: item.ratings_average,
        ratingsCount: item.ratings_count,
        previewLink: `https://openlibrary.org${item.key}`,
        infoLink: `https://openlibrary.org${item.key}`,
        // Generate random price and condition for demo purposes
        price: generateRandomPrice(),
        condition: generateRandomCondition()
    };
}

// Generate random price for demo
function generateRandomPrice() {
    const prices = [9.99, 12.99, 15.50, 18.75, 22.00, 11.25, 14.99, 19.99, 16.50, 13.75];
    return prices[Math.floor(Math.random() * prices.length)];
}

// Generate random condition for demo
function generateRandomCondition() {
    const conditions = ['Like New', 'Very Good', 'Good'];
    return conditions[Math.floor(Math.random() * conditions.length)];
}

// Display books in the grid
function displayBooks(books) {
    const booksGrid = document.querySelector('.books-grid');
    
    if (books.length === 0) {
        booksGrid.innerHTML = '<div class="no-results">No books found. Try a different search term.</div>';
        return;
    }
    
    booksGrid.innerHTML = books.map(book => createBookCard(book)).join('');
    
    // Add sentinel element for infinite scroll
    if (window.scrollSentinel) {
        booksGrid.appendChild(window.scrollSentinel);
    }
    
    // Re-initialize wishlist buttons for new cards
    initializeWishlistButtons();
    
    // Initialize animations for new cards
    initializeAnimations();
}

// Create book card HTML
function createBookCard(book) {
    const conditionClass = book.condition.toLowerCase().replace(' ', '-');
    
    // Create rating stars HTML
    const ratingStars = book.averageRating ? createRatingStars(book.averageRating) : '';
    const ratingText = book.averageRating ? `${book.averageRating.toFixed(1)} (${book.ratingsCount || 0} reviews)` : '';
    
    return `
        <div class="book-card" data-book-id="${book.id}">
            <div class="book-image">
                <img src="${book.coverImage}" alt="${book.title}" onerror="this.src='https://via.placeholder.com/128x200/4A5568/FFFFFF?text=No+Book+Cover+Available'">
                <button class="wishlist-btn">
                    <i class="far fa-heart"></i>
                </button>
            </div>
            <div class="book-info">
                <h3 class="book-title">${book.title}</h3>
                <p class="book-author">${book.author}</p>
                ${ratingStars ? `<div class="book-rating">${ratingStars}<span class="rating-text">${ratingText}</span></div>` : ''}
                <div class="book-meta">
                    <span class="condition-badge ${conditionClass}">${book.condition}</span>
                    <span class="book-price">$${book.price}</span>
                </div>
            </div>
        </div>
    `;
}

// Create rating stars HTML
function createRatingStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let starsHTML = '';
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<i class="fas fa-star"></i>';
    }
    
    // Half star
    if (hasHalfStar) {
        starsHTML += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += '<i class="far fa-star"></i>';
    }
    
    return starsHTML;
}

// Append books to the existing grid
function appendBooks(books) {
    const booksGrid = document.querySelector('.books-grid');
    
    // Remove existing sentinel if present
    const existingSentinel = booksGrid.querySelector('.scroll-sentinel');
    if (existingSentinel) {
        existingSentinel.remove();
    }
    
    const newBooksHtml = books.map(book => createBookCard(book)).join('');
    booksGrid.innerHTML += newBooksHtml;
    
    // Add sentinel element back for infinite scroll
    if (window.scrollSentinel) {
        booksGrid.appendChild(window.scrollSentinel);
    }
    
    // Re-initialize wishlist buttons for new cards
    initializeWishlistButtons();
    
    // Initialize animations for new cards
    initializeAnimations();
}

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
                
                // Get filter type and value from data attributes
                const filterType = this.getAttribute('data-filter');
                const filterValue = this.getAttribute('data-value');
                
                // Update current filters
                if (filterType && filterValue !== undefined) {
                    currentFilters[filterType] = filterValue;
                }
                
                // Apply filter to current search
                if (currentSearchTerm) {
                    // Reset pagination for new filter
                    currentPage = 1;
                    hasMoreResults = true;
                    isLoading = false;
                    
                    // Reload books with new filters
                    loadBooks(currentSearchTerm, 1);
                }
                
                console.log(`Filter applied: ${filterType} = ${filterValue}`);
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
    searchInput.addEventListener('input', debounce(function() {
        const query = this.value.trim();
        if (query.length >= 2) {
            // Could implement search suggestions here
            console.log('Searching for:', query);
        }
    }, 300));
}

// Perform search function
function performSearch() {
    const searchInput = document.querySelector('.search-input');
    const query = searchInput.value.trim();
    
    if (query) {
        // Reset pagination state for new search
        currentPage = 1;
        hasMoreResults = true;
        isLoading = false;
        
        // Reset filters for new search
        currentFilters = {
            genre: '',
            language: '',
            year: '',
            sort: 'relevance'
        };
        
        // Reset filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            button.classList.remove('active');
            // Reset button text to original
            const filterGroup = button.closest('.filter-group');
            const defaultOption = filterGroup.querySelector('.filter-option[data-value=""]');
            if (defaultOption) {
                const icon = button.querySelector('i:first-child');
                const chevron = button.querySelector('.fa-chevron-down');
                const textNodes = Array.from(button.childNodes).filter(node => 
                    node.nodeType === Node.TEXT_NODE
                );
                textNodes.forEach(node => node.remove());
                const textSpan = document.createElement('span');
                textSpan.textContent = defaultOption.textContent;
                button.insertBefore(textSpan, chevron);
            }
        });
        
        // Add loading state
        const searchBtn = document.querySelector('.search-btn');
        const originalContent = searchBtn.innerHTML;
        searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        searchBtn.classList.add('loading');
        
        // Perform search
        loadBooks(query, 1).finally(() => {
            searchBtn.innerHTML = originalContent;
            searchBtn.classList.remove('loading');
        });
    } else {
        // If no query, load popular books
        currentPage = 1;
        hasMoreResults = false; // Popular books don't have pagination
        isLoading = false;
        loadBooks();
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
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
            
            // Update aria-label for accessibility
            const isActive = navMenu.classList.contains('active');
            mobileMenuToggle.setAttribute('aria-label', isActive ? 'Close mobile menu' : 'Open mobile menu');
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!navMenu.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                navMenu.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
                mobileMenuToggle.setAttribute('aria-label', 'Open mobile menu');
            }
        });
        
        // Close mobile menu on window resize
        window.addEventListener('resize', function() {
            if (window.innerWidth > 767) {
                navMenu.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
                mobileMenuToggle.setAttribute('aria-label', 'Open mobile menu');
            }
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

// Intersection Observer for animations
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
        button.addEventListener('touchstart', function(e) {
            this.style.transform = 'scale(0.98)';
        });
        
        button.addEventListener('touchend', function(e) {
            this.style.transform = '';
        });
        
        button.addEventListener('touchcancel', function(e) {
            this.style.transform = '';
        });
    });
    
    // Prevent zoom on double tap for mobile
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    // Improve scroll performance on mobile
    const scrollElements = document.querySelectorAll('.filters-container, .books-grid');
    scrollElements.forEach(element => {
        element.style.webkitOverflowScrolling = 'touch';
    });
    
    // Add better touch handling for dropdowns on mobile
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle, .filter-btn');
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('touchstart', function(e) {
            // Prevent default to avoid double-tap zoom
            e.preventDefault();
            this.click();
        });
    });
    
    // Improve mobile search input
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('focus', function() {
            // Ensure the input is visible when focused on mobile
            setTimeout(() => {
                this.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });
    }
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

// Initialize infinite scroll functionality
function initializeInfiniteScroll() {
    // Create a sentinel element for infinite scroll
    const sentinel = document.createElement('div');
    sentinel.className = 'scroll-sentinel';
    sentinel.style.height = '20px';
    sentinel.style.width = '100%';
    
    const observerOptions = {
        root: null, // Use viewport
        rootMargin: '100px', // Trigger when 100px from the bottom
        threshold: 0.1
    };

    const observer = new IntersectionObserver(function(entries) {
        if (isLoading || !hasMoreResults) {
            return;
        }

        entries.forEach(entry => {
            if (entry.isIntersecting) {
                loadMoreBooks();
            }
        });
    }, observerOptions);

    observer.observe(sentinel);
    
    // Store the observer and sentinel globally
    window.scrollObserver = observer;
    window.scrollSentinel = sentinel;
}

// Load more books function
async function loadMoreBooks() {
    if (isLoading || !hasMoreResults) {
        return;
    }
    
    isLoading = true;
    currentPage++;
    
    // Show loading state on sentinel
    if (window.scrollSentinel) {
        window.scrollSentinel.classList.add('loading');
    }
    
    try {
        if (currentSearchTerm) {
            const searchResult = await searchBooks(currentSearchTerm, currentPage, currentFilters);
            const newBooks = searchResult.books;
            
            if (newBooks.length > 0) {
                appendBooks(newBooks);
                hasMoreResults = newBooks.length === 20; // Assuming 20 books per page
            } else {
                hasMoreResults = false;
            }
        } else {
            // For popular books, we don't have pagination, so disable infinite scroll
            hasMoreResults = false;
        }
    } catch (error) {
        console.error('Error loading more books:', error);
        hasMoreResults = false;
    } finally {
        isLoading = false;
        // Hide loading state on sentinel
        if (window.scrollSentinel) {
            window.scrollSentinel.classList.remove('loading');
        }
    }
}