import { request } from './request.js';

export async function getJSON(url, options = {}) {
  const res = await request(url, options);
  return res.json();
}
