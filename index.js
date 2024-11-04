const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');
const readline = require('readline');
const app = express();
const port = 3000;

const DEV_DEPLOYMENT_ID = 'AKfycbygH_PbDQMqhZOyrPdN4XoEtOpZstv5NI16O85AQHE';
const DEV_ENDPOINT_URL = `https://script.google.com/macros/s/${DEV_DEPLOYMENT_ID}/dev`;

let sessionCookies = null;

app.use(express.json());

async function authenticateAndCaptureCookies() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(DEV_ENDPOINT_URL, { waitUntil: 'networkidle2' });

  console.log("Please complete the login process in the browser...");
  console.log("Press Enter to continue immediately or wait 60 seconds.");

  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log("Timeout reached. Continuing...");
      resolve();
    }, 60000);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.on('line', () => {
      clearTimeout(timeout);
      console.log("Enter key pressed. Continuing...");
      rl.close();
      resolve();
    });
  });

  sessionCookies = await page.cookies();
  await browser.close();
  console.log("Authentication complete, cookies saved.");
}

// Handle GET requests to /proxy
app.get('/proxy', async (req, res) => {
  try {
    if (!sessionCookies) {
      console.log("No valid session, starting authentication...");
      await authenticateAndCaptureCookies();
    }

    // Create cookie string for Google request
    const cookieString = sessionCookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

    // Forward the GET request to Google with only the Cookie header
    const response = await axios.get(DEV_ENDPOINT_URL, {
      headers: {
        'Cookie': cookieString,
      }
    });

    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('Error forwarding GET request:', error);
    sessionCookies = null;
    res.status(500).send('Error forwarding GET request');
  }
});

// Handle POST requests to /proxy
app.post('/proxy', async (req, res) => {
  try {
    if (!sessionCookies) {
      console.log("No valid session, starting authentication...");
      await authenticateAndCaptureCookies();
    }

    // Create cookie string for Google request
    const cookieString = sessionCookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

    // Forward the POST request to Google with only the Cookie header
    const response = await axios.post(DEV_ENDPOINT_URL, req.body, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieString,
      }
    });

    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('Error forwarding POST request:', error);
    sessionCookies = null;
    res.status(500).send('Error forwarding POST request');
  }
});

app.listen(port, () => {
  console.log(`Proxy server running on http://localhost:${port}`);
});
