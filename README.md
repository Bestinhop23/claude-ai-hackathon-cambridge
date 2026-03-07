# ClearView

ClearView is a demo-ready MVP for accessible investment decision support. A user enters a ticker, theme, watchlist, or mini portfolio, and the app returns a structured market brief with trends, risks, opportunities, catalysts, what to watch next, and visible uncertainty.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn-style UI components
- Recharts
- Zod

## Features

- Landing page with example prompts and direct analysis flow
- Analysis dashboard with executive summary, trend chart, risks, opportunities, catalysts, fundamentals, peer context, uncertainty, and sources used
- Dedicated map view with regional signals, source-linked evidence, and stock exposure summaries
- Portfolio/watchlist page with manual holdings input, concentration checks, sector exposure, macro sensitivity, and watch items
- Single orchestrator pipeline with pluggable provider adapters
- Mock mode by default so the app always runs for demos
- Live mode hooks for Alpha Vantage, Finnhub, and News API with graceful mock fallback
- Optional Claude sentiment adapter for stock-impact wording when authorized API access is available
- Optional Perplexity research layer feeding opportunities, sentiment context, and summary generation
- RSS-based news fallback with attribution when NewsAPI is unavailable
- Licensed social connector interface for approved feeds, without unauthorized scraping
- Visible data status panel showing live, mock, stale, or missing sources

## Architecture

- `app/`
  - routes and server-rendered pages
- `components/`
  - reusable UI and dashboard sections
- `lib/api/`
  - provider interfaces and implementations
- `lib/analytics/`
  - derived metric calculations
- `lib/orchestration/`
  - request interpretation and orchestration pipeline
- `lib/schemas/`
  - zod contracts for requests and responses
- `lib/summarization/`
  - strict JSON brief generation
- `lib/mocks/`
  - realistic demo data

## Lovable alignment

The summary you provided describes a separate React/Vite/Lovable frontend. This repository is still a Next.js implementation, so there are intentional differences:

- Present here now:
  - Landing page
  - Analysis view
  - Portfolio view
  - Map view
  - World opportunity map
  - Signal intelligence feed
  - Stock impact cards with citations and article explainers
- Not present here as Lovable-specific constructs:
  - Supabase edge-function routing model
  - React Query hooks layer
  - Leaflet map implementation
  - 3D globe
  - Currency/theme contexts matching the Lovable app
  - Separate `StockDetail.tsx` route structure

This README and the UI have been updated to avoid implying those Lovable-only elements exist in this codebase when they do not.

## Data modes

`CLEARVIEW_DATA_MODE=mock`

- Default and recommended for demos
- Uses deterministic mock price, fundamentals, news, macro, and sector data

`CLEARVIEW_DATA_MODE=live`

- Attempts to fetch live data via configured providers
- Falls back to mock data if an API key is missing or a provider fails

## Environment

Copy `.env.example` to `.env.local` and set values as needed:

```bash
CLEARVIEW_DATA_MODE=mock
ALPHA_VANTAGE_API_KEY=
FINNHUB_API_KEY=
NEWS_API_KEY=
CLEARVIEW_SENTIMENT_PROVIDER=heuristic
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-5-sonnet-latest
CLEARVIEW_RESEARCH_PROVIDER=mock
PERPLEXITY_API_KEY=
PERPLEXITY_MODEL=sonar
```

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Demo prompts

- `NVDA`
- `AI infrastructure`
- `AAPL MSFT QQQ`
- Portfolio input:

```text
AAPL 30%
MSFT 20%
QQQ 50%
```

## Notes for real APIs

- Alpha Vantage: price series
- Finnhub: profile, valuation, and earnings calendar
- News API: headline feed
- Anthropic: optional sentiment/impact phrasing adapter for ticker outlooks
- Perplexity: optional research-layer input for opportunities, sentiment context, and summary grounding
- Google News RSS: attribution-rich fallback source ingestion
- Macro and sector adapters currently use curated fallback implementations and are designed to be replaced behind the same interface
- Licensed social connectors can be added behind the `LicensedSocialProvider` interface when approved feeds are available

## Social and scraping note

- This project does not implement unauthorized scraping of X, Facebook, or Instagram.
- The signal collector is structured so approved APIs, licensed feeds, or explicitly authorized connectors can be plugged in later.
- Current signal inputs use compliant open-source style sources and mock proxies in demo mode.

## Product guardrails

- The UI is decision support, not guaranteed outcomes
- The app avoids deterministic recommendations
- It explicitly surfaces uncertainty and source quality
