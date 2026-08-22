import { spawn } from 'node:child_process';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { chromium } from '@playwright/test';

const DEV_URL = 'http://127.0.0.1:5173';
const STARTUP_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 250;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const stopProcessTree = async (child) => {
  if (!child || child.exitCode !== null) return;

  if (process.platform === 'win32') {
    child.kill('SIGTERM');
  } else if (child.pid) {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      child.kill('SIGTERM');
    }
  }

  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    sleep(5_000),
  ]);
};

const waitForDevServer = async (child, output) => {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`npm run dev exited before Vite became ready (exit ${child.exitCode}).\n${output.join('')}`);
    }

    try {
      const response = await fetch(DEV_URL, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch {
      // Startup is still in progress.
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting for ${DEV_URL}.\n${output.join('')}`);
};

const waitForSocketConnectionLog = async (output) => {
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    if (output.some((chunk) => chunk.includes('"event":"socket_connected"'))) return;
    await sleep(100);
  }

  throw new Error(`Socket.IO did not connect through the Vite proxy.\n${output.join('')}`);
};

let mongo;
let devProcess;
let browser;

try {
  mongo = await MongoMemoryServer.create();
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const output = [];

  devProcess = spawn(npmCommand, ['run', 'dev'], {
    cwd: process.cwd(),
    detached: process.platform !== 'win32',
    env: {
      ...process.env,
      MONGODB_URI: mongo.getUri(),
      DEV_SERVER_READY_TIMEOUT_MS: '20000',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  devProcess.stdout.on('data', (chunk) => output.push(chunk.toString()));
  devProcess.stderr.on('data', (chunk) => output.push(chunk.toString()));

  await waitForDevServer(devProcess, output);

  browser = await chromium.launch();
  const page = await browser.newPage();
  const browserErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => {
    if (request.url().includes('/socket.io')) {
      browserErrors.push(`requestfailed: ${request.url()} ${request.failure()?.errorText || ''}`.trim());
    }
  });

  await page.goto(`${DEV_URL}/memorial`, { waitUntil: 'networkidle' });
  await page.locator('#message-form').waitFor({ state: 'visible' });
  await waitForSocketConnectionLog(output);

  const apiResponse = await page.request.get(`${DEV_URL}/api/v1/messages?limit=1`);
  if (!apiResponse.ok()) {
    throw new Error(`Vite API proxy returned HTTP ${apiResponse.status()}.`);
  }

  await sleep(500);

  const proxyErrors = output.filter((chunk) => /http proxy error|ECONNREFUSED/i.test(chunk));
  if (browserErrors.length > 0 || proxyErrors.length > 0) {
    throw new Error([
      'Development runtime emitted unexpected proxy/socket errors.',
      ...browserErrors,
      ...proxyErrors,
      output.join(''),
    ].join('\n'));
  }

  console.log('Development runtime smoke test passed.');
} finally {
  if (browser) await browser.close();
  await stopProcessTree(devProcess);
  if (mongo) await mongo.stop();
}
