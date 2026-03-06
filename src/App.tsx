import { useCallback, useEffect, useMemo, useState } from "react";
import { Settings, Upload, FileSpreadsheet, Save, Pencil, Moon, Sun, Download, CheckCircle, AlertTriangle, Calendar, Archive, Trash2, Info, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WorkerSelect } from "@/components/WorkerSelect";
import { OperationRow } from "@/components/OperationRow";
import { SettingsWorkers } from "@/components/SettingsWorkers";
import { ArchiveView } from "@/components/ArchiveView";
import { WorkerMultiSelect } from "@/components/WorkerMultiSelect";
import { format, parseISO } from "date-fns";
import { formatHours } from "@/lib/utils";
import { timeDiffHours, computeTotals, effectiveOperationsWithGroupTime } from "@/lib/dateUtils";
import { loadState, saveState, migrateState, type StoredState } from "@/lib/storage";
import { useToast } from "@/components/Toast";
import { processTableA, downloadBlob, type ProcessOutcome } from "@/lib/excelImport";
import { exportCardsToExcel, downloadExcel } from "@/lib/excelExport";
import type { Worker, Operation, WorkerCard, Company } from "@/types";

const isNewGroupPlaceholder = (d: string) => d.startsWith("__new_");

function formatDateDisplay(dateStr: string): string {
  if (!dateStr || isNewGroupPlaceholder(dateStr)) return "—";
  try {
    return format(parseISO(dateStr), "dd.MM.yyyy.");
  } catch {
    return dateStr;
  }
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function generateId() {
  return crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getMonthFromOperations(operations: Operation[]): string {
  const first = operations.find((op) => op.datum && !isNewGroupPlaceholder(op.datum));
  if (first?.datum) return first.datum.slice(0, 7);
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function toStoredState(
  companies: Company[],
  workers: Worker[],
  cards: WorkerCard[],
  selectedCompanyId: string | null,
  selectedWorkerId: string | null,
  operations: Operation[],
  posleSmeneHours: number | null,
  editingCardId: string | null,
  theme: string
): StoredState {
  return {
    companies: companies.map((c) => ({ id: c.id, name: c.name })),
    workers: workers.map((w) => ({ id: w.id, name: w.name, companyId: w.companyId })),
    cards: cards.map((c) => ({
      id: c.id,
      workerId: c.workerId,
      workerName: c.workerName,
      companyId: c.companyId,
      month: c.month,
      operations: c.operations.map((op) => ({
        id: op.id,
        datum: op.datum,
        napomena: op.napomena,
        radniNalog: op.radniNalog,
        pocetak: op.pocetak,
        kraj: op.kraj,
        ukupnoVreme: op.ukupnoVreme,
        ...(op.isStandalone != null && { isStandalone: op.isStandalone }),
      })),
      posleSmeneHours: c.posleSmeneHours,
      archived: c.archived ?? false,
    })),
    selectedCompanyId,
    selectedWorkerId,
    operations: operations.map((op) => ({
      id: op.id,
      datum: op.datum,
      napomena: op.napomena,
      radniNalog: op.radniNalog,
      pocetak: op.pocetak,
      kraj: op.kraj,
      ...(op.isStandalone != null && { isStandalone: op.isStandalone }),
      ukupnoVreme: op.ukupnoVreme,
    })),
    posleSmeneHours,
    editingCardId,
    theme,
  };
}

function fromStoredState(s: StoredState): {
  companies: Company[];
  workers: Worker[];
  cards: WorkerCard[];
  selectedCompanyId: string | null;
  selectedWorkerId: string | null;
  operations: Operation[];
  posleSmeneHours: number | null;
  editingCardId: string | null;
  theme: string;
} {
  const companies: Company[] = (s.companies ?? []).map((c) => ({ id: c.id, name: c.name }));
  if (companies.length === 0) {
    companies.push({ id: "mr", name: "MR Engines" }, { id: "tiki", name: "TikiVent" });
  }
  return {
    companies,
    workers: (s.workers ?? []).map((w) => ({
      id: w.id,
      name: w.name,
      companyId: w.companyId ?? "mr",
    })),
    cards: (s.cards ?? []).map((c) => ({
      id: c.id,
      workerId: c.workerId,
      workerName: c.workerName,
      companyId: c.companyId ?? "mr",
      month: c.month,
      operations: c.operations.map((op) => ({
        id: op.id,
        datum: op.datum,
        napomena: op.napomena,
        radniNalog: op.radniNalog,
        pocetak: op.pocetak,
        kraj: op.kraj,
        ukupnoVreme: op.ukupnoVreme,
        ...(op.isStandalone != null && { isStandalone: op.isStandalone }),
      })),
      posleSmeneHours: c.posleSmeneHours,
      archived: c.archived ?? false,
    })),
    selectedCompanyId: s.selectedCompanyId ?? companies[0]?.id ?? "mr",
    selectedWorkerId: s.selectedWorkerId,
    operations: (s.operations ?? []).map((op) => ({
      id: op.id,
      datum: op.datum,
      napomena: op.napomena,
      radniNalog: op.radniNalog,
      pocetak: op.pocetak,
      kraj: op.kraj,
      ukupnoVreme: op.ukupnoVreme,
      ...(op.isStandalone != null && { isStandalone: op.isStandalone }),
    })),
    posleSmeneHours: s.posleSmeneHours ?? null,
    editingCardId: s.editingCardId ?? null,
    theme: s.theme ?? "light",
  };
}

export default function App() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [cards, setCards] = useState<WorkerCard[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [posleSmeneHours, setPosleSmeneHours] = useState<number | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"current" | "archive">("current");

  const currentMonth = getCurrentMonth();
  const workersForCompany = useMemo(
    () => workers.filter((w) => w.companyId === selectedCompanyId),
    [workers, selectedCompanyId]
  );
  const cardsForCompany = useMemo(
    () => cards.filter((c) => c.companyId === selectedCompanyId),
    [cards, selectedCompanyId]
  );
  const currentMonthCards = useMemo(
    () => cardsForCompany.filter((c) => c.month === currentMonth && !c.archived),
    [cardsForCompany, currentMonth]
  );
  const archiveCards = useMemo(
    () => cardsForCompany.filter((c) => c.archived === true),
    [cardsForCompany]
  );
  const cardCountByWorkerId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of cardsForCompany) {
      map[c.workerId] = (map[c.workerId] ?? 0) + 1;
    }
    return map;
  }, [cardsForCompany]);
  const suggestedNapomene = useMemo(
    () => [...new Set(operations.map((o) => o.napomena.trim()).filter(Boolean))],
    [operations]
  );
  const suggestedRadniNalozi = useMemo(
    () => [...new Set(operations.map((o) => o.radniNalog.trim()).filter(Boolean))],
    [operations]
  );
  const operationGroups = useMemo(() => {
    const byKey = new Map<string, Operation[]>();
    for (const op of operations) {
      const key = op.isStandalone ? `__standalone_${op.id}` : (op.datum || "\uFFFF");
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key)!.push(op);
    }
    return Array.from(byKey.entries())
      .sort(([a], [b]) => {
        if (a.startsWith("__standalone_")) return 1;
        if (b.startsWith("__standalone_")) return -1;
        if (a === "\uFFFF") return 1;
        if (b === "\uFFFF") return -1;
        return a.localeCompare(b);
      })
      .map(([key, ops]) => ({
        date: key.startsWith("__standalone_") ? key : key === "\uFFFF" ? "" : key,
        operations: ops,
        isStandalone: ops.length === 1 && ops[0].isStandalone,
      }));
  }, [operations]);

  const effectiveOperations = useMemo(
    () => effectiveOperationsWithGroupTime(operations),
    [operations]
  );
  const effectiveUkupnoByOpId = useMemo(() => {
    const m = new Map<string, number>();
    effectiveOperations.forEach((op) => m.set(op.id, op.ukupnoVreme));
    return m;
  }, [effectiveOperations]);
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
  const { toast } = useToast();

  useEffect(() => {
    loadState().then((s) => {
      const data = fromStoredState(s);
      setCompanies(data.companies);
      setWorkers(data.workers);
      setCards(data.cards);
      setSelectedCompanyId(data.selectedCompanyId);
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
      companies,
      workers,
      cards,
      selectedCompanyId,
      selectedWorkerId,
      operations,
      posleSmeneHours,
      editingCardId,
      theme
    );
    saveState(state);
  }, [companies, workers, cards, selectedCompanyId, selectedWorkerId, operations, posleSmeneHours, editingCardId, theme]);

  useEffect(() => {
    if (!loaded) return;
    persist();
  }, [loaded, persist, companies, workers, cards, selectedCompanyId, selectedWorkerId, operations, posleSmeneHours, editingCardId, theme]);

  const setSelectedCompany = useCallback((id: string) => {
    setSelectedCompanyId(id);
    setSelectedWorkerId(null);
    setOperations([]);
    setEditingCardId(null);
    setPosleSmeneHours(null);
  }, []);

  /** Nova grupa za jedan dan: zeleni blok, datum + Od/Do u headeru, redovi samo Napomena + Radni nalog */
  const addDayGroup = useCallback(() => {
    setOperations((prev) => {
      const id = generateId();
      return [
        ...prev,
        {
          id,
          datum: `__new_${id}`,
          napomena: "",
          radniNalog: "",
          pocetak: "",
          kraj: "",
          ukupnoVreme: 0,
        },
      ];
    });
  }, []);

  /** Jedan red sa punim poljima: Datum, Napomena, Radni nalog, Početak, Kraj, Ukupno vreme */
  const addStandaloneOperation = useCallback(() => {
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
        isStandalone: true,
      },
    ]);
  }, []);

  const addOperationWithDate = useCallback((date: string) => {
    if (date.startsWith("__standalone_")) return;
    setOperations((prev) => [
      ...prev,
      {
        id: generateId(),
        datum: date,
        napomena: "",
        radniNalog: "",
        pocetak: "",
        kraj: "",
        ukupnoVreme: 0,
      },
    ]);
  }, []);

  const updateGroupDate = useCallback((opIds: string[], newDate: string) => {
    setOperations((prev) =>
      prev.map((op) => (opIds.includes(op.id) ? { ...op, datum: newDate } : op))
    );
  }, []);

  const updateGroupTime = useCallback(
    (opIds: string[], field: "pocetak" | "kraj", value: string) => {
      if (opIds.length === 0) return;
      const firstId = opIds[0];
      const lastId = opIds[opIds.length - 1];
      const targetId = field === "pocetak" ? firstId : lastId;
      setOperations((prev) =>
        prev.map((op) =>
          op.id === targetId ? { ...op, [field]: value } : op
        )
      );
    },
    []
  );

  const updateOperation = useCallback((id: string, upd: Partial<Operation>) => {
    setOperations((prev) =>
      prev.map((op) => (op.id === id ? { ...op, ...upd } : op))
    );
  }, []);

  const removeOperation = useCallback((id: string) => {
    setOperations((prev) => prev.filter((op) => op.id !== id));
  }, []);

  const handleSave = useCallback(() => {
    const worker = workersForCompany.find((w) => w.id === selectedWorkerId);
    if (!worker || !selectedCompanyId) {
      toast("Izaberite radnika pre čuvanja.", "error");
      return;
    }
    const hasUnsetDate = operations.some((op) => isNewGroupPlaceholder(op.datum));
    if (hasUnsetDate) {
      toast("Postavite datum za sve operacije (izaberite datum u zelenom zaglavlju grupe).", "error");
      return;
    }
    const standaloneWithoutDate = operations.some(
      (op) => op.isStandalone && !op.datum?.trim()
    );
    if (standaloneWithoutDate) {
      toast("Postavite datum za pojedinačnu operaciju (polje Datum u tom redu).", "error");
      return;
    }
    const opsWithRecalc = operations.map((op) => {
      if (op.pocetak && op.kraj && op.ukupnoVreme === 0) {
        return { ...op, ukupnoVreme: timeDiffHours(op.pocetak, op.kraj) };
      }
      return op;
    });
    const effectiveForSave = effectiveOperationsWithGroupTime(opsWithRecalc);
    const totalHours = effectiveForSave.reduce((acc, op) => acc + op.ukupnoVreme, 0);
    if (effectiveForSave.length === 0 || totalHours === 0) {
      toast("Dodajte bar jednu operaciju sa popunjenim vremenom (početak i kraj) pre čuvanja.", "error");
      return;
    }
    const month = editingCardId
      ? getMonthFromOperations(effectiveForSave)
      : currentMonth;
    const opsToSave = effectiveForSave.map((op) => ({ ...op, ukupnoVreme: op.ukupnoVreme }));
    if (editingCardId) {
      setCards((prev) =>
        prev.map((c) =>
          c.id === editingCardId
            ? {
                ...c,
                workerName: worker.name,
                month,
                operations: opsToSave,
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
          companyId: selectedCompanyId,
          month,
          operations: opsToSave,
          posleSmeneHours,
          archived: false,
        },
      ]);
    }
    setOperations([]);
    setPosleSmeneHours(null);
    setSelectedWorkerId(null);
    toast("Kartica sačuvana.", "success");
  }, [workersForCompany, selectedWorkerId, selectedCompanyId, operations, posleSmeneHours, editingCardId, currentMonth, toast]);

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
      toast("Nema sačuvanih kartica za tekući mesec. Sačuvajte bar jednu karticu za ovaj mesec.", "error");
      return;
    }
    const companySlug = (selectedCompany?.name ?? "firma").replace(/\s+/g, "_");
    const wb = await exportCardsToExcel(currentMonthCards, selectedCompany?.name ?? "");
    await downloadExcel(wb, `Tabela_B_${companySlug}_${currentMonth.replace("-", "_")}.xlsx`);
    toast("Excel izvezen.", "success");
  }, [currentMonthCards, currentMonth, selectedCompany?.name, toast]);

  const handleExportSingleCard = useCallback(
    async (card: WorkerCard) => {
      const wb = await exportCardsToExcel([card], selectedCompany?.name ?? "");
      await downloadExcel(wb, `Kartica_${card.workerName.replace(/\s+/g, "_")}_${card.month.replace("-", "_")}.xlsx`);
      toast("Kartica izvezena.", "success");
    },
    [selectedCompany?.name, toast]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "e") {
        e.preventDefault();
        handleExport();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave, handleExport]);

  const addWorker = useCallback((name: string) => {
    if (!selectedCompanyId) return;
    setWorkers((prev) => [...prev, { id: generateId(), name: name.trim(), companyId: selectedCompanyId }]);
  }, [selectedCompanyId]);

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

  const handleExportBackup = useCallback(() => {
    const state = toStoredState(
      companies,
      workers,
      cards,
      selectedCompanyId,
      selectedWorkerId,
      operations,
      posleSmeneHours,
      editingCardId,
      theme
    );
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evidencija_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Backup izvezen.", "success");
  }, [companies, workers, cards, selectedCompanyId, selectedWorkerId, operations, posleSmeneHours, editingCardId, theme, toast]);

  const handleImportBackup = useCallback((raw: StoredState) => {
    const state = migrateState(raw);
    const data = fromStoredState(state);
    setCompanies(data.companies);
    setWorkers(data.workers);
    setCards(data.cards);
    setSelectedCompanyId(data.selectedCompanyId);
    setSelectedWorkerId(data.selectedWorkerId);
    setOperations(data.operations);
    setPosleSmeneHours(data.posleSmeneHours);
    setEditingCardId(data.editingCardId);
    if (data.theme) setTheme((data.theme === "dark" ? "dark" : "light") as "light" | "dark");
    toast("Backup uvezen.", "success");
  }, [toast]);

  const [importResult, setImportResult] = useState<ProcessOutcome | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [workersForImport, setWorkersForImport] = useState<string[]>([]);

  const openImportDialog = useCallback(() => {
    setWorkersForImport(workersForCompany.map((w) => w.name));
    setImportDialogOpen(true);
  }, [workersForCompany]);

  const handleFileImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      if (workersForImport.length === 0) {
        toast("Izaberite bar jednog radnika za obradu.", "error");
        return;
      }
      if (currentMonthCards.length === 0) {
        toast("Nema sačuvanih kartica za tekući mesec. Sačuvajte bar jednu karticu pre obrade Tabele A.", "error");
        return;
      }
      const result = await processTableA(file, currentMonthCards, workersForImport);
      setImportResult(result);
      if (result.success) {
        downloadBlob(result.blob, result.filename);
        setImportDialogOpen(false);
        toast("Tabela obrađena i preuzeta.", "success");
      }
    },
    [currentMonthCards, workersForImport, toast]
  );

  const totalsForm = computeTotals(
    effectiveOperations.filter((op) => {
      if (isNewGroupPlaceholder(op.datum)) return false;
      const orig = operations.find((o) => o.id === op.id);
      if (orig?.isStandalone && !op.datum?.trim()) return false;
      return true;
    })
  );
  const totalsAllCards = currentMonthCards.reduce(
    (acc, card) => {
      const t = computeTotals(card.operations);
      return {
        workDays: acc.workDays + t.workDays,
        weekend: acc.weekend + t.weekend,
        total: acc.total + t.total,
      };
    },
    { workDays: 0, weekend: 0, total: 0 }
  );

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
                variant="ghost"
                size="icon"
                onClick={() => setInfoOpen(true)}
                title="Kako radi aplikacija"
              >
                <Info className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="mr-2 h-4 w-4" />
                Podešavanja
              </Button>
            </div>
          </div>
          <div className="rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-muted)]/30 p-1">
            <p className="mb-2 text-center text-xs font-medium text-[var(--color-muted-foreground)]">
              Izaberite firmu
            </p>
            <div className="flex gap-2">
              {companies.map((c) => (
                <Button
                  key={c.id}
                  variant={selectedCompanyId === c.id ? "default" : "outline"}
                  size="lg"
                  className="flex-1 text-base font-semibold"
                  onClick={() => setSelectedCompany(c.id)}
                >
                  {c.name}
                </Button>
              ))}
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
            companyName={selectedCompany?.name ?? ""}
            onEdit={(card) => { setActiveTab("current"); handleEdit(card); }}
            onDeleteCard={deleteCard}
            onUnarchive={markCardUnarchived}
          />
        ) : (
          <>
        <div className="rounded-lg border-2 border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 px-4 py-2 text-center">
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            Trenutno radite za: <span className="text-[var(--color-primary)]">{selectedCompany?.name ?? "—"}</span>
          </p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-4 py-3 text-sm text-[var(--color-foreground)]">
          <p className="font-medium mb-1">Tok rada:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-[var(--color-muted-foreground)]">
            <li>Dodaj radnike (dugme <strong>Podešavanja</strong> gore desno).</li>
            <li>Ispod unesi prekovremeni rad — izaberi radnika, unesi operacije, <strong>Sačuvaj karticu</strong>.</li>
            <li>Pregledaj sačuvane kartice; zatim <strong>Izvezi u Excel</strong> ili <strong>uvezi tabelu sa vremenom</strong> da obrađuješ.</li>
            <li className="text-xs mt-1">Prečice: <kbd className="rounded bg-[var(--color-muted)] px-1">Ctrl+S</kbd> čuvanje, <kbd className="rounded bg-[var(--color-muted)] px-1">Ctrl+E</kbd> export</li>
          </ol>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-sm font-bold text-[var(--color-primary)]">1</span>
              {editingCardId ? "Izmena kartice (dodaj operacije)" : "Unos prekovremenog rada"}
            </CardTitle>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
              Tekući mesec: <strong>{currentMonth}</strong>
            </p>
            <div className="mt-4 space-y-2">
              <Label>Radnik</Label>
              <WorkerSelect
                workers={workersForCompany}
                selectedId={selectedWorkerId}
                onSelect={setSelectedWorkerId}
                placeholder="Izaberi radnika..."
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {operations.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/30 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
                Nema unetih operacija. Ispod izaberite kako da dodate.
              </p>
            ) : (
              <ul className="space-y-4">
                {operationGroups.map((group) => (
                  <li key={group.date || `empty-${group.operations[0]?.id}`} className="space-y-2">
                    {group.isStandalone ? (
                      <ul className="space-y-3">
                        {group.operations.map((op) => (
                          <li key={op.id}>
                            <OperationRow
                              operation={op}
                              effectiveUkupnoVreme={effectiveUkupnoByOpId.get(op.id)}
                              suggestedNapomene={suggestedNapomene}
                              suggestedRadniNalozi={suggestedRadniNalozi}
                              hideDate={false}
                              hideTimeFields={false}
                              onChange={(updated) => updateOperation(op.id, updated)}
                              onRemove={() => removeOperation(op.id)}
                            />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <>
                        <div className="space-y-3 rounded-lg border-2 border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-4 py-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Label className="text-sm font-semibold shrink-0">Datum:</Label>
                              <Input
                                type="date"
                                value={isNewGroupPlaceholder(group.date) ? "" : group.date}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  updateGroupDate(
                                    group.operations.map((o) => o.id),
                                    e.target.value || ""
                                  )
                                }
                                className="w-40 font-medium"
                              />
                              <span className="text-base font-bold text-[var(--color-foreground)]">
                                {formatDateDisplay(group.date)}
                              </span>
                            </div>
                            <span className="text-xs text-[var(--color-muted-foreground)]">
                              Svi redovi ispod: samo Napomena i Radni nalog. Vreme (Od/Do) unesi ispod.
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => addOperationWithDate(group.date)}
                              className="ml-auto"
                            >
                              + Dodaj red pod ovaj datum
                            </Button>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)]/50 pt-2">
                            <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
                              Jedan blok vremena: Od i Do za ceo dan.
                            </span>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs shrink-0">Od:</Label>
                              <Input
                                type="time"
                                className="w-28"
                                value={group.operations[0]?.pocetak ?? ""}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  updateGroupTime(
                                    group.operations.map((o) => o.id),
                                    "pocetak",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs shrink-0">Do:</Label>
                              <Input
                                type="time"
                                className="w-28"
                                value={group.operations[group.operations.length - 1]?.kraj ?? ""}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  updateGroupTime(
                                    group.operations.map((o) => o.id),
                                    "kraj",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>
                        <ul className="space-y-3">
                          {group.operations.map((op) => (
                            <li key={op.id}>
                              <OperationRow
                                operation={op}
                                effectiveUkupnoVreme={effectiveUkupnoByOpId.get(op.id)}
                                hideTimeFields
                                suggestedNapomene={suggestedNapomene}
                                suggestedRadniNalozi={suggestedRadniNalozi}
                                hideDate
                                onChange={(updated) => updateOperation(op.id, updated)}
                                onRemove={() => removeOperation(op.id)}
                              />
                            </li>
                          ))}
                        </ul>
                        <Button
                          type="button"
                          variant="secondary"
                          size="lg"
                          onClick={() => addOperationWithDate(group.date)}
                          className="w-full border-2 border-dashed border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10 font-semibold py-6 hover:bg-[var(--color-primary)]/20"
                        >
                          <Plus className="mr-2 h-5 w-5" />
                          Dodaj još jedan red (Napomena + Radni nalog) za ovaj datum
                        </Button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={addDayGroup}>
                <Calendar className="mr-2 h-4 w-4" />
                Dodaj operacije za jedan dan
              </Button>
              <Button type="button" variant="outline" onClick={addStandaloneOperation}>
                <Upload className="mr-2 h-4 w-4" />
                Dodaj pojedinačnu operaciju
              </Button>
              {editingCardId && (
                <Button type="button" variant="secondary" onClick={handleCancelEdit}>
                  Odustani
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 border-t border-[var(--color-border)] pt-4">
              <span className="text-sm">
                <span className="text-[var(--color-muted-foreground)]">Radni dani:</span>{" "}
                <span className="font-semibold text-[var(--color-primary)]">{formatHours(totalsForm.workDays)}</span>
              </span>
              <span className="text-sm">
                <span className="text-[var(--color-muted-foreground)]">Vikend:</span>{" "}
                <span className="font-semibold">{formatHours(totalsForm.weekend)}</span>
              </span>
              <span className="text-sm">
                <span className="text-[var(--color-muted-foreground)]">Ukupno:</span>{" "}
                <span className="font-semibold">{formatHours(totalsForm.total)}</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="button" onClick={handleSave} title="Sačuvaj karticu (Ctrl+S)">
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
                const t = computeTotals(card.operations);
                const cardNet = Math.max(0, t.workDays - (card.posleSmeneHours ?? 0));
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
                          Radni dani: {formatHours(t.workDays)} · Vikend: {formatHours(t.weekend)} · Ukupno: {formatHours(t.total)}
                          {card.posleSmeneHours != null && (
                            <> · Neto: {formatHours(cardNet)}</>
                          )}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportSingleCard(card)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Izvezi
                          </Button>
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
              Izvoz i obrada tabele
            </CardTitle>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
              Izvezi kartice u Excel ili uvezi tabelu sa vremenom da obrađuješ.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" onClick={handleExport} title="Izvezi Excel (Ctrl+E)">
              <Download className="mr-2 h-4 w-4" />
              Izvezi tekući mesec (Excel)
            </Button>
            <Button variant="outline" size="sm" onClick={openImportDialog}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Uvezi tabelu sa vremenom
            </Button>
          </CardContent>
        </Card>

        {importResult && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {importResult.success ? "Obrađeno" : "Greška pri obradi"}
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
                              <th className="pr-3 font-medium">Uneto vreme</th>
                              <th className="font-medium">Novo vreme</th>
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
                        <p className="text-sm font-medium">Bez unete kartice ({importResult.unmatchedWorkers.length}):</p>
                        <p className="text-sm text-[var(--color-muted-foreground)]">
                          {importResult.unmatchedWorkers.length <= 8
                            ? importResult.unmatchedWorkers.join(", ")
                            : `${importResult.unmatchedWorkers.slice(0, 5).join(", ")} … i još ${importResult.unmatchedWorkers.length - 5}`}
                        </p>
                      </div>
                    </div>
                  )}
                  <p className="text-sm text-[var(--color-primary)]">
                    Izmenjena tabela je preuzeta automatski.
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
                <span className="text-sm text-[var(--color-muted-foreground)]">Radni dani:</span>
                <span className="ml-2 font-semibold">{formatHours(totalsAllCards.workDays)}</span>
              </div>
              <div>
                <span className="text-sm text-[var(--color-muted-foreground)]">Vikend:</span>
                <span className="ml-2 font-semibold">{formatHours(totalsAllCards.weekend)}</span>
              </div>
              <div>
                <span className="text-sm text-[var(--color-muted-foreground)]">Ukupno:</span>
                <span className="ml-2 font-semibold">{formatHours(totalsAllCards.total)}</span>
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
                <CardTitle>Uvezi tabelu sa vremenom</CardTitle>
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
                  workers={workersForCompany}
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

      {infoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg max-h-[85vh] overflow-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Kako radi aplikacija
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setInfoOpen(false)}>
                Zatvori
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-[var(--color-foreground)]">
              <p className="text-[var(--color-muted-foreground)]">
                Aplikacija služi za evidenciju prekovremenog rada po radnicima: unos sati, izvoz u Excel i obradu tabele sa vremenom.
              </p>
              <div>
                <h4 className="font-semibold mb-2">Dva načina unosa</h4>
                <ul className="list-disc list-inside space-y-1.5 text-[var(--color-muted-foreground)]">
                  <li><strong>Dodaj operacije za jedan dan</strong> — otvara zeleni blok. Unesete datum i vreme (Od / Do) u zaglavlju. U redovima ispod samo <strong>Napomena</strong> i <strong>Radni nalog</strong>. Dugme „Dodaj još jedan red” dodaje nove redove za isti datum.</li>
                  <li><strong>Dodaj pojedinačnu operaciju</strong> — jedan pun red: Datum, Napomena, Radni nalog, Početak, Kraj, Ukupno vreme. Za operacije sa različitim datumima.</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Šta još možete</h4>
                <ul className="list-disc list-inside space-y-1 text-[var(--color-muted-foreground)]">
                  <li>Napomena i Radni nalog nude ranije korišćene vrednosti (predlog)</li>
                  <li>Razlika između radnih dana i vikenda (zbir i u Excelu)</li>
                  <li>Dve firme — MR Engines i TikiVent (odvojeni podaci)</li>
                  <li>Izvoz cele tabele u Excel ili <strong>izvoz samo jedne kartice</strong> (dugme Izvezi na kartici)</li>
                  <li>Uvoz tabele sa vremenom — oduzima uneto vreme (radni dani) od „Posle smene”</li>
                  <li>Backup i restore svih podataka (Podešavanja)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Tok rada</h4>
                <ol className="list-decimal list-inside space-y-2 text-[var(--color-muted-foreground)]">
                  <li>Izaberite firmu (MR Engines ili TikiVent).</li>
                  <li>U Podešavanjima dodajte radnike za tu firmu.</li>
                  <li>Izaberite radnika i dodajte operacije (za jedan dan ili pojedinačne). Sačuvajte karticu (Ctrl+S).</li>
                  <li>Pregledajte sačuvane kartice. Izvezite u Excel (Ctrl+E) ili pojedinačnu karticu (Izvezi).</li>
                  <li>Po potrebi uvezite tabelu sa vremenom da se vrednosti „Posle smene” ažuriraju.</li>
                </ol>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Uvoz tabele</h4>
                <p className="text-[var(--color-muted-foreground)]">
                  Excel sa kolonama Ime, Prezime i Posle smene: za svakog pronađenog radnika aplikacija oduzima njegovo uneto vreme (samo radni dani) od „Posle smene” i preuzimate izmenjenu tabelu.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <SettingsWorkers
            companies={companies}
            selectedCompanyId={selectedCompanyId}
            workers={workersForCompany}
            cardCountByWorkerId={cardCountByWorkerId}
            onCompanyNameChange={(id, name) =>
              setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)))
            }
            onAdd={addWorker}
            onEdit={editWorker}
            onDelete={deleteWorker}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            onClose={() => setSettingsOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
