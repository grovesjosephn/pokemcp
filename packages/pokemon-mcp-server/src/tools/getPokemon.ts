import { Database, type Statement } from "bun:sqlite";
import { ToolResponse } from "../types/index.js";
import { ResponseFormatter, MarkdownFormatter } from "../formatters/index.js";
import { PokemonCompleteRow, preparePokemonQuery, rowsToPokemonData } from "./pokemonQuery.js";

export class GetPokemonTool {
  private preparedQuery: Statement;
  private formatter: ResponseFormatter;

  constructor(
    private db: Database,
    formatter?: ResponseFormatter,
  ) {
    this.formatter = formatter || new MarkdownFormatter();
    this.preparedQuery = preparePokemonQuery(this.db);
  }

  async execute(identifier: string): Promise<ToolResponse> {
    const rows = this.preparedQuery.all(identifier, identifier) as PokemonCompleteRow[];

    const pokemonData = rowsToPokemonData(rows);
    if (!pokemonData) {
      return this.formatter.formatNotFound(identifier);
    }

    return this.formatter.formatPokemon(pokemonData);
  }
}
