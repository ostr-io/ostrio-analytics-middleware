# Publishing

Package name is scoped: `@ostrio/analytics-middleware`. Scoped packages default to restricted access on npm; `publishConfig.access` must stay `public`.

Publisher must be a member of the `@ostrio` npm organization with publish permission on this package.

```json
"name": "@ostrio/analytics-middleware",
"publishConfig": {
  "access": "public",
  "registry": "https://registry.npmjs.org/"
}
```

Release checks:

```bash
npm ci
npm run build
npm run lint
npm test
npm run test:exports
npm run test:types
npm pack --dry-run
npm publish
```

Inspect dry-run output. It should contain `dist`, root client shims, `skills`, `README.md`, `LICENSE`, and `package.json`. It should exclude tests, docs, source maps, configs, and development directories.

Before publish, verify `npm whoami` is an `@ostrio` member, bump version, and inspect package metadata with `npm pkg get name version publishConfig repository exports`.
