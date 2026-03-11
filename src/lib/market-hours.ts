/**
 * Check if US stock markets are currently open.
 * NYSE/NASDAQ: Mon-Fri 9:30 AM - 4:00 PM ET
 */
export function isMarketOpen(): boolean {
  const now = new Date();
  // Convert to ET
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;

  const hours = et.getHours();
  const minutes = et.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // 9:30 AM = 570 min, 4:00 PM = 960 min
  return timeInMinutes >= 570 && timeInMinutes < 960;
}

export function isPreMarketHours(): boolean {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();
  if (day === 0 || day === 6) return false;
  const timeInMinutes = et.getHours() * 60 + et.getMinutes();
  // Pre-market: 4:00 AM - 9:30 AM ET
  return timeInMinutes >= 240 && timeInMinutes < 570;
}

export function isAfterHours(): boolean {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();
  if (day === 0 || day === 6) return false;
  const timeInMinutes = et.getHours() * 60 + et.getMinutes();
  // After-hours: 4:00 PM - 8:00 PM ET
  return timeInMinutes >= 960 && timeInMinutes < 1200;
}

export function getMarketStatusLabel(): string {
  if (isMarketOpen()) return "Market Open";
  if (isPreMarketHours()) return "Pre-Market";
  if (isAfterHours()) return "After Hours";
  return "Market Closed";
}

export function getMarketStatusColor(): string {
  if (isMarketOpen()) return "text-stock-up";
  if (isPreMarketHours() || isAfterHours()) return "text-amber-500";
  return "text-muted-foreground";
}
