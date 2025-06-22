// Pokemon Data Ingestion App
// Fetches data from PokeAPI and stores in SQLite for MCP server

import {
  loadConfig,
  validateConfig,
  printConfig,
  IngestionConfig,
} from './src/config.js';
import { PokeApiClient } from './src/api-client.js';
import { PokemonDatabase } from './src/database.js';
import { DataProcessor } from './src/data-processor.js';

export class PokemonIngestion {
  private config: IngestionConfig;
  private apiClient: PokeApiClient;
  private database: PokemonDatabase;
  private processor: DataProcessor;

  constructor(customConfig?: Partial<IngestionConfig>) {
    // Step 1: Load and validate configuration
    this.config = loadConfig(customConfig);
    validateConfig(this.config);
    printConfig(this.config);

    // Step 2: Initialize components
    this.apiClient = new PokeApiClient(this.config);
    this.database = new PokemonDatabase();
    this.processor = new DataProcessor(
      this.apiClient,
      this.database,
      this.config
    );
  }

  async ingestAll(limit?: number): Promise<void> {
    console.log('🚀 Starting Pokemon data ingestion...');

    try {
      // Step 3: Ingest Pokemon types first
      await this.processor.ingestTypes();

      // Step 4: Determine ingestion limit
      const requestedLimit = limit ?? this.config.maxPokemon;
      const finalLimit = Math.min(requestedLimit, this.config.maxPokemon);

      if (finalLimit !== requestedLimit) {
        console.log(
          `⚠️  Requested ${requestedLimit} Pokemon, but limited to ${finalLimit} by configuration`
        );
      }

      console.log(
        `📊 Ingesting ${finalLimit} Pokemon in batches of ${this.config.batchSize}`
      );

      // Step 5: Fetch Pokemon list
      const pokemonList = await this.apiClient.fetchPokemonList(finalLimit);

      // Step 6: Process Pokemon in batches
      await this.processBatches(pokemonList.results);

      // Step 7: Display final statistics
      console.log('✅ Pokemon data ingestion complete');
      this.database.printStats();
    } catch (error) {
      console.error(
        '❌ Ingestion failed:',
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  private async processBatches(
    pokemonList: Array<{ name: string; url: string }>
  ): Promise<void> {
    const totalBatches = Math.ceil(pokemonList.length / this.config.batchSize);
    let processedCount = 0;

    for (let i = 0; i < pokemonList.length; i += this.config.batchSize) {
      const batchNum = Math.floor(i / this.config.batchSize) + 1;
      const batch = pokemonList.slice(i, i + this.config.batchSize);

      console.log(
        `🔄 Processing batch ${batchNum}/${totalBatches} (${batch.length} Pokemon)...`
      );

      try {
        // Process current batch
        const count = await this.processor.processPokemonBatch(batch);
        processedCount += count;

        // Show progress with rate limiting stats
        const rateLimiterStats = this.apiClient.getRateLimiterStats();
        console.log(
          `✅ Batch ${batchNum}/${totalBatches}: ${count} Pokemon processed ` +
            `(Total: ${processedCount}/${pokemonList.length}, ` +
            `API Requests: ${rateLimiterStats.requestCount})`
        );

        // Wait between batches (except for the last one)
        if (i + this.config.batchSize < pokemonList.length) {
          console.log(
            `⏱️  Waiting ${this.config.batchDelayMs}ms before next batch...`
          );
          await this.delay(this.config.batchDelayMs);
        }
      } catch (error) {
        console.error(
          `❌ Batch ${batchNum} failed:`,
          error instanceof Error ? error.message : String(error)
        );
        console.log('⏭️  Continuing with next batch...');
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  close(): void {
    this.database.close();
  }
}

async function main(): Promise<void> {
  const ingestion = new PokemonIngestion();
  try {
    await ingestion.ingestAll();
  } catch (error) {
    console.error(
      '❌ Error during ingestion:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  } finally {
    ingestion.close();
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
