import express from 'express';
import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const BROWSERLESS_TOKEN = '2TPhAojC376ZCE40f72193441100febbbcb7e62456e0d5a69';

app.use(express.static('public')); // This serves your frontend
app.use(express.json());

let activeBrowser = null;

app.get('/api/session', async (req, res) => {
    try {
        if (activeBrowser) await activeBrowser.close();

        activeBrowser = await puppeteer.connect({
            browserWSEndpoint: `wss://production-sfo.browserless.io?token=${BROWSERLESS_TOKEN}`
        });

        const page = await activeBrowser.newPage();
        const cdp = await page.target().createCDPSession();

        const { liveURL } = await cdp.send('Browserless.liveURL', {
            showBrowserInterface: true,
            timeout: 600000 
        });

        res.json({ url: liveURL });
    } catch (error) {
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
app.listen(PORT, () => console.log(`App running at http://localhost:${PORT}`));
