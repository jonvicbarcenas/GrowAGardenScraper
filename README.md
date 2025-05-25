# Grow A Garden Stock Tracker

A creative and responsive web application that scrapes and displays stock information from the Grow A Garden game website. This tracker provides real-time updates on gear, seeds, and egg availability.

![Grow A Garden Stock Tracker](https://via.placeholder.com/800x400?text=Grow+A+Garden+Stock+Tracker)

## Features

- **Real-time Stock Updates**: Scrapes data from the official website and refreshes every 5 minutes
- **Beautiful UI**: Modern and responsive design with smooth animations
- **Rarity Indicators**: Special visual indicators for rare, mythical, and legendary items
- **Countdown Timer**: Shows exactly when the next refresh will occur
- **Automatic Updates**: Data refreshes without needing to reload the page

## Tech Stack

- **Node.js**: Server-side JavaScript runtime
- **Express**: Web application framework
- **Axios**: HTTP client for making requests
- **Cheerio**: Web scraping library for parsing HTML
- **Node-cron**: Task scheduler for periodic scraping

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/grow-a-garden-stock-tracker.git
   cd grow-a-garden-stock-tracker
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the server:
   ```
   npm start
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Development

To run the application in development mode with automatic restarts:

```
npm run dev
```

## How It Works

1. The server scrapes the Grow A Garden Stock website using Axios and Cheerio
2. The extracted data is stored in memory and served via a REST API
3. The frontend fetches this data and renders it in a user-friendly interface
4. A countdown timer shows when the next refresh will occur
5. The page automatically updates without requiring a reload

## Customization

You can customize the appearance by modifying the following files:

- `public/css/styles.css`: Change colors, fonts, animations, and layout
- `public/js/app.js`: Modify the behavior, data processing, and animations
- `public/index.html`: Adjust the HTML structure

## Disclaimer

This project is not affiliated with, endorsed by, or connected to Grow A Garden or Roblox. It's a fan-made tool created for educational purposes.

## License

MIT License - Feel free to use, modify, and distribute as you wish. 