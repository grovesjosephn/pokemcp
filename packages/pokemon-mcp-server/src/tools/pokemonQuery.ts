import { Database, type Statement } from 'bun:sqlite';
import { PokemonData } from '../formatters/index.js';

export interface PokemonCompleteRow {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  generation: number;
  species_url: string;
  sprite_url: string;
  stat_name: string | null;
  base_stat: number | null;
  effort: number | null;
  type_name: string | null;
  type_slot: number | null;
  ability_name: string | null;
  is_hidden: boolean | null;
  ability_slot: number | null;
}

const STAT_ORDER = [
  'hp',
  'attack',
  'defense',
  'special-attack',
  'special-defense',
  'speed',
];

const POKEMON_JOIN_SQL = `
  SELECT
    p.*,
    s.stat_name, s.base_stat, s.effort,
    t.name as type_name, pt.slot as type_slot,
    a.name as ability_name, pa.is_hidden, pa.slot as ability_slot
  FROM pokemon p
  LEFT JOIN stats s ON p.id = s.pokemon_id
  LEFT JOIN pokemon_types pt ON p.id = pt.pokemon_id
  LEFT JOIN types t ON pt.type_id = t.id
  LEFT JOIN pokemon_abilities pa ON p.id = pa.pokemon_id
  LEFT JOIN abilities a ON pa.ability_id = a.id
  WHERE p.id = ? OR LOWER(p.name) = LOWER(?)
  ORDER BY s.stat_name, pt.slot, pa.slot
`;

export function preparePokemonQuery(db: Database): Statement {
  return db.prepare(POKEMON_JOIN_SQL);
}

export function rowsToPokemonData(
  rows: PokemonCompleteRow[]
): PokemonData | null {
  if (rows.length === 0) return null;

  const first = rows[0];

  const statsMap = new Map<
    string,
    { stat_name: string; base_stat: number; effort: number }
  >();
  for (const row of rows) {
    if (row.stat_name && row.base_stat !== null && row.effort !== null) {
      if (!statsMap.has(row.stat_name)) {
        statsMap.set(row.stat_name, {
          stat_name: row.stat_name,
          base_stat: row.base_stat,
          effort: row.effort,
        });
      }
    }
  }

  const typesMap = new Map<number, string>();
  for (const row of rows) {
    if (row.type_name && row.type_slot !== null) {
      typesMap.set(row.type_slot, row.type_name);
    }
  }

  const abilitiesMap = new Map<number, { name: string; is_hidden: boolean }>();
  for (const row of rows) {
    if (
      row.ability_name &&
      row.is_hidden !== null &&
      row.ability_slot !== null
    ) {
      abilitiesMap.set(row.ability_slot, {
        name: row.ability_name,
        is_hidden: row.is_hidden,
      });
    }
  }

  const stats = STAT_ORDER.map((name) => statsMap.get(name)).filter(
    (s): s is NonNullable<typeof s> => s !== undefined
  );

  const types = Array.from(typesMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([slot, name]) => ({ name, slot }));

  const abilities = Array.from(abilitiesMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([slot, ability]) => ({ ...ability, slot }));

  return {
    id: first.id,
    name: first.name,
    height: first.height,
    weight: first.weight,
    base_experience: first.base_experience,
    generation: first.generation,
    species_url: first.species_url,
    sprite_url: first.sprite_url,
    stats,
    types,
    abilities,
  };
}
