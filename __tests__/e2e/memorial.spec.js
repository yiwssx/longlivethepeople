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
    const { startServer } = require('../../src/server');
    // eslint-disable-next-line global-require
    Message = require('../../src/models/message.model');

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

test('visitor can enter the archive and publish a realtime message', async ({ page }) => {
    await page.goto(baseUrl);

    await expect(page.getByRole('heading', { level: 1 })).toContainText('พื้นที่เพื่อระลึกถึงชีวิต');
    await page.getByRole('link', { name: /ร่วมแสดงความเสียใจ/ }).click();
    await expect(page).toHaveURL(`${baseUrl}/memorial`);

    await page.getByLabel('ข้อความไว้อาลัย').fill('ข้อความจาก Playwright');
    await page.getByLabel('นามแฝง').fill('Archive Tester');
    await page.getByLabel('สังกัด').fill('Long Live the People');
    await page.getByRole('button', { name: 'ส่งข้อความไว้อาลัย' }).click();

    const card = page.locator('.message-card').filter({ hasText: 'ข้อความจาก Playwright' });
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Archive Tester');
    await expect(card.locator('time')).not.toHaveText('');
    await expect(page.locator('#form-status')).toContainText('ส่งข้อความเรียบร้อยแล้ว');
});

test('cursor pagination loads older messages without duplicates', async ({ page }) => {
    const baseTime = Date.parse('2026-01-01T00:00:00.000Z');
    const rows = Array.from({ length: 25 }, (_, index) => ({
        codename: `person-${index + 1}`,
        affiliation: 'archive',
        message: `message-${index + 1}`,
        createdAt: new Date(baseTime + index * 1000),
        updatedAt: new Date(baseTime + index * 1000),
        status: 'published',
    }));
    await Message.create(rows);

    await page.goto(`${baseUrl}/memorial`);
    await expect(page.locator('.message-card')).toHaveCount(20);

    await page.getByRole('button', { name: 'อ่านข้อความก่อนหน้า' }).click();
    await expect(page.locator('.message-card')).toHaveCount(25);

    const ids = await page.locator('.message-card').evaluateAll((cards) => cards.map((card) => card.dataset.messageId));
    expect(new Set(ids).size).toBe(25);
});

test('landing and memorial remain usable on a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(baseUrl);

    const enter = page.getByRole('link', { name: /ร่วมแสดงความเสียใจ/ });
    await expect(enter).toBeVisible();
    await enter.click();

    await expect(page.getByLabel('ข้อความไว้อาลัย')).toBeVisible();
    await expect(page.getByRole('button', { name: 'ส่งข้อความไว้อาลัย' })).toBeVisible();
});
