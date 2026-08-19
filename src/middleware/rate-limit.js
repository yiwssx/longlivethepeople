const DEFAULT_MAX_BUCKETS = 10_000;

const createRateLimit = ({ windowMs, max, maxBuckets = DEFAULT_MAX_BUCKETS }) => {
    const buckets = new Map();

    const pruneBuckets = (now) => {
        for (const [key, bucket] of buckets) {
            if (bucket.resetAt <= now) {
                buckets.delete(key);
            }
        }

        while (buckets.size >= maxBuckets) {
            const oldestKey = buckets.keys().next().value;
            if (oldestKey === undefined) {
                break;
            }
            buckets.delete(oldestKey);
        }
    };

    return (req, res, next) => {
        const now = Date.now();
        const key = req.ip || req.socket?.remoteAddress || 'unknown';
        let bucket = buckets.get(key);

        if (!bucket || bucket.resetAt <= now) {
            if (buckets.size >= maxBuckets) {
                pruneBuckets(now);
            }

            bucket = { count: 0, resetAt: now + windowMs };
            buckets.set(key, bucket);
        }

        bucket.count += 1;

        res.setHeader('RateLimit-Limit', String(max));
        res.setHeader('RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
        res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

        if (bucket.count > max) {
            res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
            return res.sendStatus(429);
        }

        return next();
    };
};

module.exports = { createRateLimit };
