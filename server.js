import express from 'express';
import puppeteer from 'puppeteer-core';

const app = express();
const BROWSERLESS_TOKEN = '2TPhAojC376ZCE40f72193441100febbbcb7e62456e0d5a69';

// 1. FRONTEND
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cloud Browser</title>
            <style>
                body { margin: 0; background: #0f172a; color: white; font-family: sans-serif; height: 100vh; display: flex; flex-direction: column; }
                .toolbar { padding: 15px; background: #1e293b; display: flex; gap: 10px; border-bottom: 2px solid #334155; }
                input { flex: 1; padding: 10px; border-radius: 5px; background: #0f172a; color: white; border: 1px solid #475569; }
                button { padding: 10px 25px; border-radius: 5px; border: none; cursor: pointer; font-weight: bold; background: #38bdf8; color: #0f172a; }
                #browser-wrapper { flex: 1; background: #000; }
                iframe { width: 100%; height: 100%; border: none; }
                #status { padding: 5px 15px; color: #38bdf8; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="toolbar">
                <input type="text" id="url-input" value="https://google.com">
                <button onclick="launch()">Launch</button>
            </div>
            <div id="status">Ready.</div>
            <div id="browser-wrapper"><iframe id="view"></iframe></div>
            <script>
                async function launch() {
                    const status = document.getElementById('status');
                    const url = encodeURIComponent(document.getElementById('url-input').value);
                    status.innerText = "Connecting...";
                    try {
                        const response = await fetch('/api/session?url=' + url);
                        const data = await response.json();
                        if (data.url) {
                            document.getElementById('view').src = data.url;
                            status.innerText = "Browser Active";
                        } else {
                            status.innerText = "Error: " + (data.error || "No URL");
                        }
                    } catch (e) {
                        status.innerText = "Error: Connection Failed.";
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// 2. BACKEND
app.get('/api/session', async (req, res) => {
    const targetUrl = req.query.url || 'https://google.com';
    console.log(`[LOG] Starting: ${targetUrl}`);

    try {
        const browser = await puppeteer.connect({
            browserWSEndpoint: `wss://production-sfo.browserless.io?token=${BROWSERLESS_TOKEN}`
        });

        const page = await browser.newPage();
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

        const client = await page.target().createCDPSession();
        const result = await client.send('Browserless.liveURL', {
            showBrowserInterface: true,
            interactable: true
        });

        if (result.liveURL) {
            console.log(`[SUCCESS] URL: ${result.liveURL}`);
            res.json({ url: result.liveURL });
        } else {
            console.log("[FAIL] liveURL was null");
            res.json({ error: "Browserless returned null" });
        }
    } catch (err) {
        console.error("[ERROR]", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 3. START
app.listen(3000, '0.0.0.0', () => {
    console.log("SERVER RUNNING ON http://127.0.0.1:3000");
});
