import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  generation: number;
  species_url: string;
  sprite_url: string;
}

export interface Stat {
  stat_name: string;
  base_stat: number;
  effort: number;
}

export interface Type {
  name: string;
}

export interface Ability {
  name: string;
  is_hidden: boolean;
}

export interface SearchArgs {
  type?: string;
  generation?: number;
  min_stat?: number;
  limit?: number;
}

export interface StrongestArgs {
  criteria:
    | 'total_stats'
    | 'attack'
    | 'defense'
    | 'hp'
    | 'speed'
    | 'sp_attack'
    | 'sp_defense';
  type?: string;
  generation?: number;
  limit?: number;
}

export type ToolResponse = CallToolResult;
