import { useCallback } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isWeekend, timeDiffHours } from "@/lib/dateUtils";
import { cn, roundHours } from "@/lib/utils";
import type { Operation } from "@/types";

interface OperationRowProps {
  operation: Operation;
  onChange: (op: Operation) => void;
  onRemove: () => void;
}

const WEEKEND_MSG = "Subota i nedelja nisu dozvoljeni. Izaberite radni dan.";

export function OperationRow({ operation, onChange, onRemove }: OperationRowProps) {
  const handleDatumChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      if (!v) {
        onChange({ ...operation, datum: "" });
        return;
      }
      if (isWeekend(v)) {
        alert(WEEKEND_MSG);
        return;
      }
      onChange({ ...operation, datum: v });
    },
    [operation, onChange]
  );

  const handleTimeChange = useCallback(
    (field: "pocetak" | "kraj") => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const next = { ...operation, [field]: value };
      const start = field === "pocetak" ? value : operation.pocetak;
      const end = field === "kraj" ? value : operation.kraj;
      if (start && end) {
        next.ukupnoVreme = roundHours(timeDiffHours(start, end));
      }
      onChange(next);
    },
    [operation, onChange]
  );

  return (
    <div
      className={cn(
        "grid gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4",
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_80px_80px_auto_auto]"
      )}
    >
      <div className="space-y-1.5">
        <Label>Datum</Label>
        <Input
          type="date"
          value={operation.datum}
          onChange={handleDatumChange}
          onBlur={(e) => {
            const v = e.target.value;
            if (v && isWeekend(v)) {
              alert(WEEKEND_MSG);
              e.target.value = operation.datum;
            }
          }}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Napomena</Label>
        <Input
          value={operation.napomena}
          onChange={(e) => onChange({ ...operation, napomena: e.target.value })}
          placeholder="Napomena"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Radni nalog</Label>
        <Input
          value={operation.radniNalog}
          onChange={(e) => onChange({ ...operation, radniNalog: e.target.value })}
          placeholder="Radni nalog"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Početak</Label>
        <Input
          type="time"
          value={operation.pocetak}
          onChange={handleTimeChange("pocetak")}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Kraj</Label>
        <Input
          type="time"
          value={operation.kraj}
          onChange={handleTimeChange("kraj")}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Ukupno vreme</Label>
        <div className="flex h-9 items-center rounded-md border border-[var(--color-input)] bg-[var(--color-muted)]/50 px-3 text-sm">
          {roundHours(operation.ukupnoVreme)} h
        </div>
      </div>
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
