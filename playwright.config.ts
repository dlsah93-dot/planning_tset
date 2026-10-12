import { defineConfig } from '@playwright/test';
process.env.PLAYWRIGHT_BROWSERS_PATH = new URL('./.playwright',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1');
export default defineConfig({ testDir:'tests/e2e', fullyParallel:false, workers:1, use:{baseURL:'http://127.0.0.1:5173',browserName:'chromium',viewport:{width:1440,height:1000}}, webServer:{command:'npm run dev',url:'http://127.0.0.1:5173',reuseExistingServer:true}, reporter:'list' });
