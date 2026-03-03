import { useRef, useEffect, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { Worker } from "@/types";

interface WorkerSelectProps {
  workers: Worker[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  placeholder?: string;
  className?: string;
}

export function WorkerSelect({
  workers,
  selectedId,
  onSelect,
  placeholder = "Izaberi radnika...",
  className,
}: WorkerSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = workers.find((w) => w.id === selectedId);
  const filtered =
    query.trim() === ""
      ? workers
      : workers.filter((w) =>
          w.name.toLowerCase().includes(query.toLowerCase().trim())
        );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-[var(--color-input)] bg-[var(--color-card)] px-3 py-1 text-sm shadow-sm transition-colors",
          "hover:bg-[var(--color-muted)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2"
        )}
      >
        <span className={selected ? "text-[var(--color-foreground)]" : "text-[var(--color-muted-foreground)]"}>
          {selected ? selected.name : placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg">
          <div className="flex items-center border-b border-[var(--color-border)] px-2 py-1">
            <Search className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pretraži radnike..."
              className="h-8 border-0 shadow-none focus-visible:ring-0"
              autoFocus
            />
          </div>
          <ul className="max-h-48 overflow-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
                Nema rezultata
              </li>
            ) : (
              filtered.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(w.id);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-muted)]",
                      selectedId === w.id && "bg-[var(--color-muted)] font-medium"
                    )}
                  >
                    {w.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
