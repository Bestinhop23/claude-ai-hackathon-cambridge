# ClearView / FinTrack Handoff Document

Companion implementation checklist:

- `CLEARVIEW_LOVABLE_API_SETUP.md`

## 1. Project Purpose

This project is a production-style MVP for an accessible investment decision-support platform. The current codebase is implemented in **Next.js + TypeScript + Tailwind CSS** and has been expanded to absorb a large portion of the feature surface described from the separate Lovable-based implementation.

The goal of the product is:

- help everyday investors understand what is happening in markets
- connect stock moves to clear drivers
- show risks, opportunities, catalysts, and uncertainty
- combine financial data, news, transport/logistics signals, weather-style operational signals, and research findings into a structured investment brief
- preserve user agency rather than pretending certainty

This is:

- not an educational course
- not an autonomous trading bot
- not a swarm of independent agents
- a single orchestrator platform with specialized evidence-gathering and summarization layers

## 2. What This Repository Is

This repository is a **Next.js App Router implementation** that now includes:

- landing page
- analysis dashboard
- portfolio/watchlist page
- map page
- stock detail route
- unified stock-data API route
- mock-first provider architecture
- signal collection layer
- optional Claude sentiment layer
- optional Perplexity research layer
- 3D globe visualization
- Leaflet transport map visualization

It is **not** the same runtime stack as the original Lovable app.

Differences from the Lovable summary:

- this repo uses **Next.js**, not Vite
- this repo currently uses **Next API routes**, not Supabase Edge Functions
- this repo uses **server-side orchestration plus React Query client hooks**, not a full Supabase/Lovable cloud backend
- this repo now mirrors much of the Lovable feature surface, but some integrations remain mock-first or adapter-based

## 3. High-Level Product Modes

There are effectively three user-facing product modes in the current code:

### 3.1 Landing / Discovery

Users can:

- enter ticker
- enter theme
- enter watchlist
- navigate to analysis
- navigate to portfolio
- navigate to map
- search for stocks
- see market overview cards
- toggle theme
- select currency

### 3.2 Analysis / Decision Support

Users see:

- executive summary
- trend overview
- drivers
- opportunities
- risks
- catalysts
- fundamentals snapshot
- peer comparison
- geographic opportunity map
- signal intelligence feed
- stock impact summaries
- research layer findings
- uncertainty and what-to-watch
- data source status

### 3.3 Map / Global Monitoring

Users see:

- 3D globe
- world opportunity map
- flight and ship overlays
- research findings
- signal feed
- stock impact summaries tied to regions and open-source signals

### 3.4 Stock Detail

Users see:

- ticker header
- chart
- company profile
- earnings history
- sentiment card
- relevant news with query tags
- latest news
- modal article expansion

### 3.5 Portfolio / Watchlist

Users can:

- paste holdings manually
- see total weight
- detect weight mismatch
- view sector concentration
- see top risks
- see top opportunities
- see macro sensitivity notes

## 4. Core Architectural Principle

The system is designed around **one orchestrator** that coordinates specialized evidence layers.

There are multiple functional layers, but they are not marketed or modeled as autonomous agents acting independently.

The architecture is:

1. request enters
2. request type is interpreted
3. required providers are selected
4. provider data is fetched in parallel
5. data is normalized and validated with Zod
6. analytics are derived
7. open-source signals are collected
8. research findings are generated
9. sentiment summary is generated
10. structured investment brief is generated
11. frontend renders both summary and supporting evidence

## 5. Current Tech Stack

### Frontend

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn-style component primitives
- Recharts
- React Query
- next-themes
- Leaflet + react-leaflet
- react-globe.gl + three

### Backend / Server

- Next.js route handlers under `app/api`
- server-side orchestration under `lib/orchestration`
- provider abstractions under `lib/api`
- Zod validation under `lib/schemas`

### AI / Research Integrations

- Anthropic Claude: optional sentiment/impact phrasing
- Perplexity: optional research layer

### External / Data-Facing Integrations

Current code supports or is structured for:

- Alpha Vantage
- Finnhub
- NewsAPI
- Google News RSS fallback
- mock signal collector
- placeholder licensed social connector
- mock flight and ship tracking via unified stock-data route

## 6. Current Directory Structure

### App Routes

- `app/page.tsx`
  - landing page
- `app/analysis/page.tsx`
  - analysis dashboard route
- `app/portfolio/page.tsx`
  - portfolio/watchlist route
- `app/map/page.tsx`
  - map route with globe, world view, transport overlays
- `app/stocks/[symbol]/page.tsx`
  - stock detail page

### API Routes

- `app/api/analyze/route.ts`
  - structured analysis route
- `app/api/portfolio/route.ts`
  - portfolio analysis route
- `app/api/stock-data/route.ts`
  - unified Lovable-style data route using `action` parameter

### Components

- `components/analysis-dashboard.tsx`
- `components/company-profile.tsx`
- `components/currency-selector.tsx`
- `components/data-status-panel.tsx`
- `components/disclaimer.tsx`
- `components/earnings-info.tsx`
- `components/flight-ship-map.tsx`
- `components/globe-view.tsx`
- `components/market-overview.tsx`
- `components/news-sentiment.tsx`
- `components/portfolio-dashboard.tsx`
- `components/portfolio-input-form.tsx`
- `components/providers.tsx`
- `components/query-form.tsx`
- `components/research-panel.tsx`
- `components/signal-feed-panel.tsx`
- `components/stock-card.tsx`
- `components/stock-chart.tsx`
- `components/stock-impact-grid.tsx`
- `components/stock-logo.tsx`
- `components/stock-search.tsx`
- `components/theme-toggle.tsx`
- `components/world-opportunity-map.tsx`

### Map-Specific Components

- `components/maps/client-map.tsx`
- `components/maps/globe-client.tsx`

### Hooks

- `hooks/use-stock-data.ts`
  - React Query hooks for Lovable-style stock data actions

### Providers / Context-like wrappers

- `components/providers.tsx`
- `components/providers/currency-provider.tsx`

### Libraries

- `lib/api/client.ts`
  - client-side JSON fetch helper
- `lib/api/providers.ts`
  - provider implementations for analysis pipeline
- `lib/api/stock-data.ts`
  - unified action router backing `/api/stock-data`
- `lib/api/types.ts`
  - provider contracts and signal types

- `lib/analytics/market.ts`
  - derived analytics

- `lib/orchestration/analyze.ts`
  - central analysis pipeline
- `lib/orchestration/interpreter.ts`
  - request interpretation
- `lib/orchestration/portfolio.ts`
  - portfolio analysis pipeline

- `lib/research/perplexity.ts`
  - research layer

- `lib/summarization/brief.ts`
  - structured brief generator
- `lib/summarization/claude-sentiment.ts`
  - sentiment layer
- `lib/summarization/geography.ts`
  - geographic signals + stock impact narrative builder
- `lib/summarization/signal-agent.ts`
  - signal aggregation logic

- `lib/schemas/analysis.ts`
- `lib/schemas/portfolio.ts`
- `lib/schemas/stock-data.ts`

- `lib/mocks/data.ts`
  - analysis mock data
- `lib/mocks/market-data.ts`
  - unified stock-data route mock data

## 7. Current API Surface

### 7.1 Analysis API

Route:

- `POST /api/analyze`

Purpose:

- generate structured investment brief for ticker/theme/watchlist

Output includes:

- brief
- raw prices
- fundamentals
- news
- peers
- stock narratives
- geographic signals
- signal feed
- research findings
- data status

### 7.2 Portfolio API

Route:

- `POST /api/portfolio`

Purpose:

- portfolio concentration and exposure analysis

### 7.3 Unified Stock Data API

Route:

- `GET /api/stock-data?action=...`

Actions currently supported:

- `quote`
- `chart`
- `search`
- `earnings`
- `company-profile`
- `news`
- `relevant-news`
- `sentiment`
- `exchange-rates`
- `flights`
- `ships`

This route is the closest internal equivalent to the Lovable edge-function action router.

## 8. Current Agent / Layer Model

The word “agent” should be used carefully.

The system currently behaves as a **single orchestrator with specialized internal intelligence layers**.

### 8.1 Main Orchestrator

File:

- `lib/orchestration/analyze.ts`

Responsibilities:

- parse request
- choose relevant tickers
- call providers in parallel
- compute metrics
- call research layer
- call sentiment layer
- call summary generator
- assemble final payload

This is the central “brain” of the app.

### 8.2 Signal Collector Layer

Files:

- `lib/api/providers.ts`
- `lib/summarization/signal-agent.ts`

Responsibilities:

- collect/open-source style signals
- normalize them
- transform them into concise market context
- supply signal evidence to the brief and stock impact summaries

Signal categories currently modeled:

- news
- social (compliant placeholder / public proxy only)
- flight
- shipping
- weather

### 8.3 Research Layer

File:

- `lib/research/perplexity.ts`

Purpose:

- generate structured research findings
- provide overview + findings + citations
- inform opportunities
- inform sentiment input
- inform summary generation

Input:

- user query
- focus tickers

Output:

- overview
- findings[]
  - topic
  - takeaway
  - impactOnAssets
  - whyItMatters
  - confidence
  - citations

Current mode:

- mock by default
- optional Perplexity API live mode via env vars

### 8.4 Sentiment Layer

File:

- `lib/summarization/claude-sentiment.ts`

Purpose:

- synthesize ticker-specific sentiment/impact wording
- convert raw signals/news/research into readable market outlook language

Input:

- query
- tickers
- news
- signals
- research

Output:

- marketSummary
- tickerImpact per ticker

Current mode:

- heuristic by default
- optional Claude mode via env vars

### 8.5 Summary Agent / Brief Generator

File:

- `lib/summarization/brief.ts`

Purpose:

- produce final structured brief in the required product language

It uses:

- macro context
- sector context
- fundamentals
- news
- signals
- sentiment summary
- research findings
- derived analytics

This is the “summary agent” in product terms.

### 8.6 Geography / Stock Narrative Layer

File:

- `lib/summarization/geography.ts`

Purpose:

- build regional opportunity map data
- build per-stock impact narratives
- connect stock behavior to regional and operational context
- attach supporting articles and why-they-matter explanations

## 9. Current Data Flow

### Analysis flow

1. user enters `NVDA`, `AI infrastructure`, or watchlist
2. `interpretQuery()` classifies request
3. providers fetch:
   - price series
   - fundamentals
   - news
   - macro context
   - sector context
   - signals
4. analytics derive:
   - 1M trend
   - relative performance
   - volatility
   - drawdown
   - earnings proximity
   - valuation context
5. Perplexity research layer generates:
   - overview
   - structured findings
6. Claude sentiment layer generates:
   - market-level sentiment summary
   - ticker-level expected effects
7. geography layer generates:
   - regional markers
   - stock narratives
8. brief generator assembles final structured brief
9. frontend renders both summary and evidence

### Stock detail flow

The stock detail page uses `/api/stock-data` actions to fetch:

- quote
- chart
- company profile
- earnings
- news
- relevant-news
- sentiment

### Map flow

The map page combines:

- `runAnalysis()` result
- `/api/stock-data?action=flights`
- `/api/stock-data?action=ships`
- 3D globe
- world opportunity map
- signal feed
- research panel
- stock impact summaries

## 10. Current Environment Variables

Defined or expected:

- `CLEARVIEW_DATA_MODE`
  - `mock` or `live`
- `ALPHA_VANTAGE_API_KEY`
- `FINNHUB_API_KEY`
- `NEWS_API_KEY`
- `CLEARVIEW_SENTIMENT_PROVIDER`
  - `heuristic` or `claude`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `CLEARVIEW_RESEARCH_PROVIDER`
  - `mock` or `perplexity`
- `PERPLEXITY_API_KEY`
- `PERPLEXITY_MODEL`

## 11. Implemented External / Live-Ready Integrations

### 11.1 Alpha Vantage

Used for:

- live `quote`, `chart`, and `search` actions in `/api/stock-data`
- lightweight live market data when `CLEARVIEW_DATA_MODE=live`

### 11.2 Finnhub

Used for:

- live `company-profile` and `earnings` actions in `/api/stock-data`
- company profile, peers, recommendations, and earnings support

### 11.3 NewsAPI

Used for:

- live `news` action in `/api/stock-data`
- direct article retrieval for stock detail and summary evidence

### 11.4 Google News RSS Fallback

Used for:

- no-key fallback for `news` when `NEWS_API_KEY` is missing
- attributed article links that can still drive summaries and citations

### 11.5 Anthropic Claude

Used for:

- optional `sentiment` action in `/api/stock-data`
- stock-impact and market-sentiment phrasing layer

### 11.6 Perplexity

Used for:

- structured research findings in the analysis pipeline
- `relevant-news` topic generation in the unified stock-data route

### 11.7 Open Exchange Rates + Public Data

Used for:

- live `exchange-rates` action through `https://open.er-api.com/v6/latest/USD`
- no-key currency conversion support in the current implementation

### 11.8 Licensed Social Connector Placeholder

The code includes a **licensed social provider interface** and placeholder behavior.

Important:

- unauthorized scraping is not implemented
- the adapter boundary exists so approved platform/API or licensed feeds can be attached later

## 12. Free / Low-Cost API Plug-In Checklist

This is the practical external-service list Lovable should wire or keep wired for a demo-ready build.

### 12.1 Already Supported in Code

- `ALPHA_VANTAGE_API_KEY`
  - free tier available
  - used for `quote`, `chart`, and `search`
  - good default free source for demo market data

- `FINNHUB_API_KEY`
  - free tier available
  - used for `company-profile` and `earnings`
  - supports profile, metrics, recommendations, peers, and earnings history

- `NEWS_API_KEY`
  - free developer tier with strict limits
  - used for `news`
  - can be omitted because Google News RSS fallback is implemented

- `PERPLEXITY_API_KEY`
  - paid or credit-based in most setups
  - used for structured research findings and relevant-news topic generation
  - optional, but important if Lovable wants research-informed opportunity surfacing

- `ANTHROPIC_API_KEY`
  - paid or credit-based in most setups
  - used for Claude sentiment phrasing
  - optional because heuristic fallback exists

- `open.er-api.com`
  - no key currently required
  - used for exchange rates

- `Google News RSS`
  - no key
  - used as fallback article source with links and attribution

### 12.2 Still Mock-First and Needs Live Wiring

- `action=flights`
  - route exists
  - currently mock-backed
  - Lovable should wire a public or licensed ADS-B source

- `action=ships`
  - route exists
  - currently mock-backed
  - Lovable should wire a maritime / AIS source

- weather-style operational signals
  - modeled conceptually in the signal layer
  - not yet wired to a live weather API in this repo

- licensed social sentiment connectors
  - interface exists
  - no unauthorized scraping is implemented
  - Lovable should only attach approved APIs or licensed feeds

### 12.3 Recommended Demo Configuration

For the cleanest low-cost demo setup, use:

- Alpha Vantage
- Finnhub
- Google News RSS fallback
- open.er-api.com
- optional Perplexity for research
- optional Claude for sentiment wording

That gives a credible demo without requiring a full paid market-data stack.

## 13. Current UI Feature Inventory

### Implemented

- landing page
- market overview
- stock search
- theme toggle
- currency selector
- ticker cards with simulated live-style jitter
- analysis dashboard
- stock detail page
- company profile
- earnings chart
- news sentiment panel
- article modal
- relevant-news query tags
- map page
- Leaflet transport map
- 3D globe
- world opportunity map
- research panel
- signal feed
- stock impact grid
- portfolio page

### Partially implemented / mock-first

- flight tracking
- ship tracking
- relevant-news action
- sentiment action
- exchange rate action
- search action

These exist and work, but many are currently mock-first rather than fully production-live.

## 14. What Is Still Missing or Incomplete

These are the most important remaining gaps Lovable should complete or refine:

### 13.1 Full Live Provider Parity for `/api/stock-data`

Current situation:

- route exists
- actions exist
- live support now exists for:
  - `quote`
  - `chart`
  - `search`
  - `company-profile`
  - `earnings`
  - `news`
  - `relevant-news`
  - `sentiment`
  - `exchange-rates`
- fallback-to-mock behavior exists when keys are missing or calls fail

Still needed:

- optional Yahoo Finance parity if Lovable wants the original provider behavior rather than Alpha Vantage
- more complete Finnhub parity for recommendations/peer enrichment in all views
- live flight data integration
- live ship tracking integration

### 13.2 Better Map Fidelity

Current map:

- Leaflet with markers
- 3D globe with region points

Still needed:

- real satellite tile styling parity
- proper aircraft heading rotation
- richer ship icons/lane simulation
- live ADS-B ingestion
- live maritime ingestion
- military heuristics and coloring parity

### 13.3 Stronger Stock Detail UX Parity

Still needed:

- tabbed layout exactly matching Overview / Fundamentals / News
- richer profile metrics and analyst breakdowns
- more polished card hierarchy
- stock logo fallbacks from live source

### 14.4 Full Relevant News Intelligence

Still needed:

- tune Perplexity topic generation for stronger macro and industry specificity
- improve topic diversity and ranking
- fetch and merge more articles per topic with stronger dedupe
- preserve topic-to-article provenance more prominently in UI

### 14.5 Transport / Operational Signal Integration Into Summary Loop

The analysis route already models signal ingestion conceptually, but still needs:

- live flight feed ingestion into analysis path
- live ship feed ingestion into analysis path
- weather feed ingestion into analysis path
- scoring logic that ties operational disruptions to specific sectors/stocks

### 14.6 Watchlist Persistence / Auth / Storage

Currently missing:

- user authentication
- persistent watchlists
- saved analyses
- database tables

## 15. Recommended Next Steps for Lovable

Lovable should use this repo as the architecture reference and continue by:

1. preserving the **single orchestrator** concept
2. treating Perplexity as **research layer**
3. treating Claude as **sentiment and language layer**
4. treating signals as **evidence inputs**, not independent user-facing bots
5. replacing mock-first routes in `/api/stock-data` with full live integrations
6. tightening the stock-detail UI to match the Lovable design system
7. finishing live map integrations
8. optionally adding persistence and auth

## 16. Important Product Guardrails

The following should remain true:

- do not position the product as a swarm
- do not imply autonomous trading
- do not use deterministic investment language
- do show uncertainty clearly
- do separate facts from inference
- do preserve user agency
- do cite sources where possible

## 17. Current File List Most Relevant to Further Work

If Lovable needs the highest-value files first, prioritize:

- `lib/orchestration/analyze.ts`
- `lib/research/perplexity.ts`
- `lib/summarization/claude-sentiment.ts`
- `lib/summarization/brief.ts`
- `lib/summarization/geography.ts`
- `lib/api/providers.ts`
- `lib/api/stock-data.ts`
- `lib/schemas/analysis.ts`
- `lib/schemas/stock-data.ts`
- `app/api/stock-data/route.ts`
- `app/analysis/page.tsx`
- `app/map/page.tsx`
- `app/stocks/[symbol]/page.tsx`
- `components/analysis-dashboard.tsx`
- `components/news-sentiment.tsx`
- `components/flight-ship-map.tsx`
- `components/maps/client-map.tsx`
- `components/maps/globe-client.tsx`
- `components/research-panel.tsx`

## 18. Exact Summary of “Agents” in Product Language

To avoid ambiguity, here is the cleanest terminology:

- **Orchestrator**
  - central coordinator of all data, research, signals, sentiment, and brief generation
- **Signal Collector**
  - gathers open/public/compliant operational and media signals
- **Research Layer**
  - Perplexity-informed structured research findings with citations
- **Sentiment Layer**
  - Claude-informed impact phrasing and market sentiment synthesis
- **Summary Layer**
  - final investment brief generator

This should be described as one platform with specialized layers, not a swarm.

## 19. Operational Reality / Handoff Note

The codebase is now broad enough that Lovable can use this document and the listed files to:

- reconstruct missing UI pieces
- port live integrations
- preserve the intended architecture
- avoid inventing features that are not aligned with the product
- continue from a detailed, code-grounded system design instead of a vague product brief

This document should be treated as the current source-of-truth handoff for further Lovable completion work.

For API setup, live provider wiring, and a Lovable-focused implementation checklist, also use:

- `CLEARVIEW_LOVABLE_API_SETUP.md`
