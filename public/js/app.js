document.addEventListener('DOMContentLoaded', () => {
    // Custom styling for the new Tailwind-like design
    const addCustomStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            .stock-item {
                background-color: rgba(44, 122, 78, 0.6);
                transition: all 0.3s ease;
                border: 1px solid rgba(44, 122, 78, 0.3);
            }
            
            .stock-item:hover {
                background-color: rgba(44, 122, 78, 0.8);
                transform: translateY(-2px);
            }
            
            .item-icon {
                width: 40px;
                height: 40px;
                font-size: 1.5rem;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 15px;
            }
            
            .quantity {
                background: linear-gradient(to right, #4ac784, #2c7a4e);
                border-radius: 20px;
                padding: 3px 10px;
            }
            
            /* Card header styling */
            .card-header {
                background: #2c7a4e;
                color: white;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .card-header h2 {
                background: linear-gradient(to right, #b9f6ca, #69f0ae);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                font-weight: bold;
            }
            
            /* Apply Tailwind-like container styling */
            .stock-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
            }

            .last-updated {
                font-size: 12px;
                color: #ffffff;
                opacity: 0.7;
            }

            .refresh-timer {
                font-size: 12px;
                color: #ffffff;
                opacity: 0.7;
            }
            
            .last-fetched {
                font-size: 12px;
                color: #ffffff;
                background: rgba(0, 0, 0, 0.2);
                padding: 6px 10px;
                border-radius: 15px;
                margin-right: 10px;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .last-fetched i {
                color: #4ac784;
            }

            .refresh-button {
                background: linear-gradient(to right, #4ac784, #2c7a4e);
                color: white;
                font-size: 14px;
                font-weight: bold;
                padding: 8px 12px;
                border-radius: 20px;
                border: 1px solid rgba(255, 255, 255, 0.3);
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .refresh-button:hover {
                background: linear-gradient(to right, #5bd895, #3a8b5c);
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            }
            
            .refresh-button:active {
                transform: translateY(1px);
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            }
            
            .stock-card {
                background-color: rgba(44, 122, 78, 0.7);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(44, 122, 78, 0.5);
            }
            
            /* Dark mode enhancements */
            body {
                background: linear-gradient(to bottom, #2c7a4e, #1d5837);
                min-height: 100vh;
                color: white;
            }
            
            .garden-bg {
                opacity: 0.1;
            }
        `;
        document.head.appendChild(style);
    };
    
    // Add the custom styles
    addCustomStyles();
    
    // Icons mapping for stock items - extended to support more items
    const itemIcons = {
        // Gear icons
        'Trowel': 'fa-trowel',
        'Basic Sprinkler': 'fa-shower',
        'Favorite Tool': 'fa-star',
        'Watering Can': 'fa-fill-drip',
        'Recall Wrench': 'fa-wrench',
        'Garden Shears': 'fa-scissors',
        'Premium Sprinkler': 'fa-shower',
        'Golden Trowel': 'fa-trowel',
        'Fertilizer': 'fa-prescription-bottle',
        'Plant Pot': 'fa-flowerpot',
        
        // Seeds icons
        'Carrot': 'fa-carrot',
        'Strawberry': 'fa-apple-whole',
        'Tomato': 'fa-apple-whole',
        'Orange Tulip': 'fa-seedling',
        'Blueberry': 'fa-apple-whole',
        'Wheat': 'fa-wheat-awn',
        'Corn': 'fa-wheat-awn',
        'Dragon Fruit': 'fa-fire',
        'Watermelon': 'fa-apple-whole',
        'Pumpkin': 'fa-apple-whole',
        'Sunflower': 'fa-sun',
        'Rose': 'fa-seedling',
        'Tulip': 'fa-seedling',
        'Potato': 'fa-apple-whole',
        
        // Egg icons
        'Common Egg': 'fa-egg',
        'Uncommon Egg': 'fa-egg',
        'Rare Egg': 'fa-egg',
        'Legendary Egg': 'fa-egg',
        'Divine Egg': 'fa-egg',
        'Mythical Egg': 'fa-egg'
    };
    
    // Rarity mapping for items
    const rarityMapping = {
        'Dragon Fruit': 'legendary',
        'Legendary Egg': 'legendary',
        'Divine Egg': 'divine',
        'Mythical Egg': 'mythical',
        'Rare Egg': 'rare',
        'Golden Trowel': 'legendary',
        'Premium Sprinkler': 'mythical',
        'Watering Can': 'rare',
        'Orange Tulip': 'rare',
        'Sunflower': 'rare'
    };
    
    // Elements
    const gearStockEl = document.getElementById('gearStock');
    const seedsStockEl = document.getElementById('seedsStock');
    const eggsStockEl = document.getElementById('eggsStock');
    const weatherCardEl = document.getElementById('weatherCard');
    const lastUpdatedEl = document.getElementById('lastUpdated');
    const refreshTimerEl = document.getElementById('refreshTimer');
    
    // Refresh timer variables
    let secondsUntilRefresh = 300; // 5 minutes
    let timerInterval;
    
    // Function to get stock data from API
    async function fetchStockData() {
        try {
            const response = await fetch('/api');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            
            // Update the global last fetched timestamp if available
            if (data.lastFetched) {
                updateLastFetchedTime(data.lastFetched);
            }
            
            // Update refresh timer
            if (data.nextRefreshIn) {
                secondsUntilRefresh = data.nextRefreshIn;
                resetRefreshTimer();
            }
            
            return data.stock; // Return just the stock portion for compatibility
        } catch (error) {
            console.error('Error fetching stock data:', error);
            showErrorMessage('Failed to load data. Please try again later.');
            return null;
        }
    }
    
    // Function to get weather data from API
    async function fetchWeatherData() {
        try {
            const response = await fetch('/api');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            return data.weather; // Return just the weather portion
        } catch (error) {
            console.error('Error fetching weather data:', error);
            weatherCardEl.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Failed to load weather data. Please try again later.</p>
                </div>
            `;
            return null;
        }
    }
    
    // Function to update the last fetched time
    function updateLastFetchedTime(timestamp) {
        try {
            const lastFetchedTime = new Date(timestamp);
            const formattedTime = lastFetchedTime.toLocaleString();
            const lastFetchedEl = document.getElementById('lastFetched');
            
            if (!lastFetchedEl) {
                // Create the element if it doesn't exist
                const headerInfoSection = document.querySelector('.refresh-info');
                if (headerInfoSection) {
                    const lastFetchedDiv = document.createElement('div');
                    lastFetchedDiv.id = 'lastFetched';
                    lastFetchedDiv.className = 'last-fetched';
                    lastFetchedDiv.innerHTML = `<i class="fas fa-sync"></i> All data fetched: ${formattedTime}`;
                    headerInfoSection.prepend(lastFetchedDiv);
                }
            } else {
                // Update the existing element
                lastFetchedEl.innerHTML = `<i class="fas fa-sync"></i> All data fetched: ${formattedTime}`;
            }
        } catch (error) {
            console.error('Error updating last fetched time:', error);
        }
    }
    
    // Function to manually refresh data
    async function manualRefresh() {
        // Show loading state
        const refreshButton = document.querySelector('.refresh-button');
        const originalText = refreshButton.innerHTML;
        refreshButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
        refreshButton.disabled = true;
        
        try {
            showNotification('Fetching live data from growagardenstock.com...', 'info');
            
            const response = await fetch('/api/refresh');
            if (!response.ok) {
                throw new Error('Server returned an error');
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Update the global last fetched timestamp if available
                if (result.data.lastFetched) {
                    updateLastFetchedTime(result.data.lastFetched);
                }
                
                renderStockData(result.data.stock);
                renderWeatherData(result.data.weather);
                showNotification(result.message, 'success');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
            showNotification('Failed to refresh data from live website. Using cached data.', 'error');
        } finally {
            // Restore button state
            refreshButton.innerHTML = originalText;
            refreshButton.disabled = false;
        }
    }
    
    // Function to show error message
    function showErrorMessage(message) {
        // Display error in each stock section
        [gearStockEl, seedsStockEl, eggsStockEl].forEach(el => {
            el.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>${message}</p>
                </div>
            `;
        });
    }
    
    // Function to show notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <p>${message}</p>
            <button class="close-btn"><i class="fas fa-times"></i></button>
        `;
        
        document.body.appendChild(notification);
        
        // Add click event to close button
        notification.querySelector('.close-btn').addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
    
    // Function to create a stock item element (Tailwind-like design)
    function createStockItem(item) {
        const { name, quantity, emoji } = item;
        
        const itemEl = document.createElement('div');
        itemEl.className = `stock-item`;
        
        // Add rarity classes for special items
        if (name.includes('Dragon') || name.includes('Legendary')) {
            itemEl.classList.add('legendary');
        } else if (name.includes('Divine')) {
            itemEl.classList.add('divine');
        } else if (name.includes('Mythical') || name.includes('Premium')) {
            itemEl.classList.add('mythical');
        } else if (name.includes('Rare')) {
            itemEl.classList.add('rare');
        }
        
        itemEl.innerHTML = `
            <div class="item-icon">
                ${emoji || '❓'}
            </div>
            <div class="item-details">
                <div class="item-name">${name}</div>
            </div>
            <div class="quantity">${quantity}</div>
        `;
        
        return itemEl;
    }
    
    // Function to render stock data
    function renderStockData(data) {
        // Check if we have data
        if (!data || (data.gear.length === 0 && data.seeds.length === 0 && data.eggs.length === 0)) {
            showErrorMessage('No stock data available. Please try again later.');
            return;
        }
        
        // Update last updated timestamp
        if (data.lastUpdated) {
            lastUpdatedEl.textContent = data.lastUpdated;
        }
        
        // Reset refresh timer if we have a nextRefreshIn value
        if (data.nextRefreshIn) {
            secondsUntilRefresh = data.nextRefreshIn;
            resetRefreshTimer();
        }
        
        // Clear existing content
        gearStockEl.innerHTML = '';
        seedsStockEl.innerHTML = '';
        eggsStockEl.innerHTML = '';
        
        // Render gear items
        if (data.gear && data.gear.length > 0) {
            data.gear.forEach(item => {
                const itemEl = createStockItem(item);
                gearStockEl.appendChild(itemEl);
            });
        } else {
            gearStockEl.innerHTML = '<p class="no-items">No gear items in stock</p>';
        }
        
        // Render seeds items
        if (data.seeds && data.seeds.length > 0) {
            data.seeds.forEach(item => {
                const itemEl = createStockItem(item);
                seedsStockEl.appendChild(itemEl);
            });
        } else {
            seedsStockEl.innerHTML = '<p class="no-items">No seed items in stock</p>';
        }
        
        // Render eggs items
        if (data.eggs && data.eggs.length > 0) {
            data.eggs.forEach(item => {
                const itemEl = createStockItem(item);
                eggsStockEl.appendChild(itemEl);
            });
        } else {
            eggsStockEl.innerHTML = '<p class="no-items">No egg items in stock</p>';
        }
    }
    
    // Function to render weather data
    function renderWeatherData(data) {
        if (!data || !data.status) {
            weatherCardEl.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>No weather data available</p>
                </div>
            `;
            return;
        }
        
        weatherCardEl.innerHTML = `
            <div class="weather-content">
                <div class="weather-icon">${data.icon || '☀️'}</div>
                <div class="weather-info">
                    <div class="weather-status">${data.status || 'Unknown'}</div>
                    <div class="weather-updated">${data.lastUpdated || ''}</div>
                    <div class="weather-description-header">Description</div>
                    <div class="weather-description">${data.description || 'No description available'}</div>
                </div>
            </div>
        `;
    }
    
    // Function to start the refresh timer
    function startRefreshTimer() {
        // Clear existing interval if any
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        
        // Update the timer display immediately
        updateTimerDisplay();
        
        // Set up the interval
        timerInterval = setInterval(() => {
            secondsUntilRefresh--;
            
            if (secondsUntilRefresh <= 0) {
                // Timer reached zero, refresh data
                clearInterval(timerInterval);
                loadStockData();
                loadWeatherData();
            } else {
                // Update the timer display
                updateTimerDisplay();
            }
        }, 1000);
    }
    
    // Function to reset the refresh timer
    function resetRefreshTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        startRefreshTimer();
    }
    
    // Function to update the timer display
    function updateTimerDisplay() {
        const minutes = Math.floor(secondsUntilRefresh / 60);
        const seconds = secondsUntilRefresh % 60;
        
        refreshTimerEl.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    
    // Function to load stock data
    async function loadStockData() {
        const data = await fetchStockData();
        if (data) {
            renderStockData(data);
            startRefreshTimer();
        }
    }
    
    // Function to load weather data
    async function loadWeatherData() {
        const data = await fetchWeatherData();
        if (data) {
            renderWeatherData(data);
        }
    }
    
    // Initial data load
    loadStockData();
    loadWeatherData();
    
    // Add a refresh button to the header
    const refreshInfoEl = document.querySelector('.refresh-info');
    const refreshButton = document.createElement('button');
    refreshButton.className = 'refresh-button';
    refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Now';
    refreshButton.addEventListener('click', manualRefresh);
    refreshInfoEl.appendChild(refreshButton);
    
    // Add click handler for the weather details button
    const weatherDetailsBtn = document.querySelector('.weather-details-btn');
    if (weatherDetailsBtn) {
        weatherDetailsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showNotification('Weather details page is coming soon!', 'info');
        });
    }
}); 