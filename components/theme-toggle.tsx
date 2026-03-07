"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button variant="outline" size="sm" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
      {resolvedTheme === "dark" ? <Sun className="mr-2 size-4" /> : <Moon className="mr-2 size-4" />}
      {resolvedTheme === "dark" ? "Light" : "Dark"}
    </Button>
  );
}
