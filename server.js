import express from 'express';
import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Your API Token is now set
const BROWSERLESS_TOKEN = '2TPhAojC376ZCE40f72193441100febbbcb7e62456e0d5a69'; 

app.use(express.static('public')); 
app.use(express.json());

let activeBrowser = null;

app.get('/api/session', async (req, res) => {
    // Grabs the URL from the search bar variable, defaults to Google
    const targetUrl = req.query.url || 'https://www.google.com';

    try {
        // Kill previous session to save your credits
        if (activeBrowser) await activeBrowser.close();

        activeBrowser = await puppeteer.connect({
            browserWSEndpoint: `wss://production-sfo.browserless.io?token=${BROWSERLESS_TOKEN}`
        });

        const page = await activeBrowser.newPage();
        
        // Tells the cloud browser where to go first
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

        const cdp = await page.target().createCDPSession();
        const { liveURL } = await cdp.send('Browserless.liveURL', {
            showBrowserInterface: true, // Shows the remote browser's tabs/address bar
            timeout: 600000 // 10 minute session limit
        });

        res.json({ url: liveURL });
    } catch (error) {
        console.error("Browserless Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/kill', async (req, res) => {
    if (activeBrowser) {
        await activeBrowser.close();
        activeBrowser = null;
    }
    res.json({ status: 'closed' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server is live!`);
    console.log(`👉 Open http://localhost:${PORT} in your browser.`);
});
