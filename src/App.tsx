import { useCallback, useEffect, useMemo, useState } from "react";
import { Settings, Upload, FileSpreadsheet, Save, Pencil, Moon, Sun, Download, CheckCircle, AlertTriangle, Calendar, Archive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { WorkerSelect } from "@/components/WorkerSelect";
import { OperationRow } from "@/components/OperationRow";
import { SettingsWorkers } from "@/components/SettingsWorkers";
import { ArchiveView } from "@/components/ArchiveView";
import { WorkerMultiSelect } from "@/components/WorkerMultiSelect";
import { formatHours, roundHours } from "@/lib/utils";
import { loadState, saveState, type StoredState } from "@/lib/storage";
import { processTableA, downloadBlob, type ProcessOutcome } from "@/lib/excelImport";
import { exportCardsToExcel, downloadExcel } from "@/lib/excelExport";
import type { Worker, Operation, WorkerCard } from "@/types";

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function generateId() {
  return crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getMonthFromOperations(operations: Operation[]): string {
  const first = operations.find((op) => op.datum);
  if (first?.datum) return first.datum.slice(0, 7);
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function toStoredState(
  workers: Worker[],
  cards: WorkerCard[],
  selectedWorkerId: string | null,
  operations: Operation[],
  posleSmeneHours: number | null,
  editingCardId: string | null,
  theme: string
): StoredState {
  return {
    workers: workers.map((w) => ({ id: w.id, name: w.name })),
    cards: cards.map((c) => ({
      id: c.id,
      workerId: c.workerId,
      workerName: c.workerName,
      month: c.month,
      operations: c.operations.map((op) => ({
        id: op.id,
        datum: op.datum,
        napomena: op.napomena,
        radniNalog: op.radniNalog,
        pocetak: op.pocetak,
        kraj: op.kraj,
        ukupnoVreme: op.ukupnoVreme,
      })),
      posleSmeneHours: c.posleSmeneHours,
      archived: c.archived ?? false,
    })),
    selectedWorkerId,
    operations: operations.map((op) => ({
      id: op.id,
      datum: op.datum,
      napomena: op.napomena,
      radniNalog: op.radniNalog,
      pocetak: op.pocetak,
      kraj: op.kraj,
      ukupnoVreme: op.ukupnoVreme,
    })),
    posleSmeneHours,
    editingCardId,
    theme,
  };
}

function fromStoredState(s: StoredState): {
  workers: Worker[];
  cards: WorkerCard[];
  selectedWorkerId: string | null;
  operations: Operation[];
  posleSmeneHours: number | null;
  editingCardId: string | null;
  theme: string;
} {
  return {
    workers: s.workers.map((w) => ({ id: w.id, name: w.name })),
    cards: (s.cards ?? []).map((c) => ({
      id: c.id,
      workerId: c.workerId,
      workerName: c.workerName,
      month: c.month,
      operations: c.operations.map((op) => ({
        id: op.id,
        datum: op.datum,
        napomena: op.napomena,
        radniNalog: op.radniNalog,
        pocetak: op.pocetak,
        kraj: op.kraj,
        ukupnoVreme: op.ukupnoVreme,
      })),
      posleSmeneHours: c.posleSmeneHours,
      archived: c.archived ?? false,
    })),
    selectedWorkerId: s.selectedWorkerId,
    operations: (s.operations ?? []).map((op) => ({
      id: op.id,
      datum: op.datum,
      napomena: op.napomena,
      radniNalog: op.radniNalog,
      pocetak: op.pocetak,
      kraj: op.kraj,
      ukupnoVreme: op.ukupnoVreme,
    })),
    posleSmeneHours: s.posleSmeneHours ?? null,
    editingCardId: s.editingCardId ?? null,
    theme: s.theme ?? "light",
  };
}

export default function App() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [cards, setCards] = useState<WorkerCard[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [posleSmeneHours, setPosleSmeneHours] = useState<number | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"current" | "archive">("current");

  const currentMonth = getCurrentMonth();
  const currentMonthCards = useMemo(
    () => cards.filter((c) => c.month === currentMonth && !c.archived),
    [cards, currentMonth]
  );
  const archiveCards = useMemo(
    () => cards.filter((c) => c.archived === true),
    [cards]
  );
  const cardCountByWorkerId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of cards) {
      map[c.workerId] = (map[c.workerId] ?? 0) + 1;
    }
    return map;
  }, [cards]);

  useEffect(() => {
    loadState().then((s) => {
      const data = fromStoredState(s);
      setWorkers(data.workers);
      setCards(data.cards);
      setSelectedWorkerId(data.selectedWorkerId);
      setOperations(data.operations);
      setPosleSmeneHours(data.posleSmeneHours);
      setEditingCardId(data.editingCardId);
      setTheme((data.theme === "dark" ? "dark" : "light") as "light" | "dark");
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const persist = useCallback(() => {
    const state = toStoredState(
      workers,
      cards,
      selectedWorkerId,
      operations,
      posleSmeneHours,
      editingCardId,
      theme
    );
    saveState(state);
  }, [workers, cards, selectedWorkerId, operations, posleSmeneHours, editingCardId, theme]);

  useEffect(() => {
    if (!loaded) return;
    persist();
  }, [loaded, persist, workers, cards, selectedWorkerId, operations, posleSmeneHours, editingCardId, theme]);

  const addOperation = useCallback(() => {
    setOperations((prev) => [
      ...prev,
      {
        id: generateId(),
        datum: "",
        napomena: "",
        radniNalog: "",
        pocetak: "",
        kraj: "",
        ukupnoVreme: 0,
      },
    ]);
  }, []);

  const updateOperation = useCallback((id: string, upd: Partial<Operation>) => {
    setOperations((prev) =>
      prev.map((op) => (op.id === id ? { ...op, ...upd } : op))
    );
  }, []);

  const removeOperation = useCallback((id: string) => {
    setOperations((prev) => prev.filter((op) => op.id !== id));
  }, []);

  const handleSave = useCallback(() => {
    const worker = workers.find((w) => w.id === selectedWorkerId);
    if (!worker) {
      alert("Izaberite radnika pre čuvanja.");
      return;
    }
    const totalHours = operations.reduce((acc, op) => acc + op.ukupnoVreme, 0);
    if (operations.length === 0 || totalHours === 0) {
      alert("Dodajte bar jednu operaciju sa popunjenim vremenom (početak i kraj) pre čuvanja.");
      return;
    }
    const month = editingCardId
      ? getMonthFromOperations(operations)
      : currentMonth;
    const roundedOps = operations.map((op) => ({ ...op, ukupnoVreme: roundHours(op.ukupnoVreme) }));
    if (editingCardId) {
      setCards((prev) =>
        prev.map((c) =>
          c.id === editingCardId
            ? {
                ...c,
                workerName: worker.name,
                month,
                operations: roundedOps,
                posleSmeneHours,
              }
            : c
        )
      );
      setEditingCardId(null);
    } else {
      setCards((prev) => [
        ...prev,
        {
          id: generateId(),
          workerId: worker.id,
          workerName: worker.name,
          month,
          operations: roundedOps,
          posleSmeneHours,
          archived: false,
        },
      ]);
    }
    setOperations([]);
    setPosleSmeneHours(null);
    setSelectedWorkerId(null);
  }, [workers, selectedWorkerId, operations, posleSmeneHours, editingCardId, currentMonth]);

  const handleEdit = useCallback((card: WorkerCard) => {
    setSelectedWorkerId(card.workerId);
    setOperations(card.operations.map((op) => ({ ...op })));
    setPosleSmeneHours(card.posleSmeneHours);
    setEditingCardId(card.id);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingCardId(null);
    setOperations([]);
    setSelectedWorkerId(null);
    setPosleSmeneHours(null);
  }, []);

  const handleExport = useCallback(async () => {
    if (currentMonthCards.length === 0) {
      alert("Nema sačuvanih kartica za tekući mesec. Sačuvajte bar jednu karticu za ovaj mesec.");
      return;
    }
    const wb = await exportCardsToExcel(currentMonthCards);
    await downloadExcel(wb, `Tabela_B_${currentMonth.replace("-", "_")}.xlsx`);
  }, [currentMonthCards, currentMonth]);

  const addWorker = useCallback((name: string) => {
    setWorkers((prev) => [...prev, { id: generateId(), name: name.trim() }]);
  }, []);

  const editWorker = useCallback((id: string, name: string) => {
    setWorkers((prev) => prev.map((w) => (w.id === id ? { ...w, name } : w)));
    setCards((prev) =>
      prev.map((c) => (c.workerId === id ? { ...c, workerName: name } : c))
    );
  }, []);

  const deleteWorker = useCallback((id: string) => {
    setWorkers((prev) => prev.filter((w) => w.id !== id));
    setCards((prev) => prev.filter((c) => c.workerId !== id));
    if (selectedWorkerId === id) {
      setSelectedWorkerId(null);
      setOperations([]);
      setEditingCardId(null);
    }
  }, [selectedWorkerId]);

  const markCardArchived = useCallback((cardId: string) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, archived: true } : c)));
    if (editingCardId === cardId) {
      setEditingCardId(null);
      setOperations([]);
      setSelectedWorkerId(null);
      setPosleSmeneHours(null);
    }
  }, [editingCardId]);

  const markCardUnarchived = useCallback((cardId: string) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, archived: false } : c)));
  }, []);

  const deleteCard = useCallback((cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    if (editingCardId === cardId) {
      setEditingCardId(null);
      setOperations([]);
      setSelectedWorkerId(null);
      setPosleSmeneHours(null);
    }
  }, [editingCardId]);

  const [importResult, setImportResult] = useState<ProcessOutcome | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [workersForImport, setWorkersForImport] = useState<string[]>([]);

  const openImportDialog = useCallback(() => {
    setWorkersForImport(workers.map((w) => w.name));
    setImportDialogOpen(true);
  }, [workers]);

  const handleFileImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      if (workersForImport.length === 0) {
        alert("Izaberite bar jednog radnika za obradu.");
        return;
      }
      if (currentMonthCards.length === 0) {
        alert("Nema sačuvanih kartica za tekući mesec. Sačuvajte bar jednu karticu pre obrade Tabele A.");
        return;
      }
      const result = await processTableA(file, currentMonthCards, workersForImport);
      setImportResult(result);
      if (result.success) {
        downloadBlob(result.blob, result.filename);
        setImportDialogOpen(false);
      }
    },
    [currentMonthCards, workersForImport]
  );

  const totalHours = operations.reduce((acc, op) => acc + op.ukupnoVreme, 0);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }, []);

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
        <p className="text-[var(--color-muted-foreground)]">Učitavanje...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 shadow-sm">
        <div className="mx-auto max-w-5xl space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-xl font-semibold text-[var(--color-foreground)]">
              Evidencija prekovremenog rada
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                title={theme === "dark" ? "Svetli režim" : "Tamni režim"}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="mr-2 h-4 w-4" />
                Radnici
              </Button>
            </div>
          </div>
          <div className="flex gap-1 rounded-lg bg-[var(--color-muted)]/50 p-1">
            <Button
              variant={activeTab === "current" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => setActiveTab("current")}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Tekući mesec
            </Button>
            <Button
              variant={activeTab === "archive" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => setActiveTab("archive")}
            >
              <Archive className="mr-2 h-4 w-4" />
              Arhiva
              {archiveCards.length > 0 && (
                <span className="ml-1.5 rounded-full bg-[var(--color-muted)] px-1.5 text-xs">
                  {archiveCards.length}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 p-4 pb-28">
        {activeTab === "archive" ? (
          <ArchiveView
            cards={archiveCards}
            onEdit={(card) => { setActiveTab("current"); handleEdit(card); }}
            onDeleteCard={deleteCard}
            onUnarchive={markCardUnarchived}
          />
        ) : (
          <>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-4 py-3 text-sm text-[var(--color-foreground)]">
          <p className="font-medium mb-1">Tok rada:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-[var(--color-muted-foreground)]">
            <li>Dodaj radnike (dugme <strong>Radnici</strong> gore desno).</li>
            <li>Ispod unesi prekovremeni rad — izaberi radnika, unesi operacije, <strong>Sačuvaj karticu</strong>.</li>
            <li>Pregledaj sačuvane kartice; zatim <strong>Izvezi u Excel</strong> (Tabela B) ili <strong>Uvezi Tabelu A</strong> da obrađuješ vreme.</li>
          </ol>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-sm font-bold text-[var(--color-primary)]">1</span>
              {editingCardId ? "Izmena kartice (dodaj operacije)" : "Unos prekovremenog rada (Tabela B)"}
            </CardTitle>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
              Tekući mesec: <strong>{currentMonth}</strong>
            </p>
            <div className="mt-4 space-y-2">
              <Label>Radnik</Label>
              <WorkerSelect
                workers={workers}
                selectedId={selectedWorkerId}
                onSelect={setSelectedWorkerId}
                placeholder="Izaberi radnika..."
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {operations.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/30 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
                Nema unetih operacija. Kliknite „Dodaj operaciju” ispod.
              </p>
            ) : (
              <ul className="space-y-3">
                {operations.map((op) => (
                  <li key={op.id}>
                    <OperationRow
                      operation={op}
                      onChange={(updated) => updateOperation(op.id, updated)}
                      onRemove={() => removeOperation(op.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={addOperation}>
                <Upload className="mr-2 h-4 w-4" />
                + Dodaj operaciju
              </Button>
              {editingCardId && (
                <Button type="button" variant="secondary" onClick={handleCancelEdit}>
                  Odustani
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-4">
              <span className="text-sm font-medium">Sati (ukupno):</span>
              <span className="text-lg font-semibold text-[var(--color-primary)]">
                {formatHours(totalHours)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="button" onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Sačuvaj karticu
              </Button>
            </div>
          </CardContent>
        </Card>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[var(--color-foreground)]">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-sm font-bold text-[var(--color-primary)]">2</span>
            Sačuvane kartice za tekući mesec
          </h2>
          {currentMonthCards.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/20 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
              Nema sačuvanih kartica za ovaj mesec. Sačuvajte karticu iznad. Prethodni meseci su u tabu <strong>Arhiva</strong>.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {currentMonthCards.map((card) => {
                const cardTotal = card.operations.reduce((a, op) => a + op.ukupnoVreme, 0);
                const cardNet = Math.max(0, cardTotal - (card.posleSmeneHours ?? 0));
                return (
                  <li key={card.id}>
                    <Card className="flex flex-col">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{card.workerName}</CardTitle>
                        <p className="text-sm text-[var(--color-muted-foreground)]">
                          {card.month} · {card.operations.length} operacija
                        </p>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col gap-2 pt-0">
                        <p className="text-sm">
                          Ukupno: {formatHours(cardTotal)}
                          {card.posleSmeneHours != null && (
                            <> · Neto: {formatHours(cardNet)}</>
                          )}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(card)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Izmeni
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markCardArchived(card.id)}
                            title="Prebaci u arhivu"
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            U arhivu
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.confirm("Obrisati ovu karticu?") && deleteCard(card.id)}
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
          )}
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-sm font-bold text-[var(--color-primary)]">3</span>
              Izvoz i obrada Tabele A
            </CardTitle>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
              Izvezi kartice u Excel (Tabela B) ili uvezi Tabelu A da upišeš novo vreme (Tabela A − Tabela B).
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Izvezi tekući mesec (Excel)
            </Button>
            <Button variant="outline" size="sm" onClick={openImportDialog}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Uvezi Tabelu A
            </Button>
          </CardContent>
        </Card>

        {importResult && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {importResult.success ? "Tabela A — obrađena" : "Greška pri obradi Tabele A"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {importResult.success ? (
                <>
                  {importResult.matchedWorkers.length > 0 && (
                    <div className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      <div className="w-full">
                        <p className="text-sm font-medium">Pronađeni radnici ({importResult.matchedWorkers.length}):</p>
                        <table className="mt-1 w-full text-sm">
                          <thead>
                            <tr className="text-left text-[var(--color-muted-foreground)]">
                              <th className="pr-3 font-medium">Radnik</th>
                              <th className="pr-3 font-medium">Posle smene</th>
                              <th className="pr-3 font-medium">Tabela B</th>
                              <th className="font-medium">Novo vreme (A − B)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importResult.matchedWorkers.map((w) => (
                              <tr key={w.name}>
                                <td className="pr-3">{w.name}</td>
                                <td className="pr-3">{w.originalPosleSmene}</td>
                                <td className="pr-3">{w.tabelaBTotal}</td>
                                <td>{w.newPosleSmene}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {importResult.unmatchedWorkers.length > 0 && (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <div>
                        <p className="text-sm font-medium">Bez kartice u Tabeli B ({importResult.unmatchedWorkers.length}):</p>
                        <p className="text-sm text-[var(--color-muted-foreground)]">
                          {importResult.unmatchedWorkers.length <= 8
                            ? importResult.unmatchedWorkers.join(", ")
                            : `${importResult.unmatchedWorkers.slice(0, 5).join(", ")} … i još ${importResult.unmatchedWorkers.length - 5}`}
                        </p>
                      </div>
                    </div>
                  )}
                  <p className="text-sm text-[var(--color-primary)]">
                    Izmenjena Tabela A je preuzeta automatski.
                  </p>
                </>
              ) : (
                <p className="text-sm text-red-600">{importResult.message}</p>
              )}
              <Button variant="ghost" size="sm" onClick={() => setImportResult(null)}>
                Zatvori
              </Button>
            </CardContent>
          </Card>
        )}


        <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <span className="text-sm text-[var(--color-muted-foreground)]">Ukupno sati (formular):</span>
                <span className="ml-2 font-semibold">{formatHours(totalHours)}</span>
              </div>
              <div>
                <span className="text-sm text-[var(--color-muted-foreground)]">Kartice (ovaj mesec):</span>
                <span className="ml-2 font-semibold">{currentMonthCards.length}</span>
              </div>
            </div>
          </div>
        </div>
          </>
        )}
      </main>

      {importDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Uvezi Tabelu A</CardTitle>
                <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                  Izaberite radnike za koje obrađujete podatke. U tabeli će se tražiti samo ovi radnici.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setImportDialogOpen(false)}>
                Zatvori
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-sm font-medium text-[var(--color-foreground)]">
                  Radnici za obradu
                </span>
                <WorkerMultiSelect
                  workers={workers}
                  selectedNames={workersForImport}
                  onSelectionChange={setWorkersForImport}
                  placeholder="Kliknite i izaberite radnike (pretraga + ček)"
                  className="w-full"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleFileImport}
                  />
                  <span className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-4 py-2 text-sm font-medium hover:opacity-90">
                    <FileSpreadsheet className="h-4 w-4" />
                    Izaberi fajl i obradi
                  </span>
                </label>
                <span className="text-sm text-[var(--color-muted-foreground)]">
                  {workersForImport.length} izabrano
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <SettingsWorkers
            workers={workers}
            cardCountByWorkerId={cardCountByWorkerId}
            onAdd={addWorker}
            onEdit={editWorker}
            onDelete={deleteWorker}
            onClose={() => setSettingsOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
