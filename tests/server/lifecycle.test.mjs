import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongo;
let runtime;

describe('server lifecycle', () => {
  before(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri();
    process.env.NODE_ENV = 'test';
    process.env.PORT = '0';
    const { startServer } = await import('../../apps/server/src/main.ts');
    runtime = await startServer({ port: 0, registerSignalHandlers: false });
  });

  after(async () => {
    if (runtime) await runtime.shutdown('test');
    if (mongo) await mongo.stop();
  });

  it('listens on an ephemeral port after MongoDB is ready', () => {
    assert.equal(runtime.server.listening, true);
    assert.equal(typeof runtime.port, 'number');
    assert.ok(runtime.port > 0);
  });
});
