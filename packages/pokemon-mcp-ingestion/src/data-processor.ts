import { PokeApiClient, Pokemon, SpeciesResponse } from './api-client.js';
import { PokemonDatabase } from './database.js';
import { IngestionConfig } from './config.js';

export interface ProcessedPokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  generation: number;
  species_url: string;
  sprite_url: string;
  stats: Pokemon['stats'];
  types: Pokemon['types'];
  abilities: Pokemon['abilities'];
}

export class DataProcessor {
  private apiClient: PokeApiClient;
  private database: PokemonDatabase;
  private config: IngestionConfig;

  constructor(
    apiClient: PokeApiClient,
    database: PokemonDatabase,
    config: IngestionConfig
  ) {
    this.apiClient = apiClient;
    this.database = database;
    this.config = config;
  }

  async ingestTypes(): Promise<void> {
    console.log('🔄 Fetching Pokemon types...');

    const typesData = await this.apiClient.fetchTypes();
    const statements = this.database.getPreparedStatements();

    for (const type of typesData.results) {
      const typeId = parseInt(type.url.split('/').slice(-2, -1)[0]);
      statements.insertType.run(typeId, type.name);
    }

    console.log(`✅ Inserted ${typesData.results.length} types`);
  }

  async processPokemonBatch(
    pokemonList: Array<{ name: string; url: string }>
  ): Promise<number> {
    const statements = this.database.getPreparedStatements();

    // Fetch detailed data for each Pokemon in parallel
    const pokemonPromises = pokemonList.map(async (pokemon) => {
      try {
        const pokemonId = parseInt(pokemon.url.split('/').slice(-2, -1)[0]);
        const detailData = await this.apiClient.fetchPokemonDetails(pokemonId);

        // Get generation from species data
        if (!detailData.species || !detailData.species.url) {
          console.error(`❌ No species.url for ${pokemon.name}`);
          return null;
        }

        const speciesData = await this.apiClient.fetchSpeciesDetails(
          detailData.species.url
        );
        const generation = parseInt(
          speciesData.generation.url.split('/').slice(-2, -1)[0]
        );

        return {
          id: pokemonId,
          name: detailData.name,
          height: detailData.height,
          weight: detailData.weight,
          base_experience: detailData.base_experience,
          generation,
          species_url: detailData.species?.url || '',
          sprite_url: detailData.sprites?.front_default || '',
          stats: detailData.stats,
          types: detailData.types,
          abilities: detailData.abilities,
        };
      } catch (error) {
        console.error(
          `❌ Failed to fetch ${pokemon.name}: ${error instanceof Error ? error.message : String(error)}`
        );
        return null;
      }
    });

    const results = await Promise.all(pokemonPromises);
    const validResults = results.filter(
      (result): result is ProcessedPokemon => result !== null
    );

    // Insert data in transaction for performance
    const transaction = this.database.createTransaction(() => {
      for (const pokemon of validResults) {
        // Insert Pokemon
        statements.insertPokemon.run(
          pokemon.id,
          pokemon.name,
          pokemon.height ?? 0,
          pokemon.weight ?? 0,
          pokemon.base_experience ?? 0,
          pokemon.generation ?? 1,
          pokemon.species_url ?? '',
          pokemon.sprite_url ?? ''
        );

        // Insert Stats
        for (const stat of pokemon.stats) {
          statements.insertStat.run(
            pokemon.id,
            stat.stat.name,
            stat.base_stat ?? 0,
            stat.effort ?? 0
          );
        }

        // Insert Types
        for (const type of pokemon.types) {
          const typeId = parseInt(type.type.url.split('/').slice(-2, -1)[0]);
          statements.insertPokemonType.run(pokemon.id, typeId, type.slot ?? 1);
        }

        // Insert Abilities
        for (const ability of pokemon.abilities) {
          const abilityId = parseInt(
            ability.ability.url.split('/').slice(-2, -1)[0]
          );
          statements.insertAbility.run(abilityId, ability.ability.name);
          statements.insertPokemonAbility.run(
            pokemon.id,
            abilityId,
            ability.is_hidden ? 1 : 0,
            ability.slot ?? 1
          );
        }
      }
    });

    transaction();
    return validResults.length;
  }
}
