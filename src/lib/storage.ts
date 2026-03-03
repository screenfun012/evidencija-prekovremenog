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
  month: string;
  operations: StoredOperation[];
  posleSmeneHours: number | null;
  archived?: boolean;
}

export interface StoredState {
  workers: { id: string; name: string }[];
  cards: StoredWorkerCard[];
  selectedWorkerId: string | null;
  operations: StoredOperation[];
  posleSmeneHours: number | null;
  editingCardId: string | null;
  theme: string;
}

const defaultState: StoredState = {
  workers: [],
  cards: [],
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

export async function loadState(): Promise<StoredState> {
  try {
    if (typeof window !== "undefined" && window.storageApi) {
      const raw = await window.storageApi.get(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredState;
        return { ...defaultState, ...parsed };
      }
    } else if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredState;
        return { ...defaultState, ...parsed };
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
