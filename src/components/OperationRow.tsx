import { useCallback, useRef } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { timeDiffHours } from "@/lib/dateUtils";
import { cn, formatHours } from "@/lib/utils";
import type { Operation } from "@/types";

interface OperationRowProps {
  operation: Operation;
  /** Efektivno ukupno vreme kada grupa koristi jedan blok (Od na prvom, Do na poslednjem) */
  effectiveUkupnoVreme?: number;
  /** Kada je true, vreme je u zaglavlju grupe (Od/Do) – prikaži samo Napomena i Radni nalog */
  hideTimeFields?: boolean;
  /** Ranije korišćene napomene za predlog */
  suggestedNapomene?: string[];
  /** Ranije korišćeni radni nalozi za predlog */
  suggestedRadniNalozi?: string[];
  /** Sakrij polje za datum (kada je red unutar grupe po datumu) */
  hideDate?: boolean;
  onChange: (op: Operation) => void;
  onRemove: () => void;
}

function normalizeTime(s: string): string {
  s = s.trim();
  if (!s) return "";
  const m = /^(\d{1,2}):?(\d{0,2})$/.exec(s);
  if (!m) return s;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10) || 0));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10) || 0));
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function isValidTime(s: string): boolean {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return false;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  return h >= 0 && h <= 23 && min >= 0 && min <= 59;
}

export function OperationRow({ operation, effectiveUkupnoVreme, hideTimeFields = false, suggestedNapomene = [], suggestedRadniNalozi = [], hideDate = false, onChange, onRemove }: OperationRowProps) {
  const pocetakRef = useRef<HTMLInputElement>(null);
  const krajRef = useRef<HTMLInputElement>(null);

  const handleDatumChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      onChange({ ...operation, datum: v || "" });
    },
    [operation, onChange]
  );

  const recalcTime = useCallback(
    (pocetak: string, kraj: string) => {
      if (pocetak && kraj && isValidTime(pocetak) && isValidTime(kraj)) {
        return timeDiffHours(pocetak, kraj);
      }
      return operation.ukupnoVreme;
    },
    [operation.ukupnoVreme]
  );

  const handleTimeChange = useCallback(
    (field: "pocetak" | "kraj") => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const next = { ...operation, [field]: value };
      const start = field === "pocetak" ? value : operation.pocetak;
      const end = field === "kraj" ? value : operation.kraj;
      next.ukupnoVreme = recalcTime(start, end);
      onChange(next);
    },
    [operation, onChange, recalcTime]
  );

  const handleTimeClick = useCallback((field: "pocetak" | "kraj") => () => {
    const ref = field === "pocetak" ? pocetakRef : krajRef;
    ref.current?.showPicker?.();
  }, []);

  const handleTimeBlur = useCallback(() => {
    let pocetak = pocetakRef.current?.value ?? operation.pocetak;
    let kraj = krajRef.current?.value ?? operation.kraj;
    pocetak = normalizeTime(pocetak) || pocetak;
    kraj = normalizeTime(kraj) || kraj;
    const newTotal = recalcTime(pocetak, kraj);
    if (newTotal !== operation.ukupnoVreme || pocetak !== operation.pocetak || kraj !== operation.kraj) {
      onChange({ ...operation, pocetak, kraj, ukupnoVreme: newTotal });
    }
  }, [operation, onChange, recalcTime]);

  const showTimeFields = !hideTimeFields;

  const gridCols =
    hideTimeFields && hideDate
      ? "lg:grid-cols-[1fr_1fr_auto]"
      : hideDate
        ? "lg:grid-cols-[1fr_1fr_80px_80px_auto_auto]"
        : "lg:grid-cols-[1fr_1fr_1fr_80px_80px_auto_auto]";

  return (
    <div
      className={cn(
        "grid gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4",
        "grid-cols-1 sm:grid-cols-2",
        gridCols
      )}
    >
      {!hideDate && (
        <div className="space-y-1.5">
          <Label>Datum</Label>
          <Input
            type="date"
            value={operation.datum}
            onChange={handleDatumChange}
          />
        </div>
      )}
      <div className="space-y-1.5">
        <Label>Napomena</Label>
        <Input
          value={operation.napomena}
          onChange={(e) => onChange({ ...operation, napomena: e.target.value })}
          placeholder="Napomena"
          list={suggestedNapomene.length > 0 ? `napomena-${operation.id}` : undefined}
        />
        {suggestedNapomene.length > 0 && (
          <datalist id={`napomena-${operation.id}`}>
            {suggestedNapomene.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>Radni nalog</Label>
        <Input
          value={operation.radniNalog}
          onChange={(e) => onChange({ ...operation, radniNalog: e.target.value })}
          placeholder="Radni nalog"
          list={suggestedRadniNalozi.length > 0 ? `radninalog-${operation.id}` : undefined}
        />
        {suggestedRadniNalozi.length > 0 && (
          <datalist id={`radninalog-${operation.id}`}>
            {suggestedRadniNalozi.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        )}
      </div>
      {showTimeFields && (
        <>
          <div className="space-y-1.5">
            <Label>Početak</Label>
            <Input
              ref={pocetakRef}
              type="time"
              value={operation.pocetak}
              onChange={handleTimeChange("pocetak")}
              onBlur={handleTimeBlur}
              onClick={handleTimeClick("pocetak")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Kraj</Label>
            <Input
              ref={krajRef}
              type="time"
              value={operation.kraj}
              onChange={handleTimeChange("kraj")}
              onBlur={handleTimeBlur}
              onClick={handleTimeClick("kraj")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Ukupno vreme</Label>
            <div className="flex h-9 items-center rounded-md border border-[var(--color-input)] bg-[var(--color-muted)]/50 px-3 text-sm">
              {formatHours(effectiveUkupnoVreme !== undefined ? effectiveUkupnoVreme : operation.ukupnoVreme)}
            </div>
          </div>
        </>
      )}
      <div className="flex items-end pb-0 sm:pb-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
          title="Ukloni operaciju"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
