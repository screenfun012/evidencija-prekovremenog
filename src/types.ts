export interface Worker {
  id: string;
  name: string;
}

export interface Operation {
  id: string;
  datum: string; // YYYY-MM-DD
  napomena: string;
  radniNalog: string;
  pocetak: string; // HH:MM
  kraj: string;   // HH:MM
  ukupnoVreme: number; // hours (decimal)
}

/** Sačuvana kartica za jednog radnika (jedan sheet u Excelu). */
export interface WorkerCard {
  id: string;
  workerId: string;
  workerName: string;
  /** Mesec u formatu YYYY-MM (za prikaz i izvoz). */
  month: string;
  operations: Operation[];
  posleSmeneHours: number | null;
  /** Da li je kartica prebačena u arhivu (ručno označeno). */
  archived?: boolean;
}

export interface AppState {
  workers: Worker[];
  /** Sačuvane kartice (po radnicima / mesecima). */
  cards: WorkerCard[];
  /** Trenutni formular: izabrani radnik i operacije (pre Sačuvaj ili u režimu Edit). */
  selectedWorkerId: string | null;
  operations: Operation[];
  posleSmeneHours: number | null;
  /** Ako je setovan, Sačuvaj ažurira ovu karticu. */
  editingCardId: string | null;
  /** 'light' | 'dark' */
  theme: string;
}
