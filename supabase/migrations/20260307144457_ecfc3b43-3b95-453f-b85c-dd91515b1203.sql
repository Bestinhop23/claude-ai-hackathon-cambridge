
CREATE TABLE public.api_cache (
  cache_key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_api_cache_expires ON public.api_cache (expires_at);

ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access" ON public.api_cache FOR SELECT TO anon, authenticated USING (true);
