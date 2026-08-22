const { test, expect } = require('@playwright/test');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;
let runtime;
let Message;
let baseUrl;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri();
    process.env.NODE_ENV = 'test';
    process.env.MESSAGE_RATE_LIMIT_MAX = '1000';
    process.env.MESSAGE_READ_RATE_LIMIT_MAX = '1000';

    // Environment must be configured before loading application modules.
    // eslint-disable-next-line global-require
    const { startServer } = require('../../apps/server/src/server');
    // eslint-disable-next-line global-require
    Message = require('../../apps/server/src/modules/messages/message.model');

    runtime = await startServer({ port: 0, registerSignalHandlers: false });
    baseUrl = `http://127.0.0.1:${runtime.port}`;
});

test.afterEach(async () => {
    await Message.deleteMany({});
});

test.afterAll(async () => {
    if (runtime) {
        await runtime.shutdown('playwright');
    }
    if (mongo) {
        await mongo.stop();
    }
});

const messageBox = (page) => page.getByRole('textbox', {
    name: 'ข้อความแสดงความไว้อาลัย',
    exact: true,
});

test('visitor can enter the archive and publish a message', async ({ page }) => {
    await page.goto(baseUrl);

    await expect(page).toHaveTitle('ระบบไว้อาลัยเหตุการณ์โควิด-19');
    await page.getByRole('link', { name: /ร่วมแสดงความเสียใจ/ }).click();
    await expect(page).toHaveURL(`${baseUrl}/memorial`);

    await messageBox(page).fill('ข้อความจาก Playwright');
    await page.getByRole('textbox', { name: 'นามแฝง', exact: true }).fill('Archive Tester');
    await page.getByRole('textbox', { name: 'สังกัด', exact: true }).fill('Long Live the People');
    await page.getByRole('button', { name: 'ไว้อาลัย', exact: true }).click();

    const card = page.locator('.message-card').filter({ hasText: 'ข้อความจาก Playwright' });
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Archive Tester::Long Live the People');
    await expect(page.getByRole('dialog')).toContainText('Success!');
    await expect(page.getByRole('dialog')).toContainText('ส่งข้อความเรียบร้อย');
});

test('Socket.IO broadcasts a committed message to another connected visitor', async ({ browser }) => {
    const context = await browser.newContext();
    const receiver = await context.newPage();
    const sender = await context.newPage();

    await receiver.goto(`${baseUrl}/memorial`);
    await sender.goto(`${baseUrl}/memorial`);

    await messageBox(sender).fill('ข้อความ realtime ข้าม browser');
    await sender.getByRole('textbox', { name: 'นามแฝง', exact: true }).fill('Realtime Sender');
    await sender.getByRole('textbox', { name: 'สังกัด', exact: true }).fill('Archive');
    await sender.getByRole('button', { name: 'ไว้อาลัย', exact: true }).click();

    const received = receiver.locator('.message-card').filter({ hasText: 'ข้อความ realtime ข้าม browser' });
    await expect(received).toHaveCount(1);
    await expect(received).toContainText('Realtime Sender::Archive');

    await context.close();
});

test('cursor pagination loads the complete archive without duplicates', async ({ page }) => {
    const baseTime = Date.parse('2026-01-01T00:00:00.000Z');
    const rows = Array.from({ length: 125 }, (_, index) => ({
        codename: `person-${index + 1}`,
        affiliation: 'archive',
        message: `message-${index + 1}`,
        createdAt: new Date(baseTime + index * 1000),
        updatedAt: new Date(baseTime + index * 1000),
        status: 'published',
    }));
    await Message.create(rows);

    await page.goto(`${baseUrl}/memorial`);
    const cards = page.locator('.message-card');
    await expect(cards).toHaveCount(50);

    await expect.poll(async () => {
        const count = await cards.count();
        if (count < 125) {
            await page.locator('#feed-sentinel').scrollIntoViewIfNeeded();
        }
        return count;
    }).toBe(125);

    const ids = await cards.evaluateAll((items) => items.map((card) => card.dataset.messageId));
    expect(new Set(ids).size).toBe(125);
});

test('landing and memorial remain usable on a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(baseUrl);

    const enter = page.getByRole('link', { name: /ร่วมแสดงความเสียใจ/ });
    await expect(enter).toBeVisible();
    await enter.click();

    await expect(messageBox(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'ไว้อาลัย', exact: true })).toBeVisible();
});
