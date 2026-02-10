import express from 'express';
import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const BROWSERLESS_TOKEN = '2TPhAojC376ZCE40f72193441100febbbcb7e62456e0d5a69';

// Properly serve the public folder
app.use(express.static('public'));

app.get('/api/session', async (req, res) => {
    const targetUrl = req.query.url || 'https://google.com';
    try {
        const browser = await puppeteer.connect({
            browserWSEndpoint: `wss://production-sfo.browserless.io?token=${BROWSERLESS_TOKEN}`
        });
        const page = await browser.newPage();
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
        
        await new Promise(r => setTimeout(r, 2000)); // Wait for proxy

        const client = await page.target().createCDPSession();
        const result = await client.send('Browserless.liveURL', { 
            showBrowserInterface: true, 
            interactable: true 
        });

        res.json({ url: result.liveURL });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, '0.0.0.0', () => console.log("SERVER READY: http://127.0.0.1:3000"));
