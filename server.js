import express from 'express';
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const BROWSERLESS_TOKEN = '2TPhAojC376ZCE40f72193441100febbbcb7e62456e0d5a69';

app.use(express.json());

// This serves the HTML file when you go to http://localhost:3000
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// The API to start the cloud browser
app.get('/api/session', async (req, res) => {
    const targetUrl = req.query.url || 'https://google.com';
    console.log(`🚀 Launching cloud browser for: ${targetUrl}`);

    try {
        const browser = await puppeteer.connect({
            browserWSEndpoint: `wss://production-sfo.browserless.io?token=${BROWSERLESS_TOKEN}`
        });

        const page = await browser.newPage();
        await page.goto(targetUrl, { waitUntil: 'networkidle2' });

        const cdp = await page.target().createCDPSession();
        const { liveURL } = await cdp.send('Browserless.liveURL', {
            showBrowserInterface: true,
            timeout: 600000
        });

        console.log("✅ Live URL ready!");
        res.json({ url: liveURL });
    } catch (err) {
        console.error("❌ Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => {
    console.log("-----------------------------------------");
    console.log("LOCAL SERVER RUNNING AT: http://localhost:3000");
    console.log("-----------------------------------------");
});
