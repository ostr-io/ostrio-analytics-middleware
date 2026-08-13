import assert from 'node:assert/strict';
import { OstrioAnalyticsMiddleware } from '@ostrio/analytics-middleware';
import { createTracker, Transport } from '@ostrio/analytics-middleware/client';
assert.equal(typeof OstrioAnalyticsMiddleware, 'function');
assert.equal(typeof createTracker, 'function');
assert.equal(typeof Transport.Fetch, 'string');
