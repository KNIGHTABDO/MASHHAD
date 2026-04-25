export interface Profile {
  id: string
  user_id: string
  name: string
  avatar_url?: string | null
  avatar_color: string
  is_kids: boolean
  language: 'ar' | 'en'
  maturity_level: 'kids' | 'teen' | 'all'
  auto_play_next: boolean
  auto_skip_intro: boolean
  subtitle_language: string
  created_at: string
  updated_at: string
}

export interface ProfileFormData {
  name: string
  avatar_color: string
  is_kids: boolean
  maturity_level: 'kids' | 'teen' | 'all'
  language: 'ar' | 'en'
  auto_play_next: boolean
  auto_skip_intro: boolean
  subtitle_language: string
}
