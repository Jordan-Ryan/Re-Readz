// Book Details Page JavaScript
// BOOKS_API_BASE_URL is already declared in script.js

// Get book ID from URL parameters
function getBookIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id') || urlParams.get('key');
}

// Load book details from Open Library API
async function loadBookDetails(bookKey) {
    try {
        // Fetch basic book information
        const response = await fetch(`${BOOKS_API_BASE_URL}${bookKey}.json`);
        if (!response.ok) {
            throw new Error('Failed to fetch book details');
        }
        
        const bookData = await response.json();
        
        // Fetch ratings if available
        let ratings = null;
        try {
            const ratingsResponse = await fetch(`${BOOKS_API_BASE_URL}${bookKey}/ratings.json`);
            if (ratingsResponse.ok) {
                ratings = await ratingsResponse.json();
            }
        } catch (error) {
            console.log('Could not fetch ratings for book');
        }
        
        // Fetch edition information for publish date, pages, language
        let editionData = null;
        try {
            const editionsResponse = await fetch(`${BOOKS_API_BASE_URL}${bookKey}/editions.json`);
            if (editionsResponse.ok) {
                const editions = await editionsResponse.json();
                if (editions.entries && editions.entries.length > 0) {
                    editionData = editions.entries[0]; // Get first edition
                }
            }
        } catch (error) {
            console.log('Could not fetch edition data for book');
        }
        
        // Fetch author information if available
        let authorData = null;
        if (bookData.authors && bookData.authors.length > 0) {
            try {
                const authorKey = bookData.authors[0].author.key;
                const authorResponse = await fetch(`${BOOKS_API_BASE_URL}${authorKey}.json`);
                if (authorResponse.ok) {
                    authorData = await authorResponse.json();
                }
            } catch (error) {
                console.log('Could not fetch author data');
            }
        }
        
        return { bookData, ratings, editionData, authorData };
    } catch (error) {
        console.error('Error loading book details:', error);
        throw error;
    }
}

// Update the book details page with fetched data
function updateBookDetails(bookData, ratings, editionData, authorData) {
    // Update book cover
    const bookCover = document.getElementById('book-cover');
    if (bookData.covers && bookData.covers.length > 0) {
        bookCover.src = `https://covers.openlibrary.org/b/id/${bookData.covers[0]}-L.jpg`;
    } else {
        // Create fallback cover
        bookCover.src = createFallbackCoverImage(bookData.title || 'Unknown Book', bookData.authors?.[0]?.name || 'Unknown Author');
    }
    
    // Update book title and author
    document.getElementById('book-title').textContent = bookData.title || 'Unknown Title';
    
    const authorName = authorData ? authorData.name : (bookData.authors?.[0]?.name || 'Unknown Author');
    document.getElementById('book-author').textContent = `by ${authorName}`;
    
    // Publish date is now handled in the book card release date
    
    // Update language - hide if unknown
    const language = document.getElementById('language');
    const languageCard = language.closest('.info-card');
    if (editionData && editionData.languages && editionData.languages.length > 0) {
        const langCode = editionData.languages[0].key.split('/').pop();
        const langNames = {
            'eng': 'English',
            'spa': 'Spanish',
            'fre': 'French',
            'ger': 'German',
            'ita': 'Italian',
            'por': 'Portuguese',
            'rus': 'Russian',
            'jpn': 'Japanese',
            'chi': 'Chinese',
            'ara': 'Arabic'
        };
        language.textContent = langNames[langCode] || langCode.toUpperCase();
        languageCard.style.display = 'flex';
    } else {
        languageCard.style.display = 'none';
    }
    
    // Update pages - hide if unknown
    const pages = document.getElementById('pages');
    const pagesCard = pages.closest('.info-card');
    if (editionData && editionData.number_of_pages) {
        pages.textContent = editionData.number_of_pages;
        pagesCard.style.display = 'flex';
    } else if (editionData && editionData.pagination) {
        pages.textContent = editionData.pagination;
        pagesCard.style.display = 'flex';
    } else {
        pagesCard.style.display = 'none';
    }
    
    // Update rating - hide if no ratings
    const bookRating = document.getElementById('book-rating');
    if (ratings && ratings.summary && ratings.summary.average > 0) {
        const averageRating = ratings.summary.average || 0;
        const totalRatings = ratings.summary.count || 0;
        
        const ratingStars = createRatingStars(averageRating);
        const ratingText = `${averageRating.toFixed(1)} (${totalRatings} reviews)`;
        
        bookRating.innerHTML = `
            ${ratingStars}
            <span class="rating-text">${ratingText}</span>
        `;
        bookRating.style.display = 'flex';
    } else {
        bookRating.style.display = 'none';
    }
    
    // Update release date
    const releaseDate = document.getElementById('release-date');
    if (editionData && editionData.publish_date) {
        releaseDate.textContent = editionData.publish_date;
    } else if (bookData.first_publish_date) {
        releaseDate.textContent = bookData.first_publish_date;
    } else {
        releaseDate.textContent = 'Unknown';
    }
    
    // Update price (mock data since we don't have real pricing)
    const bookPrice = document.getElementById('book-price');
    bookPrice.textContent = '$12.99'; // Mock price
    
    // Update description - hide if no description
    const description = document.getElementById('description');
    const descriptionSection = document.querySelector('.book-description');
    if (bookData.description) {
        let descText = '';
        if (typeof bookData.description === 'string') {
            descText = bookData.description;
        } else if (bookData.description.value) {
            descText = bookData.description.value;
        }
        
        if (descText && descText.trim()) {
            description.innerHTML = `<p>${descText}</p>`;
            descriptionSection.style.display = 'block';
        } else {
            descriptionSection.style.display = 'none';
        }
    } else {
        descriptionSection.style.display = 'none';
    }
}

// Create fallback cover image
function createFallbackCoverImage(title, author) {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, '#38A169');
    gradient.addColorStop(1, '#2F855A');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 300, 400);
    
    // Text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    
    // Title
    const titleLines = wrapText(ctx, title, 280);
    let y = 180;
    titleLines.forEach(line => {
        ctx.fillText(line, 150, y);
        y += 20;
    });
    
    // Author
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText(`by ${author}`, 150, y + 20);
    
    return canvas.toDataURL();
}

// Helper function to wrap text
function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];
    
    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + ' ' + word).width;
        if (width < maxWidth) {
            currentLine += ' ' + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}

// Create rating stars
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

// Load reviews - Open Library doesn't provide reviews, so we'll hide the section
async function loadReviews(bookKey) {
    // Hide reviews section since Open Library doesn't provide reviews
    const reviewsSection = document.querySelector('.reviews-section');
    if (reviewsSection) {
        reviewsSection.style.display = 'none';
    }
}

// Display reviews
function displayReviews(reviews) {
    const reviewsContainer = document.getElementById('reviews-container');
    
    if (reviews.length === 0) {
        reviewsContainer.innerHTML = '<div class="no-results">No reviews available for this book.</div>';
        return;
    }
    
    const reviewsHTML = reviews.map(review => `
        <div class="review-card" data-rating="${review.rating}">
            <div class="review-header">
                <div class="reviewer-avatar">
                    ${review.reviewer.charAt(0)}
                </div>
                <div class="reviewer-info">
                    <p class="reviewer-name">${review.reviewer}</p>
                    <p class="review-date">${formatDate(review.date)}</p>
                </div>
                <div class="review-rating">
                    ${createRatingStars(review.rating)}
                </div>
            </div>
            <div class="review-content">
                <p>${review.content}</p>
            </div>
        </div>
    `).join('');
    
    reviewsContainer.innerHTML = reviewsHTML;
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Load and display book details (genres, places, people, time periods)
async function loadBookDetailSections(bookKey, bookData) {
    // Load genres/subjects
    if (bookData.subjects && bookData.subjects.length > 0) {
        displayTags('genres-container', bookData.subjects, 'genre');
        document.getElementById('genres-section').style.display = 'block';
    } else {
        document.getElementById('genres-section').style.display = 'none';
    }
    
    // Load places
    if (bookData.subject_places && bookData.subject_places.length > 0) {
        displayTags('places-container', bookData.subject_places, 'place');
        document.getElementById('places-section').style.display = 'block';
    } else {
        document.getElementById('places-section').style.display = 'none';
    }
    
    // Load people
    if (bookData.subject_people && bookData.subject_people.length > 0) {
        displayTags('people-container', bookData.subject_people, 'person');
        document.getElementById('people-section').style.display = 'block';
    } else {
        document.getElementById('people-section').style.display = 'none';
    }
    
    // Load time periods
    if (bookData.subject_times && bookData.subject_times.length > 0) {
        displayTags('time-container', bookData.subject_times, 'time');
        document.getElementById('time-section').style.display = 'block';
    } else {
        document.getElementById('time-section').style.display = 'none';
    }
}

// Display tags for different categories
function displayTags(containerId, items, tagClass) {
    const container = document.getElementById(containerId);
    
    if (!items || items.length === 0) {
        container.innerHTML = '<span class="no-data">No data available</span>';
        return;
    }
    
    const tagsHTML = items.map(item => 
        `<span class="tag ${tagClass}">${item}</span>`
    ).join('');
    
    container.innerHTML = tagsHTML;
}

// Initialize wishlist functionality
function initializeWishlist() {
    const wishlistBtn = document.getElementById('wishlist-btn');
    
    wishlistBtn.addEventListener('click', function() {
        const isInWishlist = this.classList.contains('active');
        
        if (isInWishlist) {
            this.classList.remove('active');
            this.innerHTML = '<i class="far fa-heart"></i>';
            console.log('Removed from wishlist');
        } else {
            this.classList.add('active');
            this.innerHTML = '<i class="fas fa-heart"></i>';
            console.log('Added to wishlist');
        }
    });
}

// Initialize action buttons - hide since we don't have real pricing data
function initializeActionButtons() {
    const actionButtons = document.querySelector('.action-buttons');
    if (actionButtons) {
        actionButtons.style.display = 'none';
    }
}

// Initialize review filters - not needed since reviews section is hidden
function initializeReviewFilters() {
    // Reviews section is hidden since Open Library doesn't provide reviews
}

// Initialize book detail sections - not needed since sections are static
function initializeBookDetailSections() {
    // Detail sections are populated by loadBookDetailSections function
}



// Initialize mobile menu functionality
function initializeMobileMenu() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileMenuToggle && navMenu) {
        const handleClick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Mobile menu toggle clicked (details page)');
            navMenu.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
            const isActive = navMenu.classList.contains('active');
            mobileMenuToggle.setAttribute('aria-label', isActive ? 'Close mobile menu' : 'Open mobile menu');
            console.log('Menu state (details page):', isActive ? 'opened' : 'closed');
        };
        
        mobileMenuToggle.addEventListener('click', handleClick, false);
        mobileMenuToggle.addEventListener('touchstart', handleClick, false);
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!navMenu.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                navMenu.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
                mobileMenuToggle.setAttribute('aria-label', 'Open mobile menu');
            }
        });
    } else {
        console.error('Mobile menu elements not found (details page):', { mobileMenuToggle, navMenu });
    }
}

// Initialize dropdown functionality
function initializeDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown');
    const subDropdowns = document.querySelectorAll('.sub-dropdown');
    
    // Initialize main dropdowns
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        const handleClick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Dropdown toggle clicked (details page)');
            
            dropdowns.forEach(other => {
                if (other !== dropdown) {
                    other.classList.remove('active');
                }
            });
            
            dropdown.classList.toggle('active');
            console.log('Dropdown state (details page):', dropdown.classList.contains('active') ? 'opened' : 'closed');
        };
        
        toggle.addEventListener('click', handleClick, false);
        toggle.addEventListener('touchstart', handleClick, false);
    });
    
    // Initialize filter toggles
    const filterToggles = document.querySelectorAll('.filter-toggle');
    filterToggles.forEach(toggle => {
        const handleClick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Filter toggle clicked (details page)');
            
            const filterType = this.getAttribute('data-filter');
            const isActive = this.classList.contains('active');
            
            // Close all other filter options
            document.querySelectorAll('.filter-options').forEach(options => {
                options.classList.remove('active');
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
                } else {
                    this.classList.add('active');
                    filterOptions.classList.add('active');
                }
            }
            
            console.log('Filter toggle state (details page):', this.classList.contains('active') ? 'opened' : 'closed');
        };
        
        toggle.addEventListener('click', handleClick, false);
        toggle.addEventListener('touchstart', handleClick, false);
    });
}

// Initialize search functionality
function initializeSearch() {
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-btn');
    
    // Handle search button click
    searchBtn.addEventListener('click', function() {
        const query = searchInput.value.trim();
        if (query) {
            // Navigate to home page with search query
            window.location.href = `index.html?search=${encodeURIComponent(query)}`;
        }
    });
    
    // Handle Enter key in search input
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                // Navigate to home page with search query
                window.location.href = `index.html?search=${encodeURIComponent(query)}`;
            }
        }
    });
}

// Main initialization function
async function initializeBookDetails() {
    const bookKey = getBookIdFromUrl();
    
    if (!bookKey) {
        // Redirect to home page if no book ID provided
        window.location.href = 'index.html';
        return;
    }
    
    try {
        // Show loading screen
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.remove('hidden');
        
        // Load book details
        const { bookData, ratings, editionData, authorData } = await loadBookDetails(bookKey);
        updateBookDetails(bookData, ratings, editionData, authorData);
        
        // Load reviews and book detail sections
        await Promise.all([
            loadReviews(bookKey),
            loadBookDetailSections(bookKey, bookData)
        ]);
        
        // Initialize interactions
        initializeWishlist();
        initializeActionButtons();
        initializeReviewFilters();
        initializeBookDetailSections();
        initializeSearch();
        initializeMobileMenu();
        initializeDropdowns();
        
        // Hide loading screen
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
        }, 500); // Small delay for smooth transition
        
    } catch (error) {
        console.error('Error initializing book details:', error);
        document.getElementById('book-title').textContent = 'Error loading book';
        document.getElementById('description').innerHTML = '<p class="error-message">Unable to load book details. Please try again later.</p>';
        
        // Hide loading screen even on error
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.add('hidden');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Prevent conflicts with main script.js
    if (window.location.pathname.includes('book-details.html')) {
        initializeBookDetails();
    }
}); 