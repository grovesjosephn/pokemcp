export interface IngestionConfig {
  maxPokemon: number;
  batchSize: number;
  batchDelayMs: number;
  requestDelayMs: number;
  maxRetries: number;
  timeoutMs: number;
}

export function loadConfig(
  customConfig?: Partial<IngestionConfig>
): IngestionConfig {
  const defaultConfig: IngestionConfig = {
    maxPokemon: parseInt(process.env.POKEMON_LIMIT || '1025'), // Official Pokemon count
    batchSize: parseInt(process.env.BATCH_SIZE || '10'),
    batchDelayMs: parseInt(process.env.BATCH_DELAY_MS || '2000'),
    requestDelayMs: parseInt(process.env.REQUEST_DELAY_MS || '100'),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
    timeoutMs: parseInt(process.env.TIMEOUT_MS || '30000'),
  };

  return { ...defaultConfig, ...customConfig };
}

export function validateConfig(config: IngestionConfig): void {
  const {
    maxPokemon,
    batchSize,
    batchDelayMs,
    requestDelayMs,
    maxRetries,
    timeoutMs,
  } = config;

  if (maxPokemon < 1 || maxPokemon > 10000) {
    throw new Error(
      `Invalid maxPokemon: ${maxPokemon}. Must be between 1 and 10,000`
    );
  }

  if (batchSize < 1 || batchSize > 50) {
    throw new Error(
      `Invalid batchSize: ${batchSize}. Must be between 1 and 50`
    );
  }

  if (batchDelayMs < 100 || batchDelayMs > 60000) {
    throw new Error(
      `Invalid batchDelayMs: ${batchDelayMs}. Must be between 100ms and 60s`
    );
  }

  if (requestDelayMs < 0 || requestDelayMs > 5000) {
    throw new Error(
      `Invalid requestDelayMs: ${requestDelayMs}. Must be between 0ms and 5s`
    );
  }

  if (maxRetries < 1 || maxRetries > 10) {
    throw new Error(
      `Invalid maxRetries: ${maxRetries}. Must be between 1 and 10`
    );
  }

  if (timeoutMs < 1000 || timeoutMs > 300000) {
    throw new Error(
      `Invalid timeoutMs: ${timeoutMs}. Must be between 1s and 5min`
    );
  }
}

export function printConfig(config: IngestionConfig): void {
  console.log('📊 Ingestion Configuration:');
  console.log(`  Max Pokemon: ${config.maxPokemon}`);
  console.log(`  Batch Size: ${config.batchSize}`);
  console.log(`  Batch Delay: ${config.batchDelayMs}ms`);
  console.log(`  Request Delay: ${config.requestDelayMs}ms`);
  console.log(`  Max Retries: ${config.maxRetries}`);
  console.log(`  Timeout: ${config.timeoutMs}ms`);
}
