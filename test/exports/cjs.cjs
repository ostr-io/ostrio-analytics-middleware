const assert = require('node:assert/strict');
const { OstrioAnalyticsMiddleware } = require('../../dist/index.cjs');
assert.equal(typeof OstrioAnalyticsMiddleware, 'function');
