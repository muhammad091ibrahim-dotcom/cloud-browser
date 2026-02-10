import express from 'express';
import puppeteer from 'puppeteer-core';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const BROWSERLESS_TOKEN = 'YOUR_API_TOKEN';
let activeBrowser = null; // Variable to track the current session

app.get('/get-browser-session', async (req, res) => {
    try {
        // Close any existing browser to save credits before starting a new one
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
        console.error(error);
        res.status(500).json({ error: 'Failed to start session' });
    }
});

// Endpoint to manually kill the session
app.post('/kill-session', async (req, res) => {
    if (activeBrowser) {
        await activeBrowser.close();
        activeBrowser = null;
        return res.json({ status: 'Session terminated' });
    }
    res.json({ status: 'No active session' });
});

app.listen(3000, () => console.log('Server: http://localhost:3000'));
