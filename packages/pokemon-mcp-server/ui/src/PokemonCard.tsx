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

const TYPE_COLORS: Record<string, string> = {
  normal: "#A8A878",
  fire: "#F08030",
  water: "#6890F0",
  electric: "#F8D030",
  grass: "#78C850",
  ice: "#98D8D8",
  fighting: "#C03028",
  poison: "#A040A0",
  ground: "#E0C068",
  flying: "#A890F0",
  psychic: "#F85888",
  bug: "#A8B820",
  rock: "#B8A038",
  ghost: "#705898",
  dragon: "#7038F8",
  dark: "#705848",
  steel: "#B8B8D0",
  fairy: "#EE99AC",
};

const STAT_COLORS: Record<string, string> = {
  hp: "#FF5959",
  attack: "#F5AC78",
  defense: "#FAE078",
  "special-attack": "#9DB7F5",
  "special-defense": "#A7DB8D",
  speed: "#FA92B2",
};

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "ATK",
  defense: "DEF",
  "special-attack": "Sp.ATK",
  "special-defense": "Sp.DEF",
  speed: "SPD",
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function PokemonCard({ pokemon }: { pokemon: PokemonData }) {
  const primaryType = pokemon.types[0]?.name ?? "normal";
  const primaryColor = TYPE_COLORS[primaryType] ?? "#A8A878";
  const secondaryColor = TYPE_COLORS[pokemon.types[1]?.name ?? ""] ?? primaryColor;
  const totalStats = pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0);

  return (
    <div
      style={{
        fontFamily: "var(--font-sans, 'Segoe UI', system-ui, sans-serif)",
        maxWidth: "360px",
        margin: "12px auto",
        borderRadius: "var(--border-radius-lg, 20px)",
        overflow: "hidden",
        boxShadow: "var(--shadow-md, 0 8px 32px rgba(0,0,0,0.18))",
        background: "var(--color-background-primary, #ffffff)",
      }}
    >
      {/* Header — type gradient always looks good on both themes */}
      <div
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
          padding: "24px 20px 16px",
          textAlign: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.12)",
          }}
        />
        <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
          #{String(pokemon.id).padStart(3, "0")}
        </div>
        <div
          style={{
            color: "white",
            fontSize: 28,
            fontWeight: "var(--font-weight-bold, 800)" as React.CSSProperties["fontWeight"],
            textShadow: "0 2px 6px rgba(0,0,0,0.2)",
            marginTop: 2,
          }}
        >
          {capitalize(pokemon.name)}
        </div>

        {/* Type badges */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10 }}>
          {pokemon.types.map((t) => (
            <span
              key={t.slot}
              style={{
                background: "rgba(255,255,255,0.28)",
                backdropFilter: "blur(6px)",
                color: "white",
                padding: "4px 14px",
                borderRadius: "var(--border-radius-full, 20px)",
                fontSize: 11,
                fontWeight: "var(--font-weight-bold, 800)" as React.CSSProperties["fontWeight"],
                textTransform: "uppercase",
                letterSpacing: "0.8px",
              }}
            >
              {t.name}
            </span>
          ))}
        </div>

        {/* Sprite */}
        {pokemon.sprite_url ? (
          <img
            src={pokemon.sprite_url}
            alt={pokemon.name}
            style={{
              width: 128,
              height: 128,
              imageRendering: "pixelated",
              filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.35))",
              marginTop: 12,
            }}
          />
        ) : (
          <div
            style={{
              width: 128,
              height: 128,
              margin: "12px auto 0",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 48,
            }}
          >
            ?
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: 20 }}>
        {/* Physical attributes */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
            marginBottom: 20,
          }}
        >
          {[
            { label: "Height", value: `${pokemon.height / 10}m` },
            { label: "Weight", value: `${pokemon.weight / 10}kg` },
            { label: "Generation", value: `Gen ${pokemon.generation}` },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                background: "var(--color-background-secondary, #f7f7f7)",
                borderRadius: "var(--border-radius-md, 12px)",
                padding: "10px 6px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: "var(--color-text-tertiary, #aaa)",
                  fontWeight: "var(--font-weight-semibold, 700)" as React.CSSProperties["fontWeight"],
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: "var(--font-weight-bold, 700)" as React.CSSProperties["fontWeight"],
                  color: "var(--color-text-primary, #333)",
                  marginTop: 3,
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: "var(--font-weight-semibold, 700)" as React.CSSProperties["fontWeight"],
              color: "var(--color-text-tertiary, #bbb)",
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              marginBottom: 10,
            }}
          >
            Base Stats
          </div>
          {pokemon.stats.map((stat) => {
            const pct = Math.round((stat.base_stat / 255) * 100);
            const color = STAT_COLORS[stat.stat_name] ?? primaryColor;
            return (
              <div
                key={stat.stat_name}
                style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}
              >
                <div
                  style={{
                    width: 56,
                    fontSize: 10,
                    fontWeight: "var(--font-weight-semibold, 700)" as React.CSSProperties["fontWeight"],
                    color: "var(--color-text-secondary, #999)",
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {STAT_LABELS[stat.stat_name] ?? stat.stat_name}
                </div>
                <div
                  style={{
                    width: 34,
                    fontSize: 12,
                    fontWeight: "var(--font-weight-bold, 700)" as React.CSSProperties["fontWeight"],
                    color: "var(--color-text-primary, #333)",
                    textAlign: "center",
                    flexShrink: 0,
                  }}
                >
                  {stat.base_stat}
                </div>
                <div
                  style={{
                    flex: 1,
                    background: "var(--color-background-tertiary, #eee)",
                    borderRadius: "var(--border-radius-sm, 6px)",
                    height: 8,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      background: color,
                      borderRadius: "var(--border-radius-sm, 6px)",
                      height: "100%",
                    }}
                  />
                </div>
              </div>
            );
          })}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 10,
              paddingTop: 10,
              borderTop: "var(--border-width-regular, 1px) solid var(--color-border-primary, #eee)",
            }}
          >
            <div
              style={{
                width: 56,
                fontSize: 10,
                fontWeight: "var(--font-weight-semibold, 700)" as React.CSSProperties["fontWeight"],
                color: "var(--color-text-secondary, #999)",
                textAlign: "right",
              }}
            >
              TOTAL
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: "var(--font-weight-bold, 800)" as React.CSSProperties["fontWeight"],
                color: "var(--color-text-primary, #333)",
              }}
            >
              {totalStats}
            </div>
          </div>
        </div>

        {/* Abilities */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: "var(--font-weight-semibold, 700)" as React.CSSProperties["fontWeight"],
              color: "var(--color-text-tertiary, #bbb)",
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              marginBottom: 8,
            }}
          >
            Abilities
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {pokemon.abilities.map((a) => (
              <span
                key={a.slot}
                style={{
                  background: a.is_hidden ? `${primaryColor}22` : "var(--color-background-secondary, #f0f0f0)",
                  color: a.is_hidden ? primaryColor : "var(--color-text-secondary, #555)",
                  border: `1px solid ${a.is_hidden ? primaryColor + "44" : "var(--color-border-primary, transparent)"}`,
                  padding: "5px 12px",
                  borderRadius: "var(--border-radius-sm, 10px)",
                  fontSize: 12,
                  fontWeight: "var(--font-weight-medium, 600)" as React.CSSProperties["fontWeight"],
                }}
              >
                {capitalize(a.name)}
                {a.is_hidden && (
                  <span style={{ fontSize: 9, marginLeft: 4, opacity: 0.7 }}>HIDDEN</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
