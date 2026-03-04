import { useMemo, useState } from "react";
import { Search, Pencil, Download, Archive, Trash2, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatHours } from "@/lib/utils";
import { computeTotals } from "@/lib/dateUtils";
import { exportCardsToExcel, downloadExcel } from "@/lib/excelExport";
import type { WorkerCard } from "@/types";

const MONTH_NAMES: Record<string, string> = {
  "01": "januar", "02": "februar", "03": "mart", "04": "april", "05": "maj", "06": "jun",
  "07": "jul", "08": "avgust", "09": "septembar", "10": "oktobar", "11": "novembar", "12": "decembar",
};

function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${MONTH_NAMES[m] ?? m} ${y}`;
}

interface ArchiveViewProps {
  cards: WorkerCard[];
  companyName: string;
  onEdit: (card: WorkerCard) => void;
  onDeleteCard: (cardId: string) => void;
  onUnarchive: (cardId: string) => void;
}

/** Da li kartica sadrži operaciju sa ovim datumom (YYYY-MM-DD ili delimično) */
function cardHasDate(card: WorkerCard, dateQ: string): boolean {
  if (!dateQ.trim()) return true;
  const q = dateQ.trim();
  return card.operations.some((op) => op.datum && op.datum.includes(q));
}

export function ArchiveView({ cards, companyName, onEdit, onDeleteCard, onUnarchive }: ArchiveViewProps) {
  const [searchName, setSearchName] = useState("");
  const [searchMonth, setSearchMonth] = useState("");
  const [searchDate, setSearchDate] = useState("");

  const grouped = useMemo(() => {
    const byMonth: Record<string, WorkerCard[]> = {};
    for (const c of cards) {
      if (!byMonth[c.month]) byMonth[c.month] = [];
      byMonth[c.month].push(c);
    }
    // sortirani mesec opadajuće (najnoviji prvi)
    return Object.entries(byMonth).sort(([a], [b]) => b.localeCompare(a));
  }, [cards]);

  const filtered = useMemo(() => {
    let list = grouped;
    if (searchMonth) {
      list = list.filter(([month]) => month === searchMonth);
    }
    if (searchName.trim()) {
      const q = searchName.trim().toLowerCase();
      list = list.map(([month, arr]) => [
        month,
        arr.filter((c) => c.workerName.toLowerCase().includes(q)),
      ] as [string, WorkerCard[]]).filter(([, arr]) => arr.length > 0);
    }
    if (searchDate.trim()) {
      const dateQ = searchDate.trim();
      list = list.map(([month, arr]) => [
        month,
        arr.filter((c) => cardHasDate(c, dateQ)),
      ] as [string, WorkerCard[]]).filter(([, arr]) => arr.length > 0);
    }
    return list;
  }, [grouped, searchName, searchMonth, searchDate]);

  const handleExportMonth = async (month: string, monthCards: WorkerCard[]) => {
    const companySlug = companyName.replace(/\s+/g, "_");
    const wb = await exportCardsToExcel(monthCards, companyName);
    await downloadExcel(wb, `Tabela_B_${companySlug}_${month.replace("-", "_")}.xlsx`);
  };

  if (cards.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Archive className="h-12 w-12 text-[var(--color-muted-foreground)] mb-3" />
          <p className="text-[var(--color-muted-foreground)] text-center">
            Nema arhiviranih kartica. Kartice iz prethodnih meseci će se ovde prikazivati.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Pretraga arhive
          </CardTitle>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Ime radnika, mesec ili datum — nađete šta je ko prijavio za prekovremeni rad.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[180px] space-y-1.5">
            <Label htmlFor="archive-search-name">Ime radnika</Label>
            <Input
              id="archive-search-name"
              placeholder="npr. Petar Petrović"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </div>
          <div className="w-[160px] space-y-1.5">
            <Label htmlFor="archive-search-month">Mesec</Label>
            <select
              id="archive-search-month"
              aria-label="Mesec"
              className="flex h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1 text-sm"
              value={searchMonth}
              onChange={(e) => setSearchMonth(e.target.value)}
            >
              <option value="">Svi meseci</option>
              {grouped.map(([month]) => (
                <option key={month} value={month}>
                  {monthLabel(month)}
                </option>
              ))}
            </select>
          </div>
          <div className="w-[160px] space-y-1.5">
            <Label htmlFor="archive-search-date">Datum</Label>
            <Input
              id="archive-search-date"
              type="date"
              placeholder="YYYY-MM-DD"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-[var(--color-foreground)]">
          Po mesecima
        </h2>
        <div className="space-y-6">
          {filtered.map(([month, monthCards]) => {
            const monthLabelStr = monthLabel(month);
            return (
              <Card key={month}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">{monthLabelStr}</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportMonth(month, monthCards)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Izvezi ovaj mesec
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {monthCards.map((card) => {
                      const t = computeTotals(card.operations);
                      const cardNet = Math.max(0, t.workDays - (card.posleSmeneHours ?? 0));
                      return (
                        <li key={card.id}>
                          <Card className="flex flex-col border-[var(--color-border)]">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base">{card.workerName}</CardTitle>
                              <p className="text-sm text-[var(--color-muted-foreground)]">
                                {card.operations.length} operacija
                              </p>
                            </CardHeader>
                            <CardContent className="flex flex-1 flex-col gap-2 pt-0">
                              <p className="text-sm">
                                Radni dani: {formatHours(t.workDays)} · Vikend: {formatHours(t.weekend)} · Ukupno: {formatHours(t.total)}
                                {card.posleSmeneHours != null && (
                                  <> · Neto: {formatHours(cardNet)}</>
                                )}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onEdit(card)}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Izmeni
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onUnarchive(card.id)}
                                  title="Vrati na tekući prikaz (ako je isti mesec)"
                                >
                                  <ArchiveRestore className="mr-2 h-4 w-4" />
                                  Vrati
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.confirm("Obrisati ovu karticu?") && onDeleteCard(card.id)}
                                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                  title="Obriši karticu"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <p className="py-4 text-center text-sm text-[var(--color-muted-foreground)]">
            Nema rezultata za ovu pretragu.
          </p>
        )}
      </section>
    </div>
  );
}
