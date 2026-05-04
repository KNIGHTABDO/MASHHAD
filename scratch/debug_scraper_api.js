const apiKey = "44c4b8da48f32288226081a986cd844c";
const url = "https://tv8.egydead.live/?s=We%20Are%20All%20Trying%20Here";

const targetUrl = new URL('http://api.scraperapi.com/');
targetUrl.searchParams.append('api_key', apiKey);
targetUrl.searchParams.append('url', url);

console.log("Fetching via Scraper API...");
fetch(targetUrl.toString())
  .then(res => {
    console.log("Status:", res.status);
    return res.text();
  })
  .then(html => {
      console.log("Response length:", html.length);
      console.log("Contains EgyDead structure:", html.includes('<a'));
  })
  .catch(err => console.error("Error:", err));
