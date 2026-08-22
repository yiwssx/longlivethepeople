const target = process.env.DEV_SERVER_READY_URL || 'http://127.0.0.1:3000/readyz';
const timeoutMs = Number.parseInt(process.env.DEV_SERVER_READY_TIMEOUT_MS || '20000', 10);
const pollIntervalMs = 250;
const deadline = Date.now() + (Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 20000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

while (Date.now() < deadline) {
  try {
    const response = await fetch(target, {
      method: 'GET',
      signal: AbortSignal.timeout(1000),
    });

    if (response.ok) process.exit(0);
  } catch {
    // The backend may still be connecting to MongoDB. Keep the normal dev
    // output quiet and let the server process own startup diagnostics.
  }

  await sleep(pollIntervalMs);
}

console.error(`[dev] Backend did not become ready at ${target}.`);
console.error('[dev] Check the server output and ensure MongoDB is running or MONGODB_URI points to a reachable database.');
process.exit(1);
