module.exports = {
    testDir: './tests/e2e',
    timeout: 30_000,
    fullyParallel: false,
    workers: 1,
    retries: 0,
    reporter: 'line',
    use: {
        headless: true,
        trace: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { browserName: 'chromium' },
        },
    ],
};
