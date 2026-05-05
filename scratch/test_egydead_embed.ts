import fs from 'fs';

const scraperKey = process.env.SCRAPERAPI_KEY;
if (!scraperKey) {
  throw new Error('SCRAPERAPI_KEY is required');
}

const url = "https://stmruby.com/embed-dbxul7sofaja.html";

async function proxiedFetch(url) {
  const targetUrl = new URL('http://api.scraperapi.com/');
  targetUrl.searchParams.append('api_key', scraperKey);
  targetUrl.searchParams.append('url', url);
  return fetch(targetUrl.toString());
}

async function run() {
  console.log("Fetching embed...", url);
  const res = await proxiedFetch(url);
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("HTML length:", text.length);
  fs.writeFileSync("scratch/embed.html", text);
  console.log("Written to scratch/embed.html");
}

run().catch(console.error);
