const assert = require('node:assert/strict');
const { OstrioAnalyticsMiddleware } = require('@ostrio/analytics-middleware');
const { createTracker, Transport } = require('@ostrio/analytics-middleware/client');
assert.equal(typeof OstrioAnalyticsMiddleware, 'function');
assert.equal(typeof createTracker, 'function');
assert.equal(typeof Transport.Fetch, 'string');
