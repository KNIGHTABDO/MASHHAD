const apiKey = process.env.SCRAPERAPI_KEY;
if (!apiKey) throw new Error("SCRAPERAPI_KEY is required");
const url = "https://tv8.egydead.live/episode/we-are-all-trying-here-e05/";

const targetUrl = new URL('http://api.scraperapi.com/');
targetUrl.searchParams.append('api_key', apiKey);
targetUrl.searchParams.append('url', url);

console.log("Fetching server list via POST Scraper API...");
fetch(targetUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://tv8.egydead.live',
        'Referer': url,
      },
      body: 'View=1'
})
  .then(res => {
    console.log("Status:", res.status);
    return res.text();
  })
  .then(html => {
      console.log("Response length:", html.length);
      console.log("ServersList structure:", html.includes('serversList'));
  })
  .catch(err => console.error("Error:", err));
