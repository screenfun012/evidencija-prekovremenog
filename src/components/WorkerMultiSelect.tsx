import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Worker } from "@/types";

interface WorkerMultiSelectProps {
  workers: Worker[];
  selectedNames: string[];
  onSelectionChange: (names: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function WorkerMultiSelect({
  workers,
  selectedNames,
  onSelectionChange,
  placeholder = "Izaberi radnike...",
  className,
}: WorkerMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return workers;
    const q = search.trim().toLowerCase();
    return workers.filter((w) => w.name.toLowerCase().includes(q));
  }, [workers, search]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toggle = useCallback(
    (name: string) => {
      onSelectionChange(
        selectedNames.includes(name)
          ? selectedNames.filter((n) => n !== name)
          : [...selectedNames, name]
      );
    },
    [selectedNames, onSelectionChange]
  );

  const selectAll = useCallback(() => {
    onSelectionChange(workers.map((w) => w.name));
  }, [workers, onSelectionChange]);

  const clearAll = useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  const selectAllFiltered = useCallback(() => {
    const current = new Set(selectedNames);
    filtered.forEach((w) => current.add(w.name));
    onSelectionChange(Array.from(current));
  }, [filtered, selectedNames, onSelectionChange]);

  const clearAllFiltered = useCallback(() => {
    const filteredNames = new Set(filtered.map((w) => w.name));
    onSelectionChange(selectedNames.filter((n) => !filteredNames.has(n)));
  }, [filtered, selectedNames, onSelectionChange]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-[var(--color-border)]",
          "bg-[var(--color-background)] px-3 py-2 text-sm text-left",
          "hover:bg-[var(--color-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        )}
      >
        <span className="truncate text-[var(--color-foreground)]">
          {selectedNames.length === 0
            ? placeholder
            : `${selectedNames.length} izabrano`}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg"
          style={{ minWidth: "280px" }}
        >
          <div className="p-2 border-b border-[var(--color-border)]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
              <Input
                type="text"
                placeholder="Pretraži po imenu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
                autoFocus
              />
            </div>
            <div className="flex gap-1 mt-2">
              <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                Svi
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={clearAll}>
                Niko
              </Button>
              {search.trim() && (
                <>
                  <Button type="button" variant="ghost" size="sm" onClick={selectAllFiltered}>
                    Svi u listi
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={clearAllFiltered}>
                    Poništi u listi
                  </Button>
                </>
              )}
            </div>
          </div>
          <ul className="max-h-56 overflow-y-auto p-2 space-y-0.5">
            {workers.length === 0 ? (
              <li className="py-3 text-center text-sm text-[var(--color-muted-foreground)]">
                Nema radnika. Dodajte u Radnici (podešavanja).
              </li>
            ) : filtered.length === 0 ? (
              <li className="py-3 text-center text-sm text-[var(--color-muted-foreground)]">
                Nema rezultata za „{search}”
              </li>
            ) : (
              filtered.map((w) => (
                <li key={w.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-[var(--color-muted)]/50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedNames.includes(w.name)}
                      onChange={() => toggle(w.name)}
                      className="h-4 w-4 rounded border-[var(--color-border)]"
                    />
                    <span className="truncate">{w.name}</span>
                  </label>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
