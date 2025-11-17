import Database from 'better-sqlite3';
import { SearchArgs, ToolResponse } from '../types/index.js';
import {
  ResponseFormatter,
  PokemonSearchResults,
  MarkdownFormatter,
} from '../formatters/index.js';
import { DatabaseService } from '../database/index.js';

export class SearchPokemonTool {
  private formatter: ResponseFormatter;
  private dbService: DatabaseService;

  constructor(
    private db: Database.Database,
    formatter?: ResponseFormatter
  ) {
    this.formatter = formatter || new MarkdownFormatter();
    this.dbService = new DatabaseService(db);
  }

  async execute(args: SearchArgs): Promise<ToolResponse> {
    // Convert SearchArgs to the format expected by the centralized search
    const searchFilter = {
      type: args.type,
      generation: args.generation,
      minStat: args.min_stat,
      limit: args.limit || 20,
    };

    // Use centralized search query
    const results = this.dbService.search.searchPokemon(searchFilter);

    // Convert results to the expected format
    const searchResults: PokemonSearchResults = {
      criteria: args,
      totalCount: results.length,
      results: results.map((r) => ({
        id: r.id,
        name: r.name,
        generation: r.generation,
        types: this.dbService.search.parseTypesString(r.types),
      })),
    };

    return this.formatter.formatSearchResults(searchResults);
  }
}
