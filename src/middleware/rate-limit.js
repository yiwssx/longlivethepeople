const DEFAULT_MAX_BUCKETS = 10_000;

const createRateLimit = ({
    windowMs,
    max,
    maxBuckets = DEFAULT_MAX_BUCKETS,
    keyFn = (req) => req.ip || req.socket?.remoteAddress || 'unknown',
    onLimit,
}) => {
    const buckets = new Map();

    const createBucket = (now) => ({
        count: 0,
        resetAt: now + windowMs,
    });

    const evictOldestBucket = () => {
        if (buckets.size < maxBuckets) {
            return;
        }

        const oldestKey = buckets.keys().next().value;
        if (oldestKey !== undefined) {
            buckets.delete(oldestKey);
        }
    };

    return (req, res, next) => {
        const now = Date.now();
        const key = String(keyFn(req));
        let bucket = buckets.get(key);

        if (!bucket || bucket.resetAt <= now) {
            if (bucket) {
                buckets.delete(key);
            }
            evictOldestBucket();
            bucket = createBucket(now);
            buckets.set(key, bucket);
        } else {
            // Refresh insertion order so the cap behaves as a simple LRU bound.
            buckets.delete(key);
            buckets.set(key, bucket);
        }

        bucket.count += 1;

        res.setHeader('RateLimit-Limit', String(max));
        res.setHeader('RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
        res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

        if (bucket.count > max) {
            const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
            res.setHeader('Retry-After', String(retryAfter));

            if (typeof onLimit === 'function') {
                return onLimit(req, res, retryAfter);
            }
            return res.sendStatus(429);
        }

        return next();
    };
};

module.exports = { createRateLimit };
