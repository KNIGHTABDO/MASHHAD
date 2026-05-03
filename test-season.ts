import { buildAnimeSeasonData } from './lib/anime/season';

async function test() {
  try {
    // Attack on Titan Anilist ID: 16498 (Season 1)
    const data = await buildAnimeSeasonData(113415);
    console.dir(data.seasons, { depth: null });
  } catch (e) {
    console.error(e);
  }
}

test();
