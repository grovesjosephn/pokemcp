import { Database, type Statement } from 'bun:sqlite';
import { ToolResponse } from '../types/index.js';
import {
  ResponseFormatter,
  PokemonComparisonData,
  MarkdownFormatter,
} from '../formatters/index.js';
import {
  PokemonCompleteRow,
  preparePokemonQuery,
  rowsToPokemonData,
} from './pokemonQuery.js';

export class ComparePokemonTool {
  private preparedQuery: Statement;
  private formatter: ResponseFormatter;

  constructor(
    private db: Database,
    formatter?: ResponseFormatter
  ) {
    this.formatter = formatter || new MarkdownFormatter();
    this.preparedQuery = preparePokemonQuery(this.db);
  }

  async execute(
    identifier1: string,
    identifier2: string
  ): Promise<ToolResponse> {
    const rows1 = this.preparedQuery.all(
      identifier1,
      identifier1
    ) as PokemonCompleteRow[];
    const rows2 = this.preparedQuery.all(
      identifier2,
      identifier2
    ) as PokemonCompleteRow[];

    const pokemon1 = rowsToPokemonData(rows1);
    if (!pokemon1) {
      return this.formatter.formatNotFound(identifier1);
    }

    const pokemon2 = rowsToPokemonData(rows2);
    if (!pokemon2) {
      return this.formatter.formatNotFound(identifier2);
    }

    const comparisonData: PokemonComparisonData = { pokemon1, pokemon2 };
    return this.formatter.formatComparison(comparisonData);
  }
}
