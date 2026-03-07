# ClearView Lovable API Setup And Implementation Checklist

## Purpose

This document is the practical companion to `CLEARVIEW_LOVABLE_HANDOFF.md`.

Use it when Lovable needs to:

- plug real APIs into the current Next.js implementation
- understand which environment variables are required
- know which routes already support live mode
- finish the remaining mock-first integrations

## Core Environment Variables

These are the primary environment variables already supported by the codebase.

```env
CLEARVIEW_DATA_MODE=mock

ALPHA_VANTAGE_API_KEY=
FINNHUB_API_KEY=
NEWS_API_KEY=

CLEARVIEW_RESEARCH_PROVIDER=mock
PERPLEXITY_API_KEY=
PERPLEXITY_MODEL=sonar

CLEARVIEW_SENTIMENT_PROVIDER=heuristic
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-5-sonnet-latest
```

## Recommended Demo Configuration

For a credible low-cost demo, use:

- `CLEARVIEW_DATA_MODE=live`
- `ALPHA_VANTAGE_API_KEY`
- `FINNHUB_API_KEY`
- `NEWS_API_KEY` if available
- `CLEARVIEW_RESEARCH_PROVIDER=perplexity` if Perplexity is available
- `CLEARVIEW_SENTIMENT_PROVIDER=claude` if Anthropic is available

If `NEWS_API_KEY` is missing, the app can still use Google News RSS fallback.

If Perplexity or Claude keys are missing, the app still runs using mock or heuristic fallbacks.

## API Matrix

### 1. Alpha Vantage

Env var:

- `ALPHA_VANTAGE_API_KEY`

Current use:

- `GET /api/stock-data?action=quote`
- `GET /api/stock-data?action=chart`
- `GET /api/stock-data?action=search`

Why it is used:

- free-tier market data
- simple stock lookup
- lightweight chart history for demo use

Notes:

- useful as the default free provider in this codebase
- if Lovable wants original parity with the prior stack, Yahoo Finance can be added later behind the same adapter boundary

### 2. Finnhub

Env var:

- `FINNHUB_API_KEY`

Current use:

- `GET /api/stock-data?action=company-profile`
- `GET /api/stock-data?action=earnings`

Why it is used:

- profile and fundamentals context
- earnings history
- peers and recommendation data support

Notes:

- free tier is enough for demo constraints
- Lovable can enrich the stock detail UI further using recommendation and peer data already exposed by the live call path

### 3. NewsAPI

Env var:

- `NEWS_API_KEY`

Current use:

- `GET /api/stock-data?action=news`

Why it is used:

- article headlines
- summaries
- source attribution
- article links for evidence-backed summaries

Notes:

- free tier is limited
- Google News RSS fallback already exists when this key is missing

### 4. Google News RSS Fallback

Env var:

- none

Current use:

- fallback path for `GET /api/stock-data?action=news`

Why it is used:

- no-key article sourcing
- linkable evidence when NewsAPI is unavailable

Notes:

- useful for demos
- article metadata quality is weaker than a paid news feed

### 5. Perplexity

Env vars:

- `CLEARVIEW_RESEARCH_PROVIDER=perplexity`
- `PERPLEXITY_API_KEY`
- `PERPLEXITY_MODEL`

Current use:

- analysis research layer in `lib/research/perplexity.ts`
- `GET /api/stock-data?action=relevant-news`

Why it is used:

- structured research findings
- opportunity discovery support
- macro and sector framing
- topic generation for relevant news retrieval

Notes:

- this is the research layer, not the final summary layer
- Lovable should keep Perplexity framed as evidence and research support for the orchestrator

### 6. Anthropic Claude

Env vars:

- `CLEARVIEW_SENTIMENT_PROVIDER=claude`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`

Current use:

- sentiment phrasing in `lib/summarization/claude-sentiment.ts`
- `GET /api/stock-data?action=sentiment`

Why it is used:

- convert evidence into readable sentiment and impact framing
- support per-stock outlook explanations
- inform the final summary language

Notes:

- this is the sentiment/language layer
- the final brief is still assembled by the internal summary/orchestration pipeline

### 7. Exchange Rates

Provider:

- `https://open.er-api.com/v6/latest/USD`

Env var:

- none in the current implementation

Current use:

- `GET /api/stock-data?action=exchange-rates`

Why it is used:

- multi-currency display
- currency selector support

## Current Route Status

### Live-capable now

- `quote`
- `chart`
- `search`
- `company-profile`
- `earnings`
- `news`
- `relevant-news`
- `sentiment`
- `exchange-rates`

### Still mock-first

- `flights`
- `ships`

### Conceptually modeled but not fully wired live

- weather-driven operational signals
- licensed social signal providers
- direct transport-to-stock scoring in all views

## What Lovable Should Implement Next

### Highest-priority live integrations

1. Wire a real flight source into `action=flights`
2. Wire a real ship / AIS source into `action=ships`
3. Add a weather API to the signal layer
4. Improve direct transport and weather impact scoring on stocks and sectors

### Highest-priority UI alignment

1. Tighten the stock detail page to exact Lovable parity
2. Make relevant-news provenance more prominent
3. Improve map visualization fidelity for transport signals
4. Preserve article links and source attribution anywhere summaries are shown

### Guardrails

- do not position the system as a swarm
- do not imply autonomous trading
- do not implement unauthorized scraping of X, Facebook, or Instagram
- treat Perplexity as the research layer
- treat Claude as the sentiment/language layer
- keep the single orchestrator model

## File References For Lovable

Start here:

- [CLEARVIEW_LOVABLE_HANDOFF.md](C:\Users\mprat\my-app\CLEARVIEW_LOVABLE_HANDOFF.md)
- [CLEARVIEW_LOVABLE_API_SETUP.md](C:\Users\mprat\my-app\CLEARVIEW_LOVABLE_API_SETUP.md)
- [lib/api/stock-data.ts](C:\Users\mprat\my-app\lib\api\stock-data.ts)
- [app/api/stock-data/route.ts](C:\Users\mprat\my-app\app\api\stock-data\route.ts)
- [lib/orchestration/analyze.ts](C:\Users\mprat\my-app\lib\orchestration\analyze.ts)
- [lib/research/perplexity.ts](C:\Users\mprat\my-app\lib\research\perplexity.ts)
- [lib/summarization/claude-sentiment.ts](C:\Users\mprat\my-app\lib\summarization\claude-sentiment.ts)

This file should be treated as the implementation checklist and API key setup reference.
