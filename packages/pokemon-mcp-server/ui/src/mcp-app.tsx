import { useState } from "react";
import { createRoot } from "react-dom/client";
import { useApp, useHostStyles } from "@modelcontextprotocol/ext-apps/react";
import PokemonCard from "./PokemonCard";

interface PokemonData {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  generation: number;
  sprite_url: string;
  stats: Array<{ stat_name: string; base_stat: number; effort: number }>;
  types: Array<{ name: string; slot: number }>;
  abilities: Array<{ name: string; is_hidden: boolean; slot: number }>;
}

function extractPokemonData(content: Array<{ type: string; text?: string }>): PokemonData | null {
  for (const item of content) {
    if (item.type !== "text" || !item.text) continue;
    try {
      const parsed = JSON.parse(item.text);
      if (typeof parsed.id === "number" && parsed.name && parsed.stats) {
        return parsed as PokemonData;
      }
    } catch {
      // not JSON, skip
    }
  }
  return null;
}

function App() {
  const [pokemon, setPokemon] = useState<PokemonData | null>(null);

  const { app, isConnected, error } = useApp({
    appInfo: { name: "Pokemon Card", version: "1.0.0" },
    capabilities: {},
    onAppCreated: (app) => {
      app.ontoolresult = (result) => {
        const data = extractPokemonData(result.content ?? []);
        if (data) setPokemon(data);
      };
    },
  });

  // Inject Claude's CSS variables (--color-background-primary etc.) onto document.documentElement
  useHostStyles(app, app?.getHostContext());

  if (error) {
    return (
      <div style={{ padding: 16, color: "#c00", fontFamily: "system-ui" }}>
        Connection error: {error.message}
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div style={{ padding: 16, color: "#999", fontFamily: "system-ui", textAlign: "center" }}>
        Connecting...
      </div>
    );
  }

  if (!pokemon) {
    return (
      <div style={{ padding: 16, color: "#999", fontFamily: "system-ui", textAlign: "center" }}>
        Ask me about a Pokémon to see its card here.
      </div>
    );
  }

  return <PokemonCard pokemon={pokemon} />;
}

createRoot(document.getElementById("root")!).render(<App />);
