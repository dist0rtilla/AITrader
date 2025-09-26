const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5000';
const ADMIN_PASS = process.env.ADMIN_PASS || 'r8T4k9XzP2qLm7Uv';

async function waitForServerReady(url, timeoutMs = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const r = await fetch(url, { method: 'GET' });
            if (r.status === 200) return true;
        } catch (e) {
            // ignore
        }
        await new Promise(r => setTimeout(r, 500));
    }
    throw new Error('Timeout waiting for server ready: ' + url);
}

async function run() {
    // Wait until /login returns a 200 so Puppeteer navigation doesn't race with server reloads
    console.log('Polling', BASE + '/login', 'until 200');
    await waitForServerReady(BASE + '/login', 30000);
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'], dumpio: true });
    console.log('Launched browser, pid=', browser.process() && browser.process().pid);
    const page = await browser.newPage();
    // generous timeouts for slow dev servers; disable navigation timeout to avoid intermittent restarts
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(0);

    console.log('Opening login page');
    page.on('console', msg => console.log('PAGE_CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('PAGE_ERROR:', err && err.stack));
    page.on('requestfailed', req => console.log('REQUEST_FAILED:', req.url(), req.failure && req.failure().errorText));

    try {
        await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 0 });
        // ensure the login form is present before proceeding
        await page.waitForSelector('#username', { timeout: 10000 });
    } catch (err) {
        console.warn('Initial navigation failed or selector not found, capturing page content and retrying...', err && err.message);
        try {
            const html = await page.content();
            console.warn('Page content snapshot:', html.slice(0, 2000));
        } catch (e) {}
        await page.waitForTimeout(500);
        await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 0 });
        await page.waitForSelector('#username', { timeout: 10000 });
    }

    // Fill the form and submit
    await page.type('#username', 'admin');
    await page.type('#password', ADMIN_PASS);
    await Promise.all([
        page.click('button[type=submit]'),
        page.waitForNavigation({ waitUntil: 'domcontentloaded' })
    ]);

    console.log('After login, URL:', page.url());

    // Navigate to home if not already there
    if (!page.url().endsWith('/home')) {
        try {
            await page.goto(BASE + '/home', { waitUntil: 'domcontentloaded' });
        } catch (err) {
            console.warn('Failed to navigate to /home, continuing with current page', err && err.message);
        }
    }

    // Wait a moment for SPA to boot and for any ui_hook calls to flush
    await page.waitForTimeout(1200);

    // Grab cookies and use them to fetch /ui_events via node-fetch
    const cookies = await page.cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    console.log('Cookie header:', cookieHeader.slice(0, 120));

    const resp = await fetch(BASE + '/ui_events', {
        headers: { 'Cookie': cookieHeader }
    });
    const j = await resp.json();
    console.log('ui_events response:', JSON.stringify(j, null, 2));

    await browser.close();

    if (!j || !('events' in j)) {
        console.error('No events key in response');
        process.exit(2);
    }
    console.log('E2E completed, events count:', (j.events || []).length);
    process.exit(0);
}

run().catch(err => {
    console.error('E2E failure', err);
    process.exit(1);
});
