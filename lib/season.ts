export interface SeasonOption {
  id: string;
  name: string;
  status: string;
}

export const UNASSIGNED_SEASON_ID = '__unassigned__';

export const filterMatchesBySeason = <T extends { season_id?: string | null }>(matches: T[], seasonId: string | null) => {
  if (!seasonId) return [];
  if (seasonId === UNASSIGNED_SEASON_ID) return matches.filter((match) => !match.season_id);
  return matches.filter((match) => match.season_id === seasonId);
};
