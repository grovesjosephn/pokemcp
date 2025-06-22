import fetch from 'node-fetch';
import { IngestionConfig } from './config.js';
import { RateLimiter } from './rate-limiter.js';

export interface PokemonListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Array<{
    name: string;
    url: string;
  }>;
}

export interface TypeResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Array<{
    name: string;
    url: string;
  }>;
}

export interface SpeciesResponse {
  generation: {
    name: string;
    url: string;
  };
}

export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  generation: number;
  species?: { name: string; url: string };
  sprites: {
    front_default: string;
    back_default: string;
    front_shiny: string;
    back_shiny: string;
  };
  stats: Array<{
    stat: { name: string; url: string };
    base_stat: number;
    effort: number;
  }>;
  types: Array<{
    slot: number;
    type: { name: string; url: string };
  }>;
  abilities: Array<{
    ability: { name: string; url: string };
    is_hidden: boolean;
    slot: number;
  }>;
}

export class PokeApiClient {
  private baseUrl = 'https://pokeapi.co/api/v2';
  private config: IngestionConfig;
  private rateLimiter: RateLimiter;

  constructor(config: IngestionConfig) {
    this.config = config;
    this.rateLimiter = new RateLimiter(60); // 60 requests per minute max
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async fetchWithRetry(url: string, retries?: number): Promise<any> {
    if (!url) {
      throw new Error('URL is required');
    }

    const maxRetries = retries ?? this.config.maxRetries;

    // Apply rate limiting
    await this.rateLimiter.waitForSlot();

    // Add request delay if configured
    if (this.config.requestDelayMs > 0) {
      await this.delay(this.config.requestDelayMs);
    }

    for (let i = 0; i < maxRetries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.timeoutMs
        );

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Pokemon-MCP-Server/1.0.0',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Basic content validation
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response: not a JSON object');
        }

        return data;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log(`⚠️  Retry ${i + 1}/${maxRetries} for ${url}: ${errorMsg}`);

        if (i === maxRetries - 1) {
          throw new Error(`Failed after ${maxRetries} retries: ${errorMsg}`);
        }

        // Exponential backoff with jitter
        const backoffMs = Math.min(1000 * Math.pow(2, i), 10000);
        const jitter = Math.random() * 1000;
        await this.delay(backoffMs + jitter);
      }
    }
  }

  async fetchPokemonList(limit: number): Promise<PokemonListResponse> {
    const url = `${this.baseUrl}/pokemon?limit=${limit}`;
    return (await this.fetchWithRetry(url)) as PokemonListResponse;
  }

  async fetchTypes(): Promise<TypeResponse> {
    const url = `${this.baseUrl}/type`;
    return (await this.fetchWithRetry(url)) as TypeResponse;
  }

  async fetchPokemonDetails(pokemonId: number): Promise<Pokemon> {
    const url = `${this.baseUrl}/pokemon/${pokemonId}`;
    return (await this.fetchWithRetry(url)) as Pokemon;
  }

  async fetchSpeciesDetails(speciesUrl: string): Promise<SpeciesResponse> {
    return (await this.fetchWithRetry(speciesUrl)) as SpeciesResponse;
  }

  getRateLimiterStats() {
    return this.rateLimiter.getStats();
  }
}
