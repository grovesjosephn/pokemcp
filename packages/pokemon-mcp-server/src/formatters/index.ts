/**
 * Response Formatters for Pokemon MCP Server
 *
 * This module provides different formatting strategies for Pokemon data,
 * separating presentation logic from business logic.
 */

export {
  ResponseFormatter,
  PokemonData,
  PokemonComparisonData,
  PokemonSearchResults,
  TypeEffectivenessData,
  StrongestPokemonData,
} from './base.js';
export { MarkdownFormatter } from './markdown.js';
export { JsonFormatter } from './json.js';

// Import the classes for use in factory function
import { MarkdownFormatter } from './markdown.js';
import { JsonFormatter } from './json.js';

/**
 * Factory function to create formatters based on format type
 */
export function createFormatter(format: 'markdown' | 'json') {
  switch (format) {
    case 'markdown':
      return new MarkdownFormatter();
    case 'json':
      return new JsonFormatter();
    default:
      return new MarkdownFormatter(); // Default to markdown
  }
}

/**
 * Available formatter types
 */
export type FormatterType = 'markdown' | 'json';
