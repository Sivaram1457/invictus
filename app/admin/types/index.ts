export interface Player {
  id: string;
  name: string;
  efootball_id?: string;
  team_id?: string;
  avatar_url?: string;
  profile_photo?: string;
  squad_photo?: string;
  points: number;
  trophies?: string[];
}

export interface Team {
  id: string;
  name: string;
  short_code: string;
}

export interface Match {
  id: string;
  home_player_id: string;
  away_player_id: string;
  home_score: number;
  away_score: number;
  competition_type: string;
  season_id?: string;
  created_at: string;
}

export interface Season {
  id: string;
  name: string;
  status: 'Active' | 'Completed' | 'Upcoming' | string;
  created_at?: string;
}

export interface Competition {
  id: string;
  title: string;
  description: string;
  status: 'ACTIVE' | 'UPCOMING' | 'COMPLETED';
  format_type: string;
  capacity: string;
  prize: string;
  match_format_description: string;
  rules?: string;
}