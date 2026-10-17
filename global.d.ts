declare module '*.css' {
  const styles: Record<string, string>;
  export default styles;
}

export {};

declare global {
  // 1. Strongly Typed Environment Variables
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_SUPABASE_URL: string;
      NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
      NEXT_PUBLIC_ADMIN_SECRET: string;
    }
  }

  // 2. Global eFootball Core Domain Types
  interface Player {
    id: string;
    name: string;
    team_id?: string;
    matches_played: number;
    wins: number;
    draws: number;
    losses: number;
    goals_for: number;
    goals_against: number;
    goal_difference: number;
    points: number;
    created_at?: string;
  }

  interface Team {
    id: string;
    name: string;
    logo_url?: string;
    short_code: string;
    max_players: 8; // Enforces the 8-player squad limit rule
    created_at?: string;
  }

  interface Match {
    id: string;
    home_player_id: string;
    away_player_id: string;
    home_score: number;
    away_score: number;
    competition_type: 'league' | 'ucl' | 'weekly' | 'duo' | 'championship';
    season_id?: string;
    created_at: string;
  }
}