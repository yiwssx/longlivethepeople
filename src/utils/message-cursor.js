const mongoose = require('mongoose');

const encodeCursor = ({ createdAt, id }) => Buffer.from(JSON.stringify({
    createdAt: new Date(createdAt).toISOString(),
    id: String(id),
}), 'utf8').toString('base64url');

const decodeCursor = (value) => {
    if (typeof value !== 'string' || value.length === 0 || value.length > 512) {
        return null;
    }

    try {
        const decoded = Buffer.from(value, 'base64url').toString('utf8');
        const parsed = JSON.parse(decoded);
        const createdAt = new Date(parsed.createdAt);

        if (
            Number.isNaN(createdAt.getTime())
            || typeof parsed.id !== 'string'
            || !mongoose.Types.ObjectId.isValid(parsed.id)
        ) {
            return null;
        }

        return {
            createdAt,
            id: new mongoose.Types.ObjectId(parsed.id),
        };
    } catch (error) {
        return null;
    }
};

module.exports = { encodeCursor, decodeCursor };
