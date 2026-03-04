import { useRef, useState } from "react";
import { Plus, Pencil, Trash2, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Worker, Company } from "@/types";
import type { StoredState } from "@/lib/storage";
import { useToast } from "@/components/Toast";

interface SettingsWorkersProps {
  companies: Company[];
  selectedCompanyId: string | null;
  workers: Worker[];
  /** Broj sačuvanih kartica po radniku (workerId -> count) */
  cardCountByWorkerId?: Record<string, number>;
  onCompanyNameChange: (companyId: string, name: string) => void;
  onAdd: (name: string) => void;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onExportBackup: () => void;
  onImportBackup: (state: StoredState) => void;
  onClose: () => void;
}

export function SettingsWorkers({
  companies,
  selectedCompanyId,
  workers,
  cardCountByWorkerId = {},
  onCompanyNameChange,
  onAdd,
  onEdit,
  onDelete,
  onExportBackup,
  onImportBackup,
  onClose,
}: SettingsWorkersProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = (id: string) => {
    onDelete(id);
    setDeleteConfirmId(null);
  };

  const handleAdd = () => {
    const name = newName.trim();
    if (name) {
      onAdd(name);
      setNewName("");
    }
  };

  const startEdit = (w: Worker) => {
    setEditingId(w.id);
    setEditName(w.name);
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      onEdit(editingId, editName.trim());
      setEditingId(null);
      setEditName("");
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!window.confirm("Uvoz backup-a zamenjuje sve trenutne podatke. Nastaviti?")) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as StoredState;
      if (!parsed || typeof parsed !== "object") throw new Error("Neispravan format");
      onImportBackup(parsed);
      onClose();
    } catch (err) {
      toast("Greška pri uvozu backup-a. Proverite da li je fajl ispravan.", "error");
    }
  };

  return (
    <Card className="w-full max-w-lg max-h-[90vh] overflow-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Podešavanja</CardTitle>
          <CardDescription>Imena firmi i radnici za izabranu firmu.</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Zatvori
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 rounded-lg border border-[var(--color-border)] p-4">
          <h3 className="font-medium text-sm">Imena firmi</h3>
          {companies.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <Label htmlFor={`company-${c.id}`} className="w-24 shrink-0 text-sm">
                {c.id === "mr" ? "Prva firma" : c.id === "tiki" ? "Druga firma" : c.id}
              </Label>
              <Input
                id={`company-${c.id}`}
                value={c.name}
                onChange={(e) => onCompanyNameChange(c.id, e.target.value)}
                placeholder="Naziv firme"
                className="flex-1"
              />
            </div>
          ))}
        </div>
        <div className="space-y-3 rounded-lg border border-[var(--color-border)] p-4">
          <h3 className="font-medium text-sm">Backup (obe firme)</h3>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Izvezi ili uvezi sve podatke — radnici i kartice za obe firme.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onExportBackup}>
              <Download className="mr-2 h-4 w-4" />
              Izvezi backup
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button type="button" variant="outline" size="sm" onClick={handleImportClick}>
              <Upload className="mr-2 h-4 w-4" />
              Uvezi backup
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="font-medium text-sm">
            Radnici za {selectedCompany?.name ?? "izabranu firmu"}
          </h3>
        <div className="flex gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="new-worker">Novi radnik</Label>
            <Input
              id="new-worker"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ime i prezime"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={handleAdd} size="icon" title="Dodaj">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ul className="space-y-2">
          {workers.length === 0 ? (
            <li className="py-4 text-center text-sm text-[var(--color-muted-foreground)]">
              Nema unetih radnika. Dodajte prvog radnika iznad.
            </li>
          ) : (
            workers.map((w) => (
              <li
                key={w.id}
                className={cn(
                  "flex items-center gap-2 rounded-md border border-[var(--color-border)] p-2"
                )}
              >
                {editingId === w.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") {
                          setEditingId(null);
                          setEditName("");
                        }
                      }}
                      autoFocus
                    />
                    <Button type="button" size="sm" onClick={saveEdit}>
                      Sačuvaj
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingId(null);
                        setEditName("");
                      }}
                    >
                      Odustani
                    </Button>
                  </>
                ) : deleteConfirmId === w.id ? (
                  <>
                    <span className="flex-1 text-sm">
                      Obrisati {w.name}?
                      {(cardCountByWorkerId[w.id] ?? 0) > 0 && (
                        <span className="block text-xs text-[var(--color-muted-foreground)]">
                          Obrišće se i {(cardCountByWorkerId[w.id] ?? 0)} sačuvanih kartica.
                        </span>
                      )}
                    </span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => confirmDelete(w.id)}
                    >
                      Da, obriši
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmId(null)}
                    >
                      Ne
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">{w.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(w)}
                      title="Izmeni"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(w.id)}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      title="Obriši"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </li>
            ))
          )}
        </ul>
        </div>
      </CardContent>
    </Card>
  );
}
