import { egydeadAdapter } from '../lib/servers/egydead.ts';

const TMDB_API_KEY = "4b1542d1b31ea035576f0041f16a5670";
const SCRAPERAPI_KEY = "44c4b8da48f32288226081a986cd844c";

process.env.TMDB_API_KEY = TMDB_API_KEY;
process.env.SCRAPERAPI_KEY = SCRAPERAPI_KEY;

async function run() {
  console.log("Testing EgyDead locally for TMDB: 289424 S01E05...");
  const results = await egydeadAdapter.resolve("289424", "episode", 1, 5);
  console.log("Results:", JSON.stringify(results, null, 2));
}

run().catch(console.error);
