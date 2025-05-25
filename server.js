const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const cron = require('node-cron');
const fs = require('fs');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3010;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Store scraped data
let stockData = {
  gear: [],
  seeds: [],
  eggs: [],
  lastUpdated: ''
};

// Store weather data
let weatherData = {
  icon: '☀️',
  status: 'Clear',
  description: 'Perfect weather for gardening!',
  lastUpdated: '',
};

// Track when all data was last fetched
let lastFetchedTimestamp = '';

// Variable to track consecutive unchanged scrapes
let unchangedScrapeCount = 0;
const MAX_IMMEDIATE_RETRIES = 15;

// Function to compare data objects to check if they're the same
function isDataUnchanged(oldData, newData) {
  // Compare item counts in each category
  if (oldData.gear.length !== newData.gear.length ||
      oldData.seeds.length !== newData.seeds.length ||
      oldData.eggs.length !== newData.eggs.length) {
    return false;
  }
  
  // Check if any quantities have changed in gear items
  for (let i = 0; i < oldData.gear.length; i++) {
    if (oldData.gear[i].quantity !== newData.gear[i].quantity) {
      return false;
    }
  }
  
  // Check if any quantities have changed in seeds items
  for (let i = 0; i < oldData.seeds.length; i++) {
    if (oldData.seeds[i].quantity !== newData.seeds[i].quantity) {
      return false;
    }
  }
  
  // Check if any quantities have changed in eggs items
  for (let i = 0; i < oldData.eggs.length; i++) {
    if (oldData.eggs[i].quantity !== newData.eggs[i].quantity) {
      return false;
    }
  }
  
  // If we got here, the data hasn't changed
  return true;
}

// Function to scrape using Puppeteer (handles client-side rendering)
async function scrapePuppeteer() {
  let browser = null;
  try {
    console.log('Launching Puppeteer...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({ width: 1280, height: 800 });
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('Navigating to growagardenstock.com...');
    await page.goto('https://growagardenstock.com/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for content to load - look for stock items
    console.log('Waiting for content to load...');
    await page.waitForSelector('.grid-cols-1.md\\:grid-cols-3', { timeout: 15000 })
      .catch(() => console.log('Timeout waiting for grid layout, proceeding anyway'));
    
    // Add a delay to ensure dynamic content is loaded - using setTimeout instead of waitForTimeout
    console.log('Waiting for 5 seconds to ensure content loads...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if we need to wait longer (if there are loading indicators)
    const loadingIndicators = await page.$$eval('p', elements => 
      elements.filter(el => el.textContent.includes('Loading')).length
    );
    
    if (loadingIndicators > 0) {
      console.log(`Found ${loadingIndicators} loading indicators, waiting longer...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'screenshot.png' });
    console.log('Saved screenshot to screenshot.png');
    
    // Extract data from the rendered page
    console.log('Extracting data from rendered page...');
    const result = await page.evaluate(() => {
      const data = {
        gear: [],
        seeds: [],
        eggs: [],
        lastUpdated: '',
        weather: {
          icon: '',
          status: '',
          description: '',
          lastUpdated: ''
        }
      };
      
      // Find the last updated text
      const lastUpdatedElement = document.querySelector('p.text-xs.text-emerald-200');
      if (lastUpdatedElement) {
        data.lastUpdated = lastUpdatedElement.textContent.trim();
      } else {
        data.lastUpdated = 'Last updated: ' + new Date().toLocaleString();
      }
      
      // Find all stock sections
      const sections = document.querySelectorAll('.flex.flex-col.space-y-4');
      
      sections.forEach(section => {
        const titleElement = section.querySelector('h3');
        if (!titleElement) return;
        
        const title = titleElement.textContent.trim().toUpperCase();
        const items = [];
        
        // Find all list items
        const listItems = section.querySelectorAll('li');
        
        listItems.forEach(item => {
          const emojiSpan = item.querySelector('span.text-2xl');
          const nameSpan = item.querySelector('span.text-base');
          const quantitySpan = item.querySelector('span.ml-auto');
          
          if (nameSpan && quantitySpan) {
            const name = nameSpan.textContent.trim();
            const quantity = quantitySpan.textContent.trim();
            const emoji = emojiSpan ? emojiSpan.textContent.trim() : '';
            
            items.push({ name, quantity, emoji });
          }
        });
        
        // Assign items to the appropriate category
        if (title.includes('GEAR')) {
          data.gear = items;
        } else if (title.includes('SEEDS')) {
          data.seeds = items;
        } else if (title.includes('EGG')) {
          data.eggs = items;
        }
      });

      // Extract weather data
      const weatherSection = document.querySelector('section .bg-white\\/10');
      if (weatherSection) {
        const weatherIcon = weatherSection.querySelector('.text-6xl');
        const weatherStatus = weatherSection.querySelector('.text-2xl, .text-3xl');
        const weatherUpdated = weatherSection.querySelector('.text-xs.text-white\\/70');
        const weatherDescription = weatherSection.querySelector('.text-white\\/80.text-sm');

        if (weatherIcon) data.weather.icon = weatherIcon.textContent.trim();
        if (weatherStatus) data.weather.status = weatherStatus.textContent.trim();
        if (weatherUpdated) data.weather.lastUpdated = weatherUpdated.textContent.trim();
        if (weatherDescription) data.weather.description = weatherDescription.textContent.trim();
      }
      
      return data;
    });
    
    console.log('Data extracted from Puppeteer:', result);
    
    // Check if we got any items
    if (result.gear.length === 0 && result.seeds.length === 0 && result.eggs.length === 0) {
      console.log('No items found in Puppeteer scrape');
    }
    
    return result;
    
  } catch (error) {
    console.error('Error in Puppeteer scraping:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
  }
}

// Function to scrape the website
async function scrapeGardenStock(forceRefresh = false) {
  try {
    console.log('Starting scrape process...');
    
    // Use Puppeteer for scraping since the site uses client-side rendering
    const puppeteerData = await scrapePuppeteer();
    
    // Check if the data is empty
    if (puppeteerData.gear.length === 0 && puppeteerData.seeds.length === 0 && puppeteerData.eggs.length === 0) {
      console.log('No items found in Puppeteer scrape');
      return stockData; // Return existing data
    }
    
    // Check if the data has changed
    const dataUnchanged = isDataUnchanged(stockData, puppeteerData);
    
    if (dataUnchanged && !forceRefresh) {
      console.log('Data unchanged from previous scrape');
      unchangedScrapeCount++;
    } else {
      // Data has changed, update the stock data
      stockData = puppeteerData;
      
      // Update weather data if available
      if (puppeteerData.weather && puppeteerData.weather.status) {
        weatherData = puppeteerData.weather;
        console.log('Weather data updated:', weatherData);
      }
      
      // Update the timestamp for the entire fetch operation
      lastFetchedTimestamp = new Date().toISOString();
      console.log('Global fetch timestamp updated:', lastFetchedTimestamp);
      
      unchangedScrapeCount = 0;
      console.log('Data updated successfully from website:', stockData);
    }
    
    return stockData;
    
  } catch (error) {
    console.error('Error scraping data:', error.message);
    
    // Keep the previous data if available
    if (stockData.gear.length === 0 && stockData.seeds.length === 0 && stockData.eggs.length === 0) {
      // Only set error message if we have no data at all
      stockData.error = `Failed to fetch data: ${error.message}. Retrying in 5 minutes.`;
      stockData.lastUpdated = 'Last fetch failed: ' + new Date().toLocaleString();
    }
    
    throw error; // Rethrow the error for the API endpoint to handle
  }
}

// Function to retry scraping until data changes or max retries reached
async function retryUntilDataChanges() {
  if (unchangedScrapeCount > 0 && unchangedScrapeCount <= MAX_IMMEDIATE_RETRIES) {
    console.log(`Data unchanged for ${unchangedScrapeCount} scrapes. Retrying immediately...`);
    
    // Wait a bit before retrying to avoid overloading the server
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay (reduced from 30s)
    
    try {
      await scrapeGardenStock();
      
      // If data is still unchanged after this retry, try again
      if (unchangedScrapeCount > 0 && unchangedScrapeCount <= MAX_IMMEDIATE_RETRIES) {
        retryUntilDataChanges();
      }
    } catch (error) {
      console.error('Retry scrape failed:', error.message);
    }
  }
}

// API endpoint to get the stock data
app.get('/api/stock', (req, res) => {
  // Calculate time until next 5-minute interval
  const now = new Date();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  
  // Calculate next 5-minute mark (0, 5, 10, 15, etc.)
  const nextIntervalMinutes = Math.ceil(minutes / 5) * 5;
  
  // Calculate seconds until next interval
  let secondsUntilRefresh = ((nextIntervalMinutes - minutes) * 60) - seconds;
  
  // If we're at the end of the hour and next interval would be 60, set to 0 of next hour
  if (nextIntervalMinutes === 60) {
    secondsUntilRefresh = (60 - minutes) * 60 - seconds;
  }
  
  // Add the next refresh time to the response
  const responseData = {
    ...stockData,
    nextRefreshIn: secondsUntilRefresh
  };
  
  res.json(responseData);
});

// API endpoint to get weather data
app.get('/api/weather', (req, res) => {
  res.json(weatherData);
});

// New unified API endpoint to get all data
app.get('/api', (req, res) => {
  // Calculate time until next 5-minute interval
  const now = new Date();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  
  // Calculate next 5-minute mark (0, 5, 10, 15, etc.)
  const nextIntervalMinutes = Math.ceil(minutes / 5) * 5;
  
  // Calculate seconds until next interval
  let secondsUntilRefresh = ((nextIntervalMinutes - minutes) * 60) - seconds;
  
  // If we're at the end of the hour and next interval would be 60, set to 0 of next hour
  if (nextIntervalMinutes === 60) {
    secondsUntilRefresh = (60 - minutes) * 60 - seconds;
  }
  
  // If lastFetchedTimestamp hasn't been set yet, set it now
  if (!lastFetchedTimestamp) {
    lastFetchedTimestamp = new Date().toISOString();
  }
  
  // Create unified response with all data
  const responseData = {
    lastFetched: lastFetchedTimestamp,
    nextRefreshIn: secondsUntilRefresh,
    stock: {
      ...stockData
    },
    weather: weatherData
  };
  
  res.json(responseData);
});

// Endpoint to manually trigger a refresh
app.get('/api/refresh', async (req, res) => {
  try {
    // Force refresh from the live website
    const refreshedData = await scrapeGardenStock(true);
    
    // Calculate time until next 5-minute interval
    const now = new Date();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    
    // Calculate next 5-minute mark (0, 5, 10, 15, etc.)
    const nextIntervalMinutes = Math.ceil(minutes / 5) * 5;
    
    // Calculate seconds until next interval
    let secondsUntilRefresh = ((nextIntervalMinutes - minutes) * 60) - seconds;
    
    // If we're at the end of the hour and next interval would be 60, set to 0 of next hour
    if (nextIntervalMinutes === 60) {
      secondsUntilRefresh = (60 - minutes) * 60 - seconds;
    }
    
    // If the refresh operation didn't update the timestamp, update it now
    if (!lastFetchedTimestamp) {
      lastFetchedTimestamp = new Date().toISOString();
    }
    
    // Add the next refresh time to the response
    const responseData = {
      ...refreshedData,
      nextRefreshIn: secondsUntilRefresh,
      weather: weatherData,
      lastFetched: lastFetchedTimestamp
    };
    
    res.json({ 
      success: true, 
      message: 'Data refreshed successfully from live website', 
      data: responseData
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to refresh data: ' + error.message, 
      data: stockData
    });
  }
});

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Schedule scraping every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('Running scheduled scrape...');
  try {
    await scrapeGardenStock();
    console.log('Scheduled scrape completed successfully');
    
    // If data was unchanged, try again immediately
    retryUntilDataChanges();
  } catch (error) {
    console.error('Scheduled scrape failed:', error.message);
  }
});

// Initial scrape when server starts
scrapeGardenStock().then(() => {
  // Start the server after initial scrape
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(error => {
  console.error('Initial scrape failed, starting server anyway:', error.message);
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} (with initial scrape error)`);
  });
}); 