// setupProxy.js
// This file configures the Create React App dev server proxy to avoid
// the "options.allowedHosts[0] should be a non-empty string" error.
// 
// CRA automatically picks up this file and uses it instead of the "proxy" field
// in package.json. All requests to /api/* during development are forwarded to
// the backend server at http://localhost:3001.

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3001',
      changeOrigin: true,
      // Set secure to false for local development with self-signed certs
      secure: false,
    })
  );
};
