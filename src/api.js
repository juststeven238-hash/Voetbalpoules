const API_KEY = "JOUW_FOOTBALL_DATA_API_KEY"; // https://www.football-data.org/client/register
const BASE    = "https://api.football-data.org/v4";

async function apiFetch(path) {
  try {
    const r = await fetch(`${BASE}${path}`, { headers: { "X-Auth-Token": API_KEY } });
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  } catch (e) { console.warn("API:", e.message); return null; }
}

export const DIVISIES = [
  { id: "DED",  naam: "Eredivisie",         vlag: "🇳🇱", land: "Nederland",  kleur: "#ff6600" },
  { id: "PL",   naam: "Premier League",      vlag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", land: "Engeland",   kleur: "#3d195b" },
  { id: "PD",   naam: "La Liga",             vlag: "🇪🇸", land: "Spanje",     kleur: "#c60b1e" },
  { id: "BL1",  naam: "Bundesliga",          vlag: "🇩🇪", land: "Duitsland",  kleur: "#d00000" },
  { id: "SA",   naam: "Serie A",             vlag: "🇮🇹", land: "Italië",     kleur: "#024494" },
  { id: "FL1",  naam: "Ligue 1",             vlag: "🇫🇷", land: "Frankrijk",  kleur: "#003f8a" },
  { id: "CL",   naam: "Champions League",    vlag: "⭐", land: "Europa",     kleur: "#1a1aff" },
  { id: "EL",   naam: "Europa League",       vlag: "🟠", land: "Europa",     kleur: "#f97316" },
  { id: "PPL",  naam: "Primeira Liga",       vlag: "🇵🇹", land: "Portugal",   kleur: "#006600" },
  { id: "EC",   naam: "EK 2024",             vlag: "🌍", land: "Europa",     kleur: "#0066cc" },
  { id: "WC",   naam: "WK Keukenkampioenen", vlag: "🏆", land: "Wereld",     kleur: "#d4af37" },
  { id: "CLD",  naam: "Tweede Divisie",      vlag: "🇳🇱", land: "Nederland",  kleur: "#ff9900" },
];

export async function getWedstrijden(divisieId, status = "SCHEDULED") {
  const data = await apiFetch(`/competitions/${divisieId}/matches?status=${status}&limit=20`);
  if (!data?.matches) return [];
  return data.matches.map(m => ({
    id:        String(m.id),
    thuis:     m.homeTeam?.shortName || m.homeTeam?.name || "?",
    uit:       m.awayTeam?.shortName || m.awayTeam?.name || "?",
    thuisLogo: m.homeTeam?.crest || null,
    uitLogo:   m.awayTeam?.crest || null,
    datum:     m.utcDate,
    status:    m.status,
    score:     m.score?.fullTime?.home != null ? { thuis: m.score.fullTime.home, uit: m.score.fullTime.away } : null,
    speelronde: m.matchday || null,
  }));
}

export async function getGespeeldeWedstrijden(divisieId) {
  return getWedstrijden(divisieId, "FINISHED");
}

export async function getStand(divisieId) {
  const data = await apiFetch(`/competitions/${divisieId}/standings`);
  if (!data?.standings) return [];
  const table = data.standings.find(s => s.type === "TOTAL")?.table || [];
  return table.map(r => ({
    positie:    r.position,
    team:       r.team?.shortName || r.team?.name || "?",
    logo:       r.team?.crest || null,
    gespeeld:   r.playedGames,
    punten:     r.points,
    gewonnen:   r.won,
    gelijk:     r.draw,
    verloren:   r.lost,
    doelpunten: `${r.goalsFor}-${r.goalsAgainst}`,
  }));
}

export function berekenPunten(voorspelling, uitslag) {
  if (!voorspelling || !uitslag) return 0;
  const vT = Number(voorspelling.thuis), vU = Number(voorspelling.uit);
  const uT = Number(uitslag.thuis),      uU = Number(uitslag.uit);
  if (vT === uT && vU === uU) return 3;
  const vRes = vT > vU ? 1 : vT < vU ? -1 : 0;
  const uRes = uT > uU ? 1 : uT < uU ? -1 : 0;
  return vRes === uRes ? 1 : 0;
}

export const MOCK_WEDSTRIJDEN = [
  { id: "m1", thuis: "Ajax",     uit: "PSV",            datum: new Date(Date.now()+86400000).toISOString(),  status: "SCHEDULED", score: null, speelronde: 25 },
  { id: "m2", thuis: "Feyenoord",uit: "AZ",             datum: new Date(Date.now()+172800000).toISOString(), status: "SCHEDULED", score: null, speelronde: 25 },
  { id: "m3", thuis: "Utrecht",  uit: "Twente",         datum: new Date(Date.now()+259200000).toISOString(), status: "SCHEDULED", score: null, speelronde: 25 },
  { id: "m4", thuis: "Vitesse",  uit: "Heerenveen",     datum: new Date(Date.now()-86400000).toISOString(),  status: "FINISHED",  score: { thuis: 2, uit: 1 }, speelronde: 24 },
  { id: "m5", thuis: "NEC",      uit: "Go Ahead Eagles",datum: new Date(Date.now()-172800000).toISOString(), status: "FINISHED",  score: { thuis: 0, uit: 0 }, speelronde: 24 },
];
