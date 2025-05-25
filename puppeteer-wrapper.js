#!/usr/bin/env node

// Set Chrome path
process.env.PUPPETEER_EXECUTABLE_PATH = '/home/ds123/.cache/puppeteer/chrome/linux-136.0.7103.94/chrome-linux64/chrome';

// Set launch args for Linux compatibility
process.env.PUPPETEER_LAUNCH_ARGS = JSON.stringify([
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-extensions',
  '--no-first-run',
  '--disable-default-apps'
]);

// Launch the MCP server
require('/home/ds123/.nvm/versions/node/v20.15.0/lib/node_modules/@modelcontextprotocol/server-puppeteer/dist/index.js');
