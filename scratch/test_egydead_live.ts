import { egydeadAdapter } from '../lib/servers/egydead.ts';

if (!process.env.TMDB_API_KEY) {
  throw new Error('TMDB_API_KEY is required');
}
if (!process.env.SCRAPERAPI_KEY) {
  throw new Error('SCRAPERAPI_KEY is required');
}

async function run() {
  console.log("Testing EgyDead locally for TMDB: 289424 S01E05...");
  const results = await egydeadAdapter.resolve("289424", "episode", 1, 5);
  console.log("Results:", JSON.stringify(results, null, 2));
}

run().catch(console.error);
