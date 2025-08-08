// Supabase Configuration - Uses external config file for better security
// The config.js file can be generated with environment variables in production
const SUPABASE_URL = window.SUPABASE_CONFIG?.url || 'https://yyqpfpccrcvkbgtrsxmb.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_CONFIG?.anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5cXBmcGNjcmN2a2JndHJzeG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2Mzg4NTksImV4cCI6MjA3MDIxNDg1OX0.AtZMs8YZQ3grqEVl-JaRQtVgyx2zYjc_xLJPs6DI_nw';

// Security note: Anon keys are safe to expose in client-side code
// They only allow operations that are permitted by Row Level Security (RLS)
// The real security comes from RLS policies, not hiding the anon key

// Security validation
if (!SUPABASE_URL) {
    console.error('SUPABASE_URL not configured');
}
if (!SUPABASE_ANON_KEY) {
    console.error('SUPABASE_ANON_KEY not configured');
}

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize authentication system
    initializeSupabase();
    initializeDOMElements();
    initializeAuth();
    setupAuthEventListeners();
    
    // Only initialize main page functionality if not on book details page
    if (!window.location.pathname.includes('book-details.html') && !window.location.pathname.includes('/bd')) {
        console.log('🔍 DEBUG: Starting initialization sequence...');
        initializeDropdowns();
        console.log('🔍 DEBUG: initializeDropdowns() completed');
        disableDesktopDropdownsOnMobile();
        console.log('🔍 DEBUG: disableDesktopDropdownsOnMobile() completed');
        initializeWishlistButtons();
        initializeSearch();
        initializeFilters();
        initializeSmoothScrolling();
        initializeMobileMenu();
        console.log('🔍 DEBUG: initializeMobileMenu() completed');
        initializeMobileFilters();
        console.log('🔍 DEBUG: initializeMobileFilters() completed');
        initializeInfiniteScroll();
        console.log('🔍 DEBUG: All initialization completed');
        
        // Load cached state from sessionStorage first
        loadCachedStateFromStorage();
        
        // Check for search parameter from book details page
        const urlParams = new URLSearchParams(window.location.search);
        const searchParam = urlParams.get('search');
        
        if (searchParam) {
            // Set the search input value
            const searchInput = document.querySelector('.search-input');
            searchInput.value = searchParam;
            // Perform the search
            loadBooks(searchParam);
        } else {
            // Try to restore cached state first
            console.log('Checking for cached state...', { isStateCached, cachedState });
            if (!restorePageState()) {
                console.log('No cached state found, loading initial books');
                // Load initial books if no cache
                loadBooks();
            }
        }
    }
});

// Open Library API configuration (Free, no API key required)
const BOOKS_API_BASE_URL = 'https://openlibrary.org';
const DEFAULT_SEARCH_TERMS = ['bestseller', 'popular', 'award winner', 'classic literature', 'new york times bestseller', 'pulitzer prize'];

// Function to fetch detailed rating data for a book
async function fetchBookRatings(bookKey, signal = null) {
    try {
        const fetchOptions = signal ? { signal } : {};
        const response = await fetch(`${BOOKS_API_BASE_URL}${bookKey}/ratings.json`, fetchOptions);
        const ratingData = await response.json();
        
        if (ratingData && ratingData.summary) {
            return {
                average: ratingData.summary.average,
                count: ratingData.summary.count
            };
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(`Rating fetch cancelled for book ${bookKey}`);
        } else {
            console.log(`Could not fetch detailed ratings for book ${bookKey}`);
        }
    }
    return null;
}

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

// Request cancellation system
let currentAbortController = null;
let currentRequestId = 0;

// Page state caching
let cachedBooks = [];
let cachedState = {
    searchTerm: null,
    filters: {},
    books: [],
    totalBooks: 0,
    page: 1,
    hasMore: true
};
let isStateCached = false;

// Load cached state from sessionStorage on page load
function loadCachedStateFromStorage() {
    try {
        const stored = sessionStorage.getItem('reReadzPageState');
        if (stored) {
            const parsed = JSON.parse(stored);
            cachedState = parsed;
            isStateCached = true;
            console.log('Loaded cached state from sessionStorage:', {
                searchTerm: cachedState.searchTerm,
                booksCount: cachedState.books.length,
                totalBooks: cachedState.totalBooks
            });
        }
    } catch (error) {
        console.log('Error loading cached state from sessionStorage:', error);
    }
}

// No fallback books - rely on API only

// Save current page state to cache
function savePageState() {
    // Get the current books from the DOM to store their data
    const booksGrid = document.querySelector('.books-grid');
    const bookCards = booksGrid.querySelectorAll('.book-card');
    
    // Extract book data from the DOM
    const books = Array.from(bookCards).map(card => {
        const bookKey = card.dataset.bookKey;
        const title = card.querySelector('.book-title').textContent;
        const author = card.querySelector('.book-author').textContent;
        const coverImage = card.querySelector('.book-image img').src;
        const ratingElement = card.querySelector('.book-rating');
        const averageRating = ratingElement?.dataset.rating ? parseFloat(ratingElement.dataset.rating) : null;
        const ratingsCount = ratingElement?.dataset.count ? parseInt(ratingElement.dataset.count) : null;
        const releaseDateElement = card.querySelector('.book-release-date span');
        const publishedDate = releaseDateElement ? releaseDateElement.textContent : null;
        const priceElement = card.querySelector('.book-price');
        const price = priceElement ? parseFloat(priceElement.textContent.replace('$', '')) : null;
        const conditionElement = card.querySelector('.condition-badge');
        const condition = conditionElement ? conditionElement.textContent : null;
        
        return {
            key: bookKey,
            id: bookKey,
            title: title,
            author: author,
            coverImage: coverImage,
            averageRating: averageRating,
            ratingsCount: ratingsCount,
            publishedDate: publishedDate,
            price: price,
            condition: condition,
            description: 'No description available.',
            categories: [],
            previewLink: `https://openlibrary.org${bookKey}`,
            infoLink: `https://openlibrary.org${bookKey}`
        };
    });
    
    cachedState = {
        searchTerm: currentSearchTerm,
        filters: { ...currentFilters },
        books: books,
        totalBooks: totalBooksFound,
        page: currentPage,
        hasMore: hasMoreResults
    };
    
    isStateCached = true;
    
    // Save to sessionStorage for persistence across page navigation
    try {
        sessionStorage.setItem('reReadzPageState', JSON.stringify(cachedState));
        console.log('Page state cached to sessionStorage:', { 
            searchTerm: cachedState.searchTerm,
            booksCount: cachedState.books.length,
            totalBooks: cachedState.totalBooks,
            page: cachedState.page,
            hasMore: cachedState.hasMore
        });
    } catch (error) {
        console.log('Error saving to sessionStorage:', error);
    }
}

// Restore page state from localStorage
function restorePageState() {
    const cachedState = loadCachedStateFromStorage();
    
    if (!cachedState) {
        console.log('No cached state found, loading initial books');
        return false;
    }
    
    console.log('Found cached state:', {
        searchTerm: cachedState.searchTerm,
        currentPage: cachedState.currentPage,
        filters: cachedState.filters,
        booksCount: cachedState.books.length,
        totalBooks: cachedState.totalBooks
    });
    
    // Restore search term and page
    currentSearchTerm = cachedState.searchTerm;
    currentPage = cachedState.currentPage;
    totalBooksFound = cachedState.totalBooks;
    
    // Restore filters
    currentFilters = cachedState.filters || {};
    
    // Restore filter button states
    restoreFilterStates();
    
    // Display the cached books and check wishlist state
    displayBooks(cachedState.books);
    
    // Update section title
    const sectionTitle = document.querySelector('.section-title');
    if (currentSearchTerm) {
        const isFilterSearch = !currentSearchTerm.includes('"') && !currentSearchTerm.includes(' ');
        if (isFilterSearch) {
            sectionTitle.textContent = `${currentSearchTerm} (${totalBooksFound} books)`;
        } else {
            sectionTitle.textContent = `Search Results for "${currentSearchTerm}" (${totalBooksFound} books found)`;
        }
    } else {
        sectionTitle.textContent = 'Popular Books';
    }
    
    console.log('Page state restored from cache successfully');
    return true;
}

// Restore filter button states
function restoreFilterStates() {
    // Reset all filter buttons
    document.querySelectorAll('.filter-option').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Restore active filter states
    if (currentFilters.genre) {
        const genreBtn = document.querySelector(`[data-filter="genre"][data-value="${currentFilters.genre}"]`);
        if (genreBtn) genreBtn.classList.add('active');
    }
    
    if (currentFilters.language) {
        const langBtn = document.querySelector(`[data-filter="language"][data-value="${currentFilters.language}"]`);
        if (langBtn) langBtn.classList.add('active');
    }
    
    if (currentFilters.year) {
        const yearBtn = document.querySelector(`[data-filter="year"][data-value="${currentFilters.year}"]`);
        if (yearBtn) yearBtn.classList.add('active');
    }
    
    // Restore sort state
    const sortBtn = document.querySelector('.sort-btn');
    if (sortBtn && currentFilters.sort) {
        sortBtn.textContent = currentFilters.sort === 'relevance' ? 'Sort by' : 
                             currentFilters.sort === 'rating' ? 'Rating' :
                             currentFilters.sort === 'rating_asc' ? 'Rating (Low to High)' :
                             currentFilters.sort === 'title' ? 'Title' :
                             currentFilters.sort === 'author' ? 'Author' :
                             currentFilters.sort === 'date' ? 'Date' : 'Sort by';
    }
}

// Load books from API
async function loadBooks(searchTerm = null, page = 1, append = false) {
    const booksGrid = document.querySelector('.books-grid');
    const sectionTitle = document.querySelector('.section-title');
    
    // Cancel any ongoing request
    if (currentAbortController) {
        currentAbortController.abort();
    }
    
    // Create new abort controller for this request
    currentAbortController = new AbortController();
    const requestId = ++currentRequestId;
    
    // Show loading state
            if (!append) {
            booksGrid.innerHTML = '<div class="loading-spinner" style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; min-height: 400px;"><div class="books-stack"><div class="book-item"></div><div class="book-item"></div><div class="book-item"></div><div class="book-item"></div><div class="book-item"></div><div class="book-item"></div></div></div>';
        }
    
    try {
        let books = [];
        
        if (searchTerm) {
            // Search for specific books
            const searchResult = await searchBooks(searchTerm, page, currentFilters, currentAbortController.signal);
            
            // Check if this request was cancelled
            if (requestId !== currentRequestId) {
                return;
            }
            
            books = searchResult.books;
            totalBooksFound = searchResult.total;
            currentSearchTerm = searchTerm;
            
            // Check if this is a filter-based search (no quotes in search term)
            const isFilterSearch = !searchTerm.includes('"') && !searchTerm.includes(' ');
            if (isFilterSearch) {
                // For filter searches, show just the filter name with book count
                sectionTitle.textContent = `${searchTerm} (${totalBooksFound} books)`;
            } else {
                // For regular searches, show full search results title
                let titleText = `Search Results for "${searchTerm}" (${totalBooksFound} books found)`;
                sectionTitle.textContent = titleText;
            }
        } else {
            // Load popular books for initial display using simple search
            const searchResult = await searchBooks('fiction', 1, {}, currentAbortController.signal);
            
            // Check if this request was cancelled
            if (requestId !== currentRequestId) {
                return;
            }
            
            books = searchResult.books;
            totalBooksFound = books.length;
            currentSearchTerm = null;
            sectionTitle.textContent = 'Popular Books';
        }
        
        if (append) {
            await appendBooks(books);
        } else {
            await displayBooks(books);
        }
        
        // Update pagination state
        currentPage = page;
        hasMoreResults = books.length > 0;
        
        // Cache the state after successful load (only for non-append operations)
        if (!append) {
            savePageState();
        }
        
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
async function searchBooks(query, page = 1, filters = {}, signal = null) {
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
        // Handle rating-based sorting
        if (filters.sort === 'rating') {
            url += `&sort=rating desc`;
        } else if (filters.sort === 'rating_asc') {
            url += `&sort=rating asc`;
        } else {
            url += `&sort=${filters.sort}`;
        }
    }
    
    const fetchOptions = signal ? { signal } : {};
    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    
    if (!data.docs) {
        return { books: [], total: 0 };
    }
    
    const books = data.docs.map(item => formatBookData(item));
    const total = data.numFound || 0;
    
    // Enhance books with detailed ratings (limit to first 10 for performance)
    const booksWithRatings = [];
    const booksToEnhance = books.slice(0, 10);
    const remainingBooks = books.slice(10);
    
    // Fetch detailed ratings for the first 10 books
    for (const book of booksToEnhance) {
        const enhancedBook = await enhanceBookWithRatings(book, signal);
        booksWithRatings.push(enhancedBook);
    }
    
    // Add remaining books without additional API calls
    booksWithRatings.push(...remainingBooks);
    
    return { books: booksWithRatings, total };
}



// Create a custom fallback image for books without covers
function createFallbackCoverImage(title, author) {
    const encodedTitle = encodeURIComponent(title || 'Unknown Title');
    const encodedAuthor = encodeURIComponent(author || 'Unknown Author');
    
    // Create a more professional SVG fallback
    const svg = `
        <svg width="128" height="200" xmlns="http://www.w3.org/2000/svg">
            <rect width="128" height="200" fill="#4A5568"/>
            <rect x="8" y="8" width="112" height="184" fill="#2D3748" stroke="#718096" stroke-width="1"/>
            <text x="64" y="60" font-family="Arial, sans-serif" font-size="10" fill="#E2E8F0" text-anchor="middle" font-weight="bold">BOOK</text>
            <text x="64" y="80" font-family="Arial, sans-serif" font-size="8" fill="#A0AEC0" text-anchor="middle">COVER</text>
            <text x="64" y="120" font-family="Arial, sans-serif" font-size="6" fill="#718096" text-anchor="middle">No Cover</text>
            <text x="64" y="135" font-family="Arial, sans-serif" font-size="6" fill="#718096" text-anchor="middle">Available</text>
            <rect x="20" y="150" width="88" height="2" fill="#718096"/>
            <rect x="20" y="160" width="88" height="2" fill="#718096"/>
            <rect x="20" y="170" width="88" height="2" fill="#718096"/>
        </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// Format book data from Open Library API response
function formatBookData(item) {
    return {
        key: item.key,
        id: item.key,
        title: item.title || 'Unknown Title',
        author: item.author_name ? item.author_name.join(', ') : 'Unknown Author',
        description: item.description || 'No description available.',
        coverImage: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : createFallbackCoverImage(item.title, item.author_name ? item.author_name.join(', ') : 'Unknown Author'),
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

// Function to enhance book data with detailed ratings
async function enhanceBookWithRatings(book, signal = null) {
    if (book.key) {
        const ratingData = await fetchBookRatings(book.key, signal);
        if (ratingData) {
            book.averageRating = ratingData.average;
            book.ratingsCount = ratingData.count;
        }
    }
    return book;
}

// Function to update book card with fresh rating data
async function updateBookCardRatings(bookCard, bookKey) {
    try {
        const ratingData = await fetchBookRatings(bookKey);
        if (ratingData) {
            const ratingContainer = bookCard.querySelector('.book-rating');
            if (ratingContainer) {
                const ratingStars = createRatingStars(ratingData.average);
                const ratingText = `${ratingData.average.toFixed(1)} (${ratingData.count} reviews)`;
                
                ratingContainer.innerHTML = `
                    ${ratingStars}
                    <span class="rating-text">${ratingText}</span>
                `;
            }
        }
    } catch (error) {
        console.log('Could not update ratings for book card');
    }
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

// Display books with efficient wishlist checking
async function displayBooks(books) {
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
    
    // Efficient wishlist checking - single database call
    if (isAuthenticated && currentUser) {
        const userWishlist = await getUserWishlist();
        await updateWishlistButtonsFromUserWishlist(userWishlist);
    } else {
        await updateWishlistButtonsState();
    }
    
    // Initialize animations for new cards
    initializeAnimations();
    
    // Initialize book card click handlers
    initializeBookCardClicks();
    
    // Initialize rating refresh functionality
    initializeRatingRefresh();
}

// Create book card HTML
function createBookCard(book) {
    const conditionClass = book.condition.toLowerCase().replace(' ', '-');
    
    // Create rating stars HTML with review count
    const ratingStars = book.averageRating ? createRatingStars(book.averageRating) : '';
    const ratingText = book.averageRating && book.ratingsCount ? `${book.averageRating.toFixed(1)} (${book.ratingsCount} reviews)` : '';
    
    // Format release date
    const releaseDate = book.publishedDate ? book.publishedDate : '';
    
    return `
        <div class="book-card" data-book-id="${book.id}" data-book-key="${book.key}">
            <div class="book-image">
                <img src="${book.coverImage}" alt="${book.title}" onerror="this.src='${createFallbackCoverImage(book.title, book.author)}'">
                <button class="wishlist-btn">
                    <i class="far fa-heart"></i>
                </button>
            </div>
            <div class="book-info">
                <h3 class="book-title">${book.title}</h3>
                <p class="book-author">${book.author}</p>
                ${releaseDate ? `
                    <div class="book-release-date">
                        <i class="fas fa-calendar-alt"></i>
                        <span>${releaseDate}</span>
                    </div>
                ` : ''}
                ${ratingStars ? `
                    <div class="book-rating" data-rating="${book.averageRating || ''}" data-count="${book.ratingsCount || ''}">
                        ${ratingStars}
                        ${ratingText ? `<span class="rating-text">${ratingText}</span>` : ''}
                    </div>
                ` : ''}
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

// Append books with efficient wishlist checking
async function appendBooks(books) {
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
    
    // Efficient wishlist checking - single database call
    if (isAuthenticated && currentUser) {
        const userWishlist = await getUserWishlist();
        await updateWishlistButtonsFromUserWishlist(userWishlist);
    } else {
        await updateWishlistButtonsState();
    }
    
    // Initialize animations for new cards
    initializeAnimations();
    
    // Initialize book card click handlers
    initializeBookCardClicks();
    
    // Initialize rating refresh functionality
    initializeRatingRefresh();
}

// Initialize all dropdown functionality
function initializeDropdowns() {
    console.log('🔍 DEBUG: initializeDropdowns() called');
    console.log('🔍 DEBUG: Window width:', window.innerWidth);
    console.log('🔍 DEBUG: Is mobile check (width <= 650):', window.innerWidth <= 650);
    
    // Only initialize desktop dropdowns on larger screens
    if (window.innerWidth <= 650) {
        console.log('🔍 DEBUG: Skipping desktop dropdown initialization on mobile');
        console.log('🔍 DEBUG: Mobile width detected, returning early');
        
        // Force disable any existing desktop dropdowns on mobile
        document.querySelectorAll('.dropdown').forEach(dropdown => {
            dropdown.classList.remove('active');
            console.log('🔍 DEBUG: Forced disabled desktop dropdown:', dropdown);
        });
        
        return;
    }
    
    console.log('🔍 DEBUG: Proceeding with desktop dropdown initialization (should not happen on mobile)');
    console.log('🔍 DEBUG: This should NOT appear at 500px width!');
    
    const dropdowns = document.querySelectorAll('.dropdown');
    console.log('🔍 DEBUG: Found desktop dropdowns:', dropdowns.length);
    
    dropdowns.forEach((dropdown, index) => {
        console.log(`🔍 DEBUG: Setting up desktop dropdown ${index}:`, dropdown);
        const toggle = dropdown.querySelector('.dropdown-toggle');
        console.log(`🔍 DEBUG: Found toggle for dropdown ${index}:`, toggle);
        
        // Safari-compatible event handling
        const handleClick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Check if we're on mobile - if so, redirect to mobile filter function
            if (window.innerWidth <= 650) {
                console.log('🔍 DEBUG: Mobile detected in desktop dropdown click, redirecting to mobile filter');
                
                // Find the corresponding mobile filter toggle and trigger it
                const filterType = this.getAttribute('data-filter') || 'genre'; // Default to genre if not specified
                const mobileToggle = document.querySelector(`.mobile-filter-toggle[data-filter="${filterType}"]`);
                
                if (mobileToggle) {
                    console.log('🔍 DEBUG: Found mobile toggle, triggering it:', mobileToggle);
                    mobileToggle.click();
                } else {
                    console.log('🔍 DEBUG: No mobile toggle found for filter type:', filterType);
                }
                
                return;
            }
            
            console.log('🔍 DEBUG: Desktop dropdown toggle clicked!');
            console.log('🔍 DEBUG: Dropdown element:', dropdown);
            console.log('🔍 DEBUG: Toggle element:', this);
            
            // Close other dropdowns
            dropdowns.forEach(other => {
                if (other !== dropdown) {
                    other.classList.remove('active');
                }
            });
            
            // Toggle current dropdown
            dropdown.classList.toggle('active');
            
            console.log('🔍 DEBUG: Desktop dropdown state:', dropdown.classList.contains('active') ? 'opened' : 'closed');
        };

// Initialize filter toggles
const filterToggles = document.querySelectorAll('.filter-toggle');
filterToggles.forEach(toggle => {
    const handleClick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Check if we're on mobile - if so, redirect to mobile filter function
        if (window.innerWidth <= 650) {
            console.log('🔍 DEBUG: Mobile detected in filter toggle click, redirecting to mobile filter');
            
            const filterType = this.getAttribute('data-filter');
            const mobileToggle = document.querySelector(`.mobile-filter-toggle[data-filter="${filterType}"]`);
            
            if (mobileToggle) {
                console.log('🔍 DEBUG: Found mobile toggle for filter, triggering it:', mobileToggle);
                mobileToggle.click();
            } else {
                console.log('🔍 DEBUG: No mobile toggle found for filter type:', filterType);
            }
            
            return;
        }
        
        console.log('Filter toggle clicked');
        
        const filterType = this.getAttribute('data-filter');
        const isActive = this.classList.contains('active');
        
        // Close all other filter options
        document.querySelectorAll('.filter-options').forEach(options => {
            options.classList.remove('active');
            options.style.display = 'none';
        });
        document.querySelectorAll('.filter-toggle').forEach(other => {
            other.classList.remove('active');
        });
        
        // Toggle current filter options
        const filterOptions = document.querySelector(`.filter-options[data-filter="${filterType}"]`);
        if (filterOptions) {
            if (isActive) {
                this.classList.remove('active');
                filterOptions.classList.remove('active');
                filterOptions.style.display = 'none';
            } else {
                this.classList.add('active');
                filterOptions.classList.add('active');
                filterOptions.style.display = 'flex';
            }
        }
        
        console.log('Filter toggle state:', this.classList.contains('active') ? 'opened' : 'closed');
    };
    
    toggle.addEventListener('click', handleClick, false);
    toggle.addEventListener('touchstart', handleClick, false);
});
        
        // Add multiple event listeners for Safari compatibility
        toggle.addEventListener('click', handleClick, false);
        toggle.addEventListener('touchstart', handleClick, false);
    });
    
    // Initialize sort filter dropdown
    const sortFilter = document.querySelector('.sort-filter');
    if (sortFilter) {
        const sortBtn = sortFilter.querySelector('.sort-btn');
        
        const handleSortClick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Sort button clicked');
            
            // Close other dropdowns
            dropdowns.forEach(dropdown => {
                dropdown.classList.remove('active');
            });
            
            // Toggle sort filter
            sortFilter.classList.toggle('active');
            console.log('Sort dropdown state:', sortFilter.classList.contains('active') ? 'opened' : 'closed');
        };
        
        sortBtn.addEventListener('click', handleSortClick, false);
        sortBtn.addEventListener('touchstart', handleSortClick, false);
        
        // Handle sort option clicks
        const sortOptions = sortFilter.querySelectorAll('.sort-option');
        sortOptions.forEach(option => {
            option.addEventListener('click', function(e) {
                e.preventDefault();
                
                const sortType = this.getAttribute('data-sort');
                const sortText = this.textContent;
                
                // Update button text
                const textSpan = sortBtn.querySelector('.sort-text');
                if (textSpan) {
                    textSpan.textContent = sortText;
                }
                
                // Close dropdown
                sortFilter.classList.remove('active');
                
                // Add active state to button
                sortBtn.classList.add('active');
                
                // Update current sort
                currentFilters.sort = sortType;
                
                // Apply sort to current search
                if (currentSearchTerm) {
                    currentPage = 1;
                    hasMoreResults = true;
                    isLoading = false;
                    loadBooks(currentSearchTerm, 1);
                } else {
                    loadBooks();
                }
                
                console.log(`Sort applied: ${sortType}`);
            });
        });
    }
    
    // Initialize nested dropdowns (sub-dropdowns)
    const subDropdowns = document.querySelectorAll('.sub-dropdown');
    
    console.log('Found sub-dropdowns:', subDropdowns.length);
    
    subDropdowns.forEach((subDropdown, index) => {
        const toggle = subDropdown.querySelector('.sub-dropdown-toggle');
        
        console.log(`Initializing sub-dropdown ${index}:`, { 
            subDropdown, 
            toggle,
            text: toggle ? toggle.textContent.trim() : 'No toggle found'
        });
        
        // Safari-compatible event handling
        const handleClick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Sub-dropdown toggle clicked:', this.textContent.trim());
            
            // Close other sub-dropdowns
            subDropdowns.forEach(other => {
                if (other !== subDropdown) {
                    other.classList.remove('active');
                }
            });
            
            // Toggle current sub-dropdown
            subDropdown.classList.toggle('active');
            
            console.log('Sub-dropdown state:', subDropdown.classList.contains('active') ? 'opened' : 'closed');
            
            // Force Safari to re-render
            setTimeout(() => {
                subDropdown.style.display = 'block';
            }, 0);
        };
        
        // Add multiple event listeners for Safari compatibility
        toggle.addEventListener('click', handleClick, false);
        toggle.addEventListener('touchstart', handleClick, false);
        
        // Add mousedown event for Safari
        toggle.addEventListener('mousedown', function(e) {
            e.preventDefault();
        }, false);
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown')) {
            dropdowns.forEach(dropdown => {
                dropdown.classList.remove('active');
            });
        }
        if (!e.target.closest('.sub-dropdown')) {
            subDropdowns.forEach(subDropdown => {
                subDropdown.classList.remove('active');
            });
        }
        if (!e.target.closest('.sort-filter')) {
            const sortFilter = document.querySelector('.sort-filter');
            if (sortFilter) {
                sortFilter.classList.remove('active');
            }
        }
    });
}

// Initialize filter dropdowns
function initializeFilters() {
    // Handle filter option clicks for nested dropdowns
    const filterOptions = document.querySelectorAll('.filter-option');
    
    console.log('Initializing filters, found options:', filterOptions.length);
    
    filterOptions.forEach((option, index) => {
        console.log(`Filter option ${index}:`, {
            text: option.textContent,
            filter: option.getAttribute('data-filter'),
            value: option.getAttribute('data-value')
        });
        
        option.addEventListener('click', function(e) {
            e.preventDefault();
            
            console.log('Filter option clicked:', this.textContent);
            
            // Get filter type and value from data attributes
            const filterType = this.getAttribute('data-filter');
            const filterValue = this.getAttribute('data-value');
            
            // Clear any existing search term (filters and search are mutually exclusive)
            currentSearchTerm = null;
            
            // Clear search input
            const searchInput = document.querySelector('.search-input');
            if (searchInput) {
                searchInput.value = '';
            }
            
            // Update current filters
            if (filterType && filterValue !== undefined) {
                currentFilters[filterType] = filterValue;
            }
            
            // Close all dropdowns
            document.querySelectorAll('.dropdown').forEach(dropdown => {
                dropdown.classList.remove('active');
            });
            document.querySelectorAll('.sub-dropdown').forEach(subDropdown => {
                subDropdown.classList.remove('active');
            });
            
            // Clear cached state for new filter
            isStateCached = false;
            cachedState = {
                searchTerm: null,
                filters: {},
                books: [],
                totalBooks: 0,
                page: 1,
                hasMore: true
            };
            
            // Clear sessionStorage
            try {
                sessionStorage.removeItem('reReadzPageState');
            } catch (error) {
                console.log('Error clearing sessionStorage:', error);
            }
            
            // Reset pagination
            currentPage = 1;
            hasMoreResults = true;
            isLoading = false;
            
            // Update section title to show filter name
            const sectionTitle = document.querySelector('.section-title');
            sectionTitle.textContent = filterValue;
            
            // Load books with the filter (treat filter value as search term)
            loadBooks(filterValue, 1);
            
            console.log(`Filter applied: ${filterType} = ${filterValue}`);
        });
    });
}

// Refresh wishlist state for all buttons
async function refreshWishlistState() {
    if (isAuthenticated && currentUser) {
        const userWishlist = await getUserWishlist();
        await updateWishlistButtonsFromUserWishlist(userWishlist);
    }
}

// Initialize wishlist buttons
function initializeWishlistButtons() {
    document.addEventListener('click', async function(e) {
        if (e.target.closest('.wishlist-btn')) {
            e.preventDefault();
            e.stopPropagation();
            
            const button = e.target.closest('.wishlist-btn');
            const bookCard = button.closest('.book-card');
            const bookKey = bookCard ? bookCard.dataset.bookKey : null;
            
            if (!bookKey) {
                console.error('No book key found');
                return;
            }
            
            if (!isAuthenticated || !currentUser) {
                openLoginModal();
                return;
            }
            
            // Check current heart state to determine action
            const isCurrentlyFilled = button.querySelector('i').classList.contains('fas');
            
            if (isCurrentlyFilled) {
                // Remove from wishlist
                await removeFromWishlist(bookKey, button);
            } else {
                // Add to wishlist
                await addToWishlist(bookKey, button);
            }
        }
    });
}

// Add to wishlist (Supabase migration)
async function addToWishlist(bookKey, button) {
    if (!isAuthenticated || !currentUser) {
        openLoginModal();
        return;
    }
    
    try {
        const bookCard = button.closest('.book-card');
        const bookTitle = bookCard.querySelector('.book-title')?.textContent || '';
        const bookAuthor = bookCard.querySelector('.book-author')?.textContent || '';
        const bookCover = bookCard.querySelector('.book-image img')?.src || '';
        
        const { data, error } = await supabase
            .from('wishlist')
            .insert({
                user_id: currentUser.id,
                book_key: bookKey,
                book_title: bookTitle,
                book_author: bookAuthor,
                book_cover_url: bookCover
            });
        
        if (error) {
            // Handle duplicate key error (book already in wishlist)
            if (error.code === '23505') {
                console.log('Book already in wishlist');
                updateWishlistButtonUI(button, true);
                return;
            }
            console.error('Error adding to wishlist:', error);
            // Don't update UI if there was an error
            return;
        }
        
        updateWishlistButtonUI(button, true);
        console.log('Added to wishlist');
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        // Don't update UI if there was an error
    }
}

// Remove from wishlist (Supabase migration)
async function removeFromWishlist(bookKey, button) {
    if (!isAuthenticated || !currentUser) {
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('wishlist')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('book_key', bookKey);
        
        if (error) {
            console.error('Error removing from wishlist:', error);
            // Don't update UI if there was an error
            return;
        }
        
        updateWishlistButtonUI(button, false);
        console.log('Removed from wishlist');
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        // Don't update UI if there was an error
    }
}

// Update wishlist button UI
function updateWishlistButtonUI(button, isActive) {
    const icon = button.querySelector('i');
    
    if (isActive) {
        button.classList.add('active');
        icon.classList.remove('far');
        icon.classList.add('fas');
        icon.style.color = '#E53E3E';
    } else {
        button.classList.remove('active');
        icon.classList.remove('fas');
        icon.classList.add('far');
        icon.style.color = '#A0AEC0';
    }
    
    // Add animation
    button.style.transform = isActive ? 'scale(1.1)' : 'scale(0.9)';
    setTimeout(() => {
        button.style.transform = 'scale(1)';
    }, 150);
}

// Check if book is in user's wishlist (Supabase migration)
async function isBookInWishlist(bookKey) {
    if (!isAuthenticated || !currentUser || !supabase) {
        return false;
    }
    
    try {
        const { data, error } = await supabase
            .from('wishlist')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('book_key', bookKey)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
            console.error('Error checking wishlist:', error);
            return false;
        }
        return !!data;
    } catch (error) {
        console.error('Error checking wishlist:', error);
        return false;
    }
}

// Get user's wishlist
async function getUserWishlist() {
    if (!isAuthenticated || !currentUser || !supabase) {
        return [];
    }
    
    try {
        const { data, error } = await supabase
            .from('wishlist')
            .select('book_key')
            .eq('user_id', currentUser.id);
        
        if (error) {
            console.error('Error fetching user wishlist:', error);
            // Return empty array if table doesn't exist or other error
            return [];
        }
        
        return data.map(item => item.book_key);
    } catch (error) {
        console.error('Error fetching user wishlist:', error);
        // Return empty array if table doesn't exist or other error
        return [];
    }
}

// Update all wishlist buttons based on authentication state (simplified)
async function updateWishlistButtonsState() {
    const wishlistButtons = document.querySelectorAll('.wishlist-btn');
    
    for (const button of wishlistButtons) {
        if (isAuthenticated && currentUser) {
            button.style.display = 'block';
            button.classList.add('authenticated');
            // Don't check wishlist status on load - only when user clicks
            updateWishlistButtonUI(button, false); // Start with empty heart
        } else {
            button.style.display = 'none';
            button.classList.remove('authenticated');
        }
    }
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
        // Clear cached state for new search
        isStateCached = false;
        cachedState = {
            searchTerm: null,
            filters: {},
            books: [],
            totalBooks: 0,
            page: 1,
            hasMore: true
        };
        
        // Clear sessionStorage
        try {
            sessionStorage.removeItem('reReadzPageState');
        } catch (error) {
            console.log('Error clearing sessionStorage:', error);
        }
        
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
        
        // Reset filters
        
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
            
            // Skip if href is just "#" or empty
            if (!targetId || targetId === '#' || targetId.length <= 1) {
                return;
            }
            
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
    console.log('🔍 DEBUG: initializeMobileMenu() called');
    
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    console.log('🔍 DEBUG: Mobile menu elements found:', { 
        mobileMenuToggle: !!mobileMenuToggle, 
        navMenu: !!navMenu 
    });
    console.log('🔍 DEBUG: Mobile menu toggle element:', mobileMenuToggle);
    console.log('🔍 DEBUG: Nav menu element:', navMenu);
    
    if (mobileMenuToggle && navMenu) {
        // Safari-compatible event handling
        const handleClick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🔍 DEBUG: Mobile menu toggle clicked!');
            console.log('🔍 DEBUG: Event:', e);
            console.log('🔍 DEBUG: Current nav menu classes:', navMenu.className);
            
            navMenu.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
            
            // Update nav-container for inline mobile menu
            const navContainer = document.querySelector('.nav-container');
            if (navContainer) {
                navContainer.classList.toggle('mobile-menu-active');
            }
            
                    // Disable desktop dropdowns when mobile menu is active
        if (window.innerWidth <= 650) {
            console.log('🔍 DEBUG: Disabling desktop dropdowns on mobile menu toggle');
            document.querySelectorAll('.dropdown').forEach(dropdown => {
                dropdown.classList.remove('active');
            });
        } else {
            console.log('🔍 DEBUG: Not mobile, keeping desktop dropdowns enabled');
        }
            
            // Update aria-label for accessibility
            const isActive = navMenu.classList.contains('active');
            mobileMenuToggle.setAttribute('aria-label', isActive ? 'Close mobile menu' : 'Open mobile menu');
            
            console.log('Menu state:', isActive ? 'opened' : 'closed');
        };
        
        // Add multiple event listeners for Safari compatibility
        mobileMenuToggle.addEventListener('click', handleClick, false);
        mobileMenuToggle.addEventListener('touchstart', handleClick, false);
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!navMenu.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                navMenu.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
                const navContainer = document.querySelector('.nav-container');
                if (navContainer) {
                    navContainer.classList.remove('mobile-menu-active');
                }
                mobileMenuToggle.setAttribute('aria-label', 'Open mobile menu');
            }
        });
        
        // Close mobile menu on window resize
        window.addEventListener('resize', function() {
            if (window.innerWidth > 650) {
                navMenu.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
                const navContainer = document.querySelector('.nav-container');
                if (navContainer) {
                    navContainer.classList.remove('mobile-menu-active');
                }
                mobileMenuToggle.setAttribute('aria-label', 'Open mobile menu');
            } else {
                // Ensure desktop dropdowns are disabled on mobile
                document.querySelectorAll('.dropdown').forEach(dropdown => {
                    dropdown.classList.remove('active');
                });
            }
        });
    } else {
        console.error('Mobile menu elements not found:', { mobileMenuToggle, navMenu });
    }
}

// Floating action button functionality
document.addEventListener('DOMContentLoaded', function() {
    const fabButtons = document.querySelectorAll('.fab-btn');
    
    fabButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Add click animation
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
            
            // Sell Your Book functionality
            // In a real app, this would navigate to the sell book page
            // window.location.href = '/sell-book';
        });
    });
});

// Book card interactions are now handled by initializeBookCardClicks()
// which is called after books are dynamically loaded

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

// Initialize book card click handlers
function initializeBookCardClicks() {
    // Don't initialize on book details page
    if (window.location.pathname.includes('book-details.html') || window.location.pathname.includes('/bd')) {
        return;
    }
    
    const bookCards = document.querySelectorAll('.book-card');
    
    bookCards.forEach(card => {
        // Remove existing click listeners to prevent duplicates
        card.removeEventListener('click', handleBookCardClick);
        // Add new click listener
        card.addEventListener('click', handleBookCardClick);
    });
}

// Handle book card click
function handleBookCardClick(e) {
    // Don't trigger if clicking on wishlist button
    if (e.target.closest('.wishlist-btn')) {
        return;
    }
    
    // Navigate to book details page (don't save state here - it's already cached)
    const bookKey = this.dataset.bookKey;
    if (bookKey) {
        // Show loading screen before navigation
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
        }
        
        // Navigate to book details page
        window.location.href = `/bd?id=${bookKey}`;
    }
}

// Initialize rating refresh functionality
function initializeRatingRefresh() {
    // Don't initialize on book details page
    if (window.location.pathname.includes('book-details.html') || window.location.pathname.includes('/bd')) {
        return;
    }
    
    // Note: Rating refresh functionality removed to prevent conflicts with navigation
    // Ratings are now loaded when books are initially fetched
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
            const scrollElements = document.querySelectorAll('.books-grid');
    scrollElements.forEach(element => {
        element.style.webkitOverflowScrolling = 'touch';
    });
    
    // Add better touch handling for dropdowns on mobile
            const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
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
            const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        dropdown.classList.remove('active');
    });
}, 250));

// Add keyboard navigation support
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        // Close all dropdowns on Escape key
        const dropdowns = document.querySelectorAll('.dropdown');
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
            const searchResult = await searchBooks(currentSearchTerm, currentPage, currentFilters, currentAbortController?.signal);
            const newBooks = searchResult.books;
            
            if (newBooks.length > 0) {
                await appendBooks(newBooks);
                hasMoreResults = newBooks.length === 20; // Assuming 20 books per page
            } else {
                hasMoreResults = false;
            }
        } else {
            // For popular books, we don't have pagination, so disable infinite scroll
            hasMoreResults = false;
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Load more books request cancelled');
        } else {
            console.error('Error loading more books:', error);
        }
        hasMoreResults = false;
    } finally {
        isLoading = false;
        // Hide loading state on sentinel
        if (window.scrollSentinel) {
            window.scrollSentinel.classList.remove('loading');
        }
    }
}

// Initialize mobile filter functionality
function initializeMobileFilters() {
    console.log('🔍 DEBUG: initializeMobileFilters() called');
    
    const mobileFilterToggles = document.querySelectorAll('.mobile-filter-toggle');
    console.log('🔍 DEBUG: Found mobile filter toggles:', mobileFilterToggles.length);
    
    mobileFilterToggles.forEach((toggle, index) => {
        console.log(`🔍 DEBUG: Setting up mobile filter toggle ${index}:`, toggle);
        
        const handleClick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const filterType = this.getAttribute('data-filter');
            const isActive = this.classList.contains('active');
            
            console.log('🔍 DEBUG: Mobile filter toggle clicked!');
            console.log('🔍 DEBUG: Filter type:', filterType);
            console.log('🔍 DEBUG: Is currently active:', isActive);
            console.log('🔍 DEBUG: Element:', this);
            
            // Special handling for main "Filters" toggle
            if (filterType === 'filters') {
                console.log('🔍 DEBUG: Main filters toggle clicked');
                
                // Close all other filter options first
                document.querySelectorAll('.mobile-filter-options').forEach(options => {
                    options.style.display = 'none';
                });
                document.querySelectorAll('.mobile-filter-toggle').forEach(other => {
                    other.classList.remove('active');
                });
                
                // Toggle main filters container
                const filterOptions = document.querySelector(`.mobile-filter-options[data-filter="${filterType}"]`);
                if (filterOptions) {
                    if (isActive) {
                        console.log('🔍 DEBUG: Closing main filters');
                        this.classList.remove('active');
                        filterOptions.style.display = 'none';
                    } else {
                        console.log('🔍 DEBUG: Opening main filters');
                        this.classList.add('active');
                        filterOptions.style.display = 'block';
                    }
                }
            } else {
                // Handle individual filter toggles (genre, language, year)
                console.log('🔍 DEBUG: Individual filter toggle clicked:', filterType);
                
                // Only close other individual filter options, not the main filters container
                document.querySelectorAll('.mobile-filter-options[data-filter="genre"], .mobile-filter-options[data-filter="language"], .mobile-filter-options[data-filter="year"]').forEach(options => {
                    options.style.display = 'none';
                });
                document.querySelectorAll('.mobile-filter-toggle[data-filter="genre"], .mobile-filter-toggle[data-filter="language"], .mobile-filter-toggle[data-filter="year"]').forEach(other => {
                    other.classList.remove('active');
                });
                
                // Toggle current filter options
                const filterOptions = document.querySelector(`.mobile-filter-options[data-filter="${filterType}"]`);
                console.log('🔍 DEBUG: Found filter options element:', filterOptions);
                
                if (filterOptions) {
                    if (isActive) {
                        console.log('🔍 DEBUG: Closing filter options');
                        this.classList.remove('active');
                        filterOptions.style.display = 'none';
                    } else {
                        console.log('🔍 DEBUG: Opening filter options');
                        this.classList.add('active');
                        filterOptions.style.display = 'block';
                    }
                } else {
                    console.log('🔍 DEBUG: ERROR - No filter options found for:', filterType);
                }
            }
            
            console.log('🔍 DEBUG: Mobile filter toggle state:', this.classList.contains('active') ? 'opened' : 'closed');
        };
        
        toggle.addEventListener('click', handleClick, false);
        toggle.addEventListener('touchstart', handleClick, false);
        console.log(`🔍 DEBUG: Event listeners added to mobile filter toggle ${index}`);
    });
    
    // Handle mobile filter option clicks
    const mobileFilterOptions = document.querySelectorAll('.mobile-filter-option');
    console.log('🔍 DEBUG: Found mobile filter options:', mobileFilterOptions.length);
    
    mobileFilterOptions.forEach((option, index) => {
        console.log(`🔍 DEBUG: Setting up mobile filter option ${index}:`, option);
        
        const handleClick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const filterType = this.getAttribute('data-filter');
            const filterValue = this.getAttribute('data-value');
            
            console.log('🔍 DEBUG: Mobile filter option clicked!');
            console.log('🔍 DEBUG: Filter type:', filterType);
            console.log('🔍 DEBUG: Filter value:', filterValue);
            console.log('🔍 DEBUG: Element:', this);
            
            // Update active state
            document.querySelectorAll(`.mobile-filter-option[data-filter="${filterType}"]`).forEach(opt => {
                opt.classList.remove('active');
            });
            this.classList.add('active');
            
            // Apply filter
            console.log('🔍 DEBUG: Calling applyFilter with:', filterType, filterValue);
            applyFilter(filterType, filterValue);
            
            // Close the filter options
            const filterOptions = document.querySelector(`.mobile-filter-options[data-filter="${filterType}"]`);
            const filterToggle = document.querySelector(`.mobile-filter-toggle[data-filter="${filterType}"]`);
            if (filterOptions && filterToggle) {
                console.log('🔍 DEBUG: Closing filter options after selection');
                filterOptions.style.display = 'none';
                filterToggle.classList.remove('active');
            }
            
            console.log('🔍 DEBUG: Mobile filter applied:', filterType, filterValue);
        };
        
        option.addEventListener('click', handleClick, false);
        option.addEventListener('touchstart', handleClick, false);
        console.log(`🔍 DEBUG: Event listeners added to mobile filter option ${index}`);
    });
    
    console.log('🔍 DEBUG: initializeMobileFilters() completed');
}

// Function to disable desktop dropdowns on mobile
function disableDesktopDropdownsOnMobile() {
    if (window.innerWidth <= 650) {
        console.log('🔍 DEBUG: Disabling all desktop dropdown functionality on mobile');
        
        // Remove all click events from desktop dropdown toggles
        document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
            const newToggle = toggle.cloneNode(true);
            toggle.parentNode.replaceChild(newToggle, toggle);
            console.log('🔍 DEBUG: Removed click events from desktop dropdown toggle:', toggle);
        });
        
        // Remove all click events from filter toggles
        document.querySelectorAll('.filter-toggle').forEach(toggle => {
            const newToggle = toggle.cloneNode(true);
            toggle.parentNode.replaceChild(newToggle, toggle);
            console.log('🔍 DEBUG: Removed click events from filter toggle:', toggle);
        });
        
        // Force close any open dropdowns
        document.querySelectorAll('.dropdown').forEach(dropdown => {
            dropdown.classList.remove('active');
        });
        
        console.log('🔍 DEBUG: Desktop dropdown functionality disabled on mobile');
    }
}

// Security utilities
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.trim().replace(/[<>]/g, '');
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
}

let supabase;

// Authentication state
let currentUser = null;
let isAuthenticated = false;

// DOM elements
let loginNavItem, userMenu, loginModal, profileModal, userName;

// Initialize authentication
document.addEventListener('DOMContentLoaded', function() {
    initializeSupabase();
    initializeDOMElements();
    initializeAuth();
    setupAuthEventListeners();
});

function initializeSupabase() {
    // Prevent multiple initializations
    if (supabase) {
        console.log('Supabase client already initialized');
        return;
    }
    
    if (window.supabase) {
        // Only create client if we have valid URLs
        if (SUPABASE_URL && SUPABASE_URL !== 'YOUR_SUPABASE_URL' && 
            SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
            try {
                supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                console.log('Supabase client initialized successfully');
            } catch (error) {
                console.error('Error initializing Supabase client:', error);
                supabase = null;
            }
        } else {
            console.warn('Supabase credentials not configured - authentication features will be disabled');
            supabase = null;
        }
    } else {
        console.error('Supabase not loaded');
        supabase = null;
    }
}

function initializeDOMElements() {
    loginNavItem = document.getElementById('login-nav-item');
    userMenu = document.getElementById('user-menu');
    loginModal = document.getElementById('login-modal');
    profileModal = document.getElementById('profile-modal');
    userName = document.getElementById('user-name');
}

// Initialize authentication state
async function initializeAuth() {
    if (!supabase) {
        console.warn('Supabase not available - authentication features disabled');
        updateUIForUnauthenticatedUser();
        return;
    }
    
    try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session) {
            currentUser = session.user;
            isAuthenticated = true;
            updateUIForAuthenticatedUser();
        } else {
            updateUIForUnauthenticatedUser();
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                currentUser = session.user;
                isAuthenticated = true;
                updateUIForAuthenticatedUser();
                closeLoginModal();
            } else if (event === 'SIGNED_OUT') {
                currentUser = null;
                isAuthenticated = false;
                updateUIForUnauthenticatedUser();
            }
        });
    } catch (error) {
        console.error('Error initializing auth:', error);
        updateUIForUnauthenticatedUser();
    }
}

// Setup event listeners
function setupAuthEventListeners() {
    // Login form submission
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Signup form submission
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    
    // Login link click
    const loginLink = document.getElementById('login-link');
    if (loginLink) {
        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            openLoginModal();
        });
    }
    
    // Modal close button
    const modalCloseBtn = document.getElementById('modal-close-btn');
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeLoginModal);
    }
    
    // Social login buttons
    const googleBtn = document.getElementById('google-login-btn');
    if (googleBtn) {
        googleBtn.addEventListener('click', signInWithGoogle);
    }
    
    const appleBtn = document.getElementById('apple-login-btn');
    if (appleBtn) {
        appleBtn.addEventListener('click', signInWithApple);
    }
    
    const facebookBtn = document.getElementById('facebook-login-btn');
    if (facebookBtn) {
        facebookBtn.addEventListener('click', signInWithFacebook);
    }
    
    // Form toggle button
    const toggleBtn = document.getElementById('toggle-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleAuthForm);
    }
    
    // User menu toggle
    const userMenuToggle = document.getElementById('user-menu-toggle');
    if (userMenuToggle) {
        userMenuToggle.addEventListener('click', toggleUserMenu);
    }
    
    // User menu links
    const profileLink = document.getElementById('profile-link');
    if (profileLink) {
        profileLink.addEventListener('click', (e) => {
            e.preventDefault();
            showProfile();
        });
    }
    
    const signoutLink = document.getElementById('signout-link');
    if (signoutLink) {
        signoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            signOut();
        });
    }
    
    // Mobile profile and logout buttons
    const mobileProfileBtn = document.getElementById('mobile-profile-btn');
    if (mobileProfileBtn) {
        mobileProfileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showProfile();
        });
    }
    
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            signOut();
        });
    }
    
    // Profile modal close button
    const profileModalCloseBtn = document.getElementById('profile-modal-close-btn');
    if (profileModalCloseBtn) {
        profileModalCloseBtn.addEventListener('click', closeProfileModal);
    }
    
    // Close profile modal when clicking outside
    if (profileModal) {
        profileModal.addEventListener('click', (e) => {
            if (e.target === profileModal) {
                closeProfileModal();
            }
        });
    }
    
    // Close login modal when clicking outside
    if (loginModal) {
        loginModal.addEventListener('click', (e) => {
            if (e.target === loginModal) {
                closeLoginModal();
            }
        });
    }
    
    // Close modals on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (loginModal && !loginModal.classList.contains('hidden')) {
                closeLoginModal();
            }
            if (profileModal && !profileModal.classList.contains('hidden')) {
                closeProfileModal();
            }
        }
    });
}

// Modal management
function openLoginModal() {
    loginModal.classList.remove('hidden');
    setTimeout(() => {
        loginModal.classList.add('show');
    }, 10);
    document.body.style.overflow = 'hidden';
}

function closeLoginModal() {
    loginModal.classList.remove('show');
    setTimeout(() => {
        loginModal.classList.add('hidden');
        document.body.style.overflow = '';
        resetForms();
    }, 200);
}

// Profile modal management
function openProfileModal() {
    profileModal.classList.remove('hidden');
    setTimeout(() => {
        profileModal.classList.add('show');
    }, 10);
    document.body.style.overflow = 'hidden';
    populateProfileData();
}

function closeProfileModal() {
    profileModal.classList.remove('show');
    setTimeout(() => {
        profileModal.classList.add('hidden');
        document.body.style.overflow = '';
    }, 200);
}

function populateProfileData() {
    if (currentUser) {
        const profileName = document.getElementById('profile-name');
        const profileEmail = document.getElementById('profile-email');
        const profileJoined = document.getElementById('profile-joined');
        
        // Set user name
        const displayName = currentUser.user_metadata?.full_name || 
                           currentUser.user_metadata?.name || 
                           currentUser.email?.split('@')[0] || 
                           'User';
        profileName.textContent = displayName;
        
        // Set email
        profileEmail.textContent = currentUser.email || 'No email available';
        
        // Set join date
        if (currentUser.created_at) {
            const joinDate = new Date(currentUser.created_at);
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            profileJoined.textContent = `Member since: ${joinDate.toLocaleDateString('en-US', options)}`;
        } else {
            profileJoined.textContent = 'Member since: Unknown';
        }
    }
}

function toggleAuthForm() {
    const isLoginForm = !loginForm.classList.contains('hidden');
    
    if (isLoginForm) {
        // Switch to signup
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        modalTitle.textContent = 'Sign Up';
        toggleText.textContent = 'Already have an account?';
        toggleBtn.textContent = 'Sign In';
    } else {
        // Switch to login
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        modalTitle.textContent = 'Sign In';
        toggleText.textContent = 'Don\'t have an account?';
        toggleBtn.textContent = 'Sign Up';
    }
}

function resetForms() {
    loginForm.reset();
    signupForm.reset();
    clearFormErrors();
    
    // Reset to login form
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    modalTitle.textContent = 'Sign In';
    toggleText.textContent = 'Don\'t have an account?';
    toggleBtn.textContent = 'Sign Up';
}

function clearFormErrors() {
    const errorMessages = document.querySelectorAll('.error-message');
    errorMessages.forEach(msg => msg.remove());
    
    const errorInputs = document.querySelectorAll('.form-group input.error');
    errorInputs.forEach(input => input.classList.remove('error'));
}

// Form handling
async function handleLogin(e) {
    e.preventDefault();
    clearFormErrors();
    
    if (!supabase) {
        showFormError('login-form', 'Authentication service not available. Please configure Supabase credentials.');
        return;
    }
    
    const email = sanitizeInput(document.getElementById('login-email').value);
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showFormError('login-form', 'Please fill in all fields');
        return;
    }
    
    if (!validateEmail(email)) {
        showFormError('login-form', 'Please enter a valid email address');
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                showFormError('login-form', 'Invalid email or password');
            } else {
                showFormError('login-form', 'Login failed. Please try again.');
            }
        }
    } catch (error) {
        showFormError('login-form', 'An unexpected error occurred');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    clearFormErrors();
    
    if (!supabase) {
        showFormError('signup-form', 'Authentication service not available. Please configure Supabase credentials.');
        return;
    }
    
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    
    if (!name || !email || !password || !confirmPassword) {
        showFormError('signup-form', 'Please fill in all fields');
        return;
    }
    
    if (password !== confirmPassword) {
        showFormError('signup-form', 'Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        showFormError('signup-form', 'Password must be at least 6 characters');
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name
                }
            }
        });
        
        if (error) {
            showFormError('signup-form', error.message);
        } else {
            showFormError('signup-form', 'Check your email for a confirmation link!', 'success');
        }
    } catch (error) {
        showFormError('signup-form', 'An unexpected error occurred');
    }
}

// Social login functions
async function signInWithGoogle() {
    if (!supabase) {
        showFormError('login-form', 'Authentication service not available. Please configure Supabase credentials.');
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + window.location.pathname
            }
        });
        
        if (error) {
            console.error('Google OAuth error:', error);
            showFormError('login-form', 'Google login failed. Please try again.');
        }
    } catch (error) {
        console.error('Google OAuth exception:', error);
        showFormError('login-form', 'An unexpected error occurred');
    }
}

async function signInWithApple() {
    if (!supabase) {
        showFormError('login-form', 'Authentication service not available. Please configure Supabase credentials.');
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'apple',
            options: {
                redirectTo: window.location.origin + window.location.pathname
            }
        });
        
        if (error) {
            console.error('Apple OAuth error:', error);
            showFormError('login-form', 'Apple login failed. Please try again.');
        }
    } catch (error) {
        console.error('Apple OAuth exception:', error);
        showFormError('login-form', 'An unexpected error occurred');
    }
}

async function signInWithFacebook() {
    if (!supabase) {
        showFormError('login-form', 'Authentication service not available. Please configure Supabase credentials.');
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'facebook',
            options: {
                redirectTo: window.location.origin + window.location.pathname
            }
        });
        
        if (error) {
            console.error('Facebook OAuth error:', error);
            showFormError('login-form', 'Facebook login failed. Please try again.');
        }
    } catch (error) {
        console.error('Facebook OAuth exception:', error);
        showFormError('login-form', 'An unexpected error occurred');
    }
}

// Sign out
async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error signing out:', error);
        }
    } catch (error) {
        console.error('Error signing out:', error);
    }
}

// UI updates
async function updateUIForAuthenticatedUser() {
    loginNavItem.classList.add('hidden');
    userMenu.classList.remove('hidden');
    
    // Show mobile profile and logout links
    const mobileProfileLink = document.getElementById('mobile-profile-link');
    const mobileLogoutLink = document.getElementById('mobile-logout-link');
    if (mobileProfileLink) mobileProfileLink.classList.remove('hidden');
    if (mobileLogoutLink) mobileLogoutLink.classList.remove('hidden');
    
    if (currentUser) {
        const displayName = currentUser.user_metadata?.full_name || 
                           currentUser.user_metadata?.name || 
                           currentUser.email?.split('@')[0] || 
                           'User';
        userName.textContent = displayName;
    }
    
    // Update wishlist buttons state
    await updateWishlistButtonsState();
}

async function updateUIForUnauthenticatedUser() {
    loginNavItem.classList.remove('hidden');
    userMenu.classList.add('hidden');
    
    // Hide mobile profile and logout links
    const mobileProfileLink = document.getElementById('mobile-profile-link');
    const mobileLogoutLink = document.getElementById('mobile-logout-link');
    if (mobileProfileLink) mobileProfileLink.classList.add('hidden');
    if (mobileLogoutLink) mobileLogoutLink.classList.add('hidden');
    
    // Update wishlist buttons state
    await updateWishlistButtonsState();
}

// User menu toggle
function toggleUserMenu() {
    userMenu.classList.toggle('active');
}

// Utility functions
function showFormError(formId, message, type = 'error') {
    const form = document.getElementById(formId);
    const errorDiv = document.createElement('div');
    errorDiv.className = `error-message ${type}`;
    errorDiv.textContent = message;
    
    form.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function showProfile() {
    openProfileModal();
}

function showWishlist() {
    // TODO: Implement wishlist page
    console.log('Show wishlist');
}

// Update wishlist buttons based on user's wishlist (efficient)
async function updateWishlistButtonsFromUserWishlist(userWishlist) {
    const wishlistButtons = document.querySelectorAll('.wishlist-btn');
    
    for (const button of wishlistButtons) {
        if (isAuthenticated && currentUser) {
            button.style.display = 'block';
            button.classList.add('authenticated');
            
            const bookCard = button.closest('.book-card');
            const bookKey = bookCard ? bookCard.dataset.bookKey : null;
            
            if (bookKey && userWishlist.includes(bookKey)) {
                updateWishlistButtonUI(button, true);
            } else {
                updateWishlistButtonUI(button, false);
            }
        } else {
            button.style.display = 'none';
            button.classList.remove('authenticated');
        }
    }
}

// Make wishlist functions available globally for book details page
window.addToWishlist = addToWishlist;
window.removeFromWishlist = removeFromWishlist;
window.getUserWishlist = getUserWishlist;
window.updateWishlistButtonUI = updateWishlistButtonUI;
window.openLoginModal = openLoginModal;
