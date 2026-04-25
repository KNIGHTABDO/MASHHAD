export interface Movie {
  id: number
  title: string
  original_title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  vote_count: number
  genre_ids: number[]
  genres?: Genre[]
  runtime?: number
  status?: string
  tagline?: string
  credits?: Credits
  videos?: VideoResults
  recommendations?: { results: Movie[] }
  media_type?: 'movie'
}

export interface TVShow {
  id: number
  name: string
  original_name: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string
  vote_average: number
  vote_count: number
  genre_ids: number[]
  genres?: Genre[]
  number_of_seasons?: number
  number_of_episodes?: number
  status?: string
  tagline?: string
  seasons?: Season[]
  credits?: Credits
  videos?: VideoResults
  recommendations?: { results: TVShow[] }
  media_type?: 'tv'
}

export interface Season {
  id: number
  name: string
  overview: string
  poster_path: string | null
  season_number: number
  episode_count: number
  air_date: string
  episodes?: Episode[]
}

export interface Episode {
  id: number
  name: string
  overview: string
  still_path: string | null
  episode_number: number
  season_number: number
  air_date: string
  runtime: number | null
  vote_average: number
}

export interface Genre {
  id: number
  name: string
}

export interface Credits {
  cast: CastMember[]
  crew: CrewMember[]
}

export interface CastMember {
  id: number
  name: string
  character: string
  profile_path: string | null
  order: number
}

export interface CrewMember {
  id: number
  name: string
  job: string
  department: string
  profile_path: string | null
}

export interface VideoResults {
  results: Video[]
}

export interface Video {
  id: string
  key: string
  name: string
  site: string
  type: string
}

export type ContentType = 'movie' | 'tv'

export interface ContentCard {
  id: number
  title: string
  posterPath: string | null
  backdropPath: string | null
  releaseDate: string
  voteAverage: number
  mediaType: ContentType
  overview: string
}
