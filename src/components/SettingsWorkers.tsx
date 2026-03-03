import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import type { Worker } from "@/types";

interface SettingsWorkersProps {
  workers: Worker[];
  /** Broj sačuvanih kartica po radniku (workerId -> count) */
  cardCountByWorkerId?: Record<string, number>;
  onAdd: (name: string) => void;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function SettingsWorkers({
  workers,
  cardCountByWorkerId = {},
  onAdd,
  onEdit,
  onDelete,
  onClose,
}: SettingsWorkersProps) {
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

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Radnici</CardTitle>
          <CardDescription>Dodajte, izmenite ili obrišite radnike.</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Zatvori
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  );
}
