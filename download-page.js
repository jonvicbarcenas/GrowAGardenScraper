const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function downloadPage() {
  try {
    console.log('Downloading HTML from growagardenstock.com...');
    
    // Use a more browser-like User-Agent
    const response = await axios.get('https://growagardenstock.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': 'https://www.google.com/'
      },
      timeout: 30000
    });
    
    // Save the raw HTML for inspection
    fs.writeFileSync('webpage.html', response.data);
    console.log('HTML saved to webpage.html');
    
    // Look for script tags with JSON data (often websites store data in script tags)
    const scriptRegex = /<script[^>]*>([^<]*?stock[^<]*?)<\/script>/gi;
    let match;
    let scriptNum = 0;
    
    while ((match = scriptRegex.exec(response.data)) !== null) {
      scriptNum++;
      fs.writeFileSync(`script-${scriptNum}.js`, match[1]);
      console.log(`Found script with stock data, saved to script-${scriptNum}.js`);
    }
    
    // Extract specific parts of the HTML
    const stockSectionRegex = /<(div|section)[^>]*>([\s\S]*?(?:GEAR|SEEDS|EGG)\s+STOCK[\s\S]*?)<\/(div|section)>/gi;
    let sectionNum = 0;
    
    while ((match = stockSectionRegex.exec(response.data)) !== null) {
      sectionNum++;
      fs.writeFileSync(`section-${sectionNum}.html`, match[0]);
      console.log(`Found stock section, saved to section-${sectionNum}.html`);
    }
    
    console.log('Done downloading and extracting content');
  } catch (error) {
    console.error('Error downloading page:', error.message);
  }
}

downloadPage(); 