const STORAGE_KEY = "evidencija-prekovremenog";

export interface StoredOperation {
  id: string;
  datum: string;
  napomena: string;
  radniNalog: string;
  pocetak: string;
  kraj: string;
  ukupnoVreme: number;
}

export interface StoredWorkerCard {
  id: string;
  workerId: string;
  workerName: string;
  companyId?: string;
  month: string;
  operations: StoredOperation[];
  posleSmeneHours: number | null;
  archived?: boolean;
}

export interface StoredCompany {
  id: string;
  name: string;
}

export interface StoredState {
  companies?: StoredCompany[];
  workers: { id: string; name: string; companyId?: string }[];
  cards: StoredWorkerCard[];
  selectedCompanyId?: string | null;
  selectedWorkerId: string | null;
  operations: StoredOperation[];
  posleSmeneHours: number | null;
  editingCardId: string | null;
  theme: string;
}

const DEFAULT_COMPANIES: StoredCompany[] = [
  { id: "mr", name: "MR Engines" },
  { id: "tiki", name: "TikiVent" },
];

const defaultState: StoredState = {
  companies: DEFAULT_COMPANIES,
  workers: [],
  cards: [],
  selectedCompanyId: "mr",
  selectedWorkerId: null,
  operations: [],
  posleSmeneHours: null,
  editingCardId: null,
  theme: "light",
};

declare global {
  interface Window {
    storageApi?: {
      get: (key: string) => Promise<string | undefined>;
      set: (key: string, value: string) => Promise<void>;
    };
  }
}

export function migrateState(parsed: StoredState): StoredState {
  const state = { ...defaultState, ...parsed };
  if (!state.companies?.length) state.companies = DEFAULT_COMPANIES;
  if (!state.selectedCompanyId && state.companies.length > 0) {
    state.selectedCompanyId = state.companies[0].id;
  }
  state.workers = (state.workers ?? []).map((w) => ({
    ...w,
    companyId: w.companyId ?? "mr",
  }));
  const workerCompanyMap: Record<string, string> = {};
  for (const w of state.workers) workerCompanyMap[w.id] = w.companyId ?? "mr";
  state.cards = (state.cards ?? []).map((c) => ({
    ...c,
    companyId: c.companyId ?? workerCompanyMap[c.workerId] ?? "mr",
  }));
  return state;
}

export async function loadState(): Promise<StoredState> {
  try {
    if (typeof window !== "undefined" && window.storageApi) {
      const raw = await window.storageApi.get(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredState;
        return migrateState(parsed);
      }
    } else if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredState;
        return migrateState(parsed);
      }
    }
  } catch (_) {
    // ignore
  }
  return { ...defaultState };
}

export async function saveState(state: StoredState): Promise<void> {
  const raw = JSON.stringify(state);
  if (typeof window !== "undefined" && window.storageApi) {
    await window.storageApi.set(STORAGE_KEY, raw);
  } else if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, raw);
  }
}
