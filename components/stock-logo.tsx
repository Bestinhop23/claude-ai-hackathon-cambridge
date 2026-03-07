export function StockLogo({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  return logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt={`${name} logo`} className="size-10 rounded-full border border-[var(--border)] bg-white object-contain p-1" />
  ) : (
    <div className="flex size-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--accent-soft)] text-sm font-semibold">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}
