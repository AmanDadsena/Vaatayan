# वातायन · Vaatayan

**Find your window of clean air.**

_Vaatayan_ (वातायन) is Hindi for a window: literally, _the path by which the wind comes in_.
Every winter, smog settles over North Indian cities and families are told to "stay indoors" without being told when, where or how.
Vaatayan finds the cleanest hours of your day, turns them into a routine for your household, makes your home's air cleaner,
and shows exactly how much each choice keeps out of your lungs and out of your city's air.

---

## What it does

| Page                              | What you get                                                                                                                                                                                                                                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Today** (`/`)                   | Live air quality for any city, with the sky literally hazed to match. A 24-hour _breath ribbon_ that brackets your cleanest and worst two hours. A GenAI plan for your household: an hour-by-hour routine, indoor fixes and lower-emission swaps, plus follow-up questions answered with your live data. |
| **Impact lab** (`/impact`)        | "What if?" for your commute, heating and cooking. See the change in what your family breathes, CO₂, and the smog you add, then multiply it across 1 to 100,000 households. Trade-offs are shown honestly (an electric heater removes indoor smoke but adds grid CO₂).                                    |
| **Home air** (`/home-air`)        | Purifier sizing from room dimensions (CADR and time-to-clean), a buying guide, an illustrated DIY box-fan filter, a room-by-room checklist that remembers progress, and myth versus fact.                                                                                                                |
| **Why winter smog** (`/why-smog`) | Drag the inversion "lid" and watch the same pollution crowd into a thinner layer. Particle sizes drawn to scale. Honest, contested source ranges, and who needs the most care.                                                                                                                           |

## Design

- **The mark** is a _jharokha_, the carved arched window of Indian architecture, with clear sky, a sun and two streams of air flowing in. It is the literal meaning of वातायन, and one shared source draws it everywhere: header, footer, favicon, touch icon and social card.
- **The hero is a painting of the view from your window, made from live data.** Sky colour, the sun's glow, how far the skyline fades and how many particles drift are all computed from the current AQI (`src/lib/sky.ts`). Clean air gives a blue sky and a crisp sun. Smog gives the brown-grey sky and dim orange disc of a winter morning.
- **The palette** is a misty grey-green with a clear-air teal, plus a muted earth-toned AQI scale where every step passes 3:1 contrast. The display face is Bricolage Grotesque, the body face Atkinson Hyperlegible, and the wordmark Tiro Devanagari Hindi.
- **Motion is quiet and purposeful.** Haze drifts slowly and particles float. The wind in the logo moves on hover. Everything stops under `prefers-reduced-motion`.

## How GenAI is used, and kept honest

```
live air data ─┐
household ─────┼─▶ deterministic impact model ─▶ candidate actions + computed numbers
               │                                      │
               └──────────────▶ language model ◀──────┘   (chooses, orders, explains)
                                     │
                     structured output (Zod schema)
                                     │
                    server-side validation and merge ─▶ plan
```

- **Two providers, one contract.** Plans and answers come from Anthropic (`ANTHROPIC_API_KEY`) or Google Gemini (`GOOGLE_API_KEY`, default `gemini-2.5-flash`), chosen by which key is on the server. Both sit behind the same interface (`src/lib/providers/`), so prompts, validation and numbers are identical.
- **The model chooses and explains; it never invents numbers.** Every figure on screen (µg of PM2.5 not inhaled, kg CO₂, g of smog) comes from a tested, deterministic model in `src/lib/impact.ts`. The model receives the candidate actions and writes the personal _why_, the steps and the routine.
- **Structured output.** Plans are requested with a JSON schema built from the Zod schema, then validated again with Zod on the server before use. Action ids the model invents, or that don't apply, are dropped. Text is length-clipped and malformed times are discarded.
- **Grounded in live data.** Each prompt carries the current AQI, pollutants, the 24-hour forecast and the computed clean and worst windows.
- **Always works, with or without a key.** With no key, after a refusal or during an outage, a rule-based planner produces the same kind of plan with the same numbers, and follow-up questions are answered by a built-in engine (`src/lib/quickAnswers.ts`) grounded in the live reading. The UI labels every plan and answer with where it came from.
- **Streaming follow-ups.** "Ask a follow-up" streams answers grounded in your air, household and current plan.
- **Prompt-injection containment.** User text is fenced in tags that the system prompt says to treat as data, never instructions.
- **Efficient.** Stable system prompts are cached, plans use a capped thinking budget, and follow-ups skip thinking for answers in about a second.

## Accessibility

- Semantic landmarks, a skip link, one `h1` per page, and labelled form controls throughout.
- The place search follows the WAI-ARIA 1.2 combobox pattern (arrow keys, Enter, Escape, live result counts).
- Charts have text alternatives: the breath ribbon has a spoken summary and an hour-by-hour table, and the Impact Lab bar chart _is_ a data table.
- Colour is never the only signal. Every AQI colour step is at least 3:1 against the background, and text is at least 4.5:1 (body text 13:1).
- Body type is **Atkinson Hyperlegible**, designed by the Braille Institute for low-vision readers.
- Visible focus rings, 44 px touch targets, `prefers-reduced-motion` respected, and fully responsive down to 320 px.
- Automated axe audits run in the test suite for every interactive component.

## Security

- All third-party calls (air quality, geocoding, the language models) are made server-side. API keys never reach the browser.
- **Per-request nonce Content-Security-Policy** (`src/proxy.ts`): only scripts the server rendered can run (`'strict-dynamic'`, no inline or eval code in production). API responses use `default-src 'none'`.
- **Cross-site requests are refused.** The plan and follow-up endpoints check `Sec-Fetch-Site` and `Origin` and require a JSON body, so other websites cannot spend the AI quota through a visitor's browser.
- Hardened headers: HSTS, `X-Frame-Options: DENY`, `nosniff`, strict `Referrer-Policy`, a restrictive `Permissions-Policy`, same-origin `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy`, `Origin-Agent-Cluster`.
- Every request is validated with Zod (types, ranges, lengths). Control characters are stripped. Request bodies are capped at 32 KB.
- Per-client rate limits on every API route, with a bounded memory footprint. Upstream timeouts with one retry and a last-good cache.
- Coordinates are rounded to about 1 km before leaving the server. Household details are stored only in the browser's `localStorage`.
- Responsible disclosure via `/.well-known/security.txt` and [SECURITY.md](SECURITY.md).

## Efficiency

Measured on a production build:

|                                     | Before     | After                                                           |
| ----------------------------------- | ---------- | --------------------------------------------------------------- |
| Repeated AI plan                    | 11.6 s     | **12 ms** (cached, no AI quota used)                            |
| Repeated follow-up answer           | 1.2 s      | **13 ms**                                                       |
| JavaScript on the Today page (gzip) | 229 KB     | **202 KB** (validation library kept server-side)                |
| Fonts                               | 124 KB     | **65 KB** (wordmark font subset to its 6 letters: 62 KB → 3 KB) |
| Hero photo                          | 29 KB WebP | **16 KB AVIF**                                                  |
| Time to first byte per page         |            | **~16–22 ms** with a fresh CSP nonce                            |

- AI plans and answers are cached for 30 minutes, keyed by a SHA-256 of provider, model and prompt, in a size-capped LRU cache (`src/lib/ttlCache.ts`).
- Zod validates every request on the server; the browser checks saved data with tiny validators that tests prove agree with the schemas (`src/lib/domain.ts`).
- Air data is cached for 15 minutes server-side and 2 minutes in the browser; geocoding for a day.
- Self-hosted fonts, AVIF photos cached for 30 days, and charts drawn with CSS and SVG instead of a chart library.
- The place search is debounced and cancels stale requests with `AbortController`.

## Testing

```bash
npm test               # 309 tests: domain logic, both AI providers, API routes, full page flows + axe
npm run test:coverage  # about 98% lines, 97% statements, 96% functions, 85% branches (enforced floors)
npm run lint
npm run typecheck
npm run format:check
```

## Run it

```bash
npm install
cp .env.example .env.local   # optional: add GOOGLE_API_KEY or ANTHROPIC_API_KEY for AI plans
npm run dev                  # http://localhost:3000
```

Requires Node.js 20.9 or later.

## Project structure

```
src/
  app/                    pages and API routes (air, places, plan, ask), icons, social card
  proxy.ts                per-request nonce Content-Security-Policy
  components/             UI components, each with a CSS module
    home-air/             purifier sizer, checklist, buying guide, DIY filter, myths
    impact-lab/           before/after figures and the mode comparison table
  content/                page copy kept apart from components
  lib/
    exposure.ts           physical constants, emission factors, exposure helpers
    actions/              the action catalogue: routine, indoor, swaps
    impact.ts             assembles the catalogue, ranks candidates, totals impact
    planner.ts            rule-based planner and model-output merge
    ai.ts                 prompts, provider selection, streaming, result cache
    providers/            Anthropic and Gemini clients behind one interface
    airQuality.ts         Open-Meteo client with retry and last-good cache
    schemas.ts            Zod schemas (server only)
    domain.ts             shared constants and light validators (browser safe)
    aqi.ts, sky.ts, breathWindow.ts, simulator.ts, quickAnswers.ts, csp.ts, ...
tests/                    unit, API, security and component tests
```

### Quality gates

`npm run check` runs everything CI runs on every push: Prettier, ESLint (complexity ≤ 15, files ≤ 300 lines, no
non-null assertions in app code), strict TypeScript (`noUncheckedIndexedAccess`, `noUnusedLocals` and more),
tests with coverage floors, and a production build.

## Data, method and credits

- Air quality and forecasts: [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) (CAMS models). Hourly AQI is computed from that hour's PM2.5 with the US EPA 2024 breakpoints, because the reported US AQI is a 24-hour average.
- Breathing rates: US EPA Exposure Factors Handbook. Cigarette equivalence: Berkeley Earth (22 µg/m³ for a day ≈ 1 cigarette).
- Emission factors are typical Indian urban values, rounded. All figures are estimates for comparing choices, not medical measurements.
- Photos from Wikimedia Commons: "Smog in the skies of Delhi" by wili hybrid (CC BY 2.0); "Low visibility due to smog, Chelmsford Road" by Sumita Roy Dutta (CC BY-SA 4.0); "Delhi Metro red line at Shaheed Sthal" by Ravi Dwivedi (CC BY-SA 4.0); "Air purifier HEPA and activated carbon filter" by Home Air Quality Guides (CC BY-SA 2.0).

Vaatayan offers general guidance, not medical advice.
