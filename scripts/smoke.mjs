import { getJSON } from '../src/utils/http/index.js';

(async () => {
  try {
    const data = await getJSON('https://api.github.com/repos/nodejs/node');
    console.log(`✅ Node.js repo stars: ${data.stargazers_count}`);
  } catch (e) {
    console.error('❌ Smoke test failed:', e.message);
    process.exitCode = 1;
  }
})();
