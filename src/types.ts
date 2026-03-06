export interface Company {
  id: string;
  name: string;
}

export interface Worker {
  id: string;
  name: string;
  companyId: string;
}

export interface Operation {
  id: string;
  datum: string; // YYYY-MM-DD
  napomena: string;
  radniNalog: string;
  pocetak: string; // HH:MM
  kraj: string;   // HH:MM
  ukupnoVreme: number; // hours (decimal)
  /** true = pojedinačna operacija (pun red: datum, napomena, nalog, od–do, ukupno) */
  isStandalone?: boolean;
}

/** Sačuvana kartica za jednog radnika (jedan sheet u Excelu). */
export interface WorkerCard {
  id: string;
  workerId: string;
  workerName: string;
  companyId: string;
  /** Mesec u formatu YYYY-MM (za prikaz i izvoz). */
  month: string;
  operations: Operation[];
  posleSmeneHours: number | null;
  /** Da li je kartica prebačena u arhivu (ručno označeno). */
  archived?: boolean;
}

export interface AppState {
  companies: Company[];
  workers: Worker[];
  /** Sačuvane kartice (po radnicima / mesecima). */
  cards: WorkerCard[];
  /** Izabrana firma (MR Engines / TikiVent). */
  selectedCompanyId: string | null;
  /** Trenutni formular: izabrani radnik i operacije (pre Sačuvaj ili u režimu Edit). */
  selectedWorkerId: string | null;
  operations: Operation[];
  posleSmeneHours: number | null;
  /** Ako je setovan, Sačuvaj ažurira ovu karticu. */
  editingCardId: string | null;
  /** 'light' | 'dark' */
  theme: string;
}
