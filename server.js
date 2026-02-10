import express from 'express';
import puppeteer from 'puppeteer-core';

const app = express();
const BROWSERLESS_TOKEN = '2TPhAojC376ZCE40f72193441100febbbcb7e62456e0d5a69';

// 1. FRONTEND: Embedded HTML to prevent path errors
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Ibrahim's Cloud Browser</title>
            <style>
                body { margin: 0; background: #0f172a; color: #f8fafc; font-family: -apple-system, system-ui, sans-serif; height: 100vh; display: flex; flex-direction: column; }
                .toolbar { padding: 12px; background: #1e293b; display: flex; gap: 10px; align-items: center; border-bottom: 1px solid #334155; }
                input { flex: 1; padding: 10px 16px; border-radius: 20px; border: 1px solid #475569; background: #0f172a; color: white; outline: none; }
                input:focus { border-color: #38bdf8; }
                button { padding: 10px 20px; border-radius: 20px; border: none; cursor: pointer; font-weight: 600; transition: 0.2s; }
                .btn-go { background: #38bdf8; color: #0f172a; }
                .btn-fs { background: #64748b; color: white; }
                .btn-stop { background: #ef4444; color: white; }
                button:hover { opacity: 0.9; transform: translateY(-1px); }
                #browser-wrapper { flex: 1; background: #000; position: relative; }
                iframe { width: 100%; height: 100%; border: none; background: white; }
                #loader { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: none; color: #38bdf8; }
            </style>
        </head>
        <body>
            <div class="toolbar">
                <input type="text" id="url-input" placeholder="Enter URL (e.g., https://google.com)" value="https://google.com">
                <button class="btn-go" onclick="launch()">Launch</button>
                <button class="btn-fs" onclick="toggleFS()">Fullscreen</button>
                <button class="btn-stop" onclick="stopSession()">Stop</button>
            </div>
            <div id="browser-wrapper">
                <div id="loader">🚀 Connecting to Cloud...</div>
                <iframe id="cloud-view" src="about:blank"></iframe>
            </div>
            <script>
                const view = document.getElementById('cloud-view');
                const loader = document.getElementById('loader');

                async function launch() {
                    const url = encodeURIComponent(document.getElementById('url-input').value);
                    loader.style.display = 'block';
                    view.style.opacity = '0.3';

                    try {
                        const res = await fetch('/api/session?url=' + url);
                        const data = await res.json();
                        if (data.url) {
                            view.src = data.url;
                            view.style.opacity = '1';
                        } else {
                            alert("Error: " + data.error);
                        }
                    } catch (e) {
                        alert("Connection to server failed. Check terminal.");
                    } finally {
                        loader.style.display = 'none';
                    }
                }

                async function stopSession() {
                    await fetch('/api/kill', { method: 'POST' });
                    view.src = "about:blank";
                }

                function toggleFS() {
                    const wrap = document.getElementById('browser-wrapper');
                    if (!document.fullscreenElement) wrap.requestFullscreen();
                    else document.exitFullscreen();
                }

                document.getElementById('url-input').addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') launch();
                });
            </script>
        </body>
        </html>
    `);
});

// 2. BACKEND: Browserless Logic
let activeBrowser = null;

app.get('/api/session', async (req, res) => {
    const targetUrl = req.query.url || 'https://www.google.com';
    console.log(`[REQUEST] Launching session for: ${targetUrl}`);

    try {
        if (activeBrowser) {
            console.log("[INFO] Closing previous session...");
            await activeBrowser.close().catch(() => {});
        }

        activeBrowser = await puppeteer.connect({
            browserWSEndpoint: `wss://production-sfo.browserless.io?token=${BROWSERLESS_TOKEN}`
        });

        const page = await activeBrowser.newPage();
        
        // Basic timeout settings to prevent hanging
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        const cdp = await page.target().createCDPSession();
        const { liveURL } = await cdp.send('Browserless.liveURL', {
            showBrowserInterface: true,
            timeout: 600000 // 10 minutes
        });

        console.log(`[SUCCESS] Session live at: ${liveURL}`);
        res.json({ url: liveURL });
    } catch (error) {
        console.error("[ERROR]", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/kill', async (req, res) => {
    if (activeBrowser) {
        await activeBrowser.close().catch(() => {});
        activeBrowser = null;
        console.log("[INFO] Session stopped by user.");
    }
    res.json({ status: 'closed' });
});

// 3. LISTEN: Forced IPv4 Binding
const PORT = 3000;
const HOST = '0.0.0.0'; // Forces IPv4 instead of IPv6 :::3000

app.listen(PORT, HOST, () => {
    console.log(`
    =============================================
    🚀 CLOUD BROWSER SERVER IS LIVE
    ---------------------------------------------
    LOCAL ACCESS: http://127.0.0.1:${PORT}
    NETWORK ACCESS: http://localhost:${PORT}
    =============================================
    `);
});
