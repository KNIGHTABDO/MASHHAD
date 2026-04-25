async function test() {
  const res = await fetch('https://api.introdb.app/segments?imdb_id=tt0944947&season=1&episode=1')
  const data = await res.json()
  console.log(JSON.stringify(data, null, 2))
}
test()
