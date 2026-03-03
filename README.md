# Evidencija prekovremenog rada

Desktop aplikacija za evidenciju prekovremenog rada (Tabela B) sa uvozom „Posle smene” iz Excel Tabele A.

## Tech stack

- **React + Vite** — UI (TypeScript)
- **Tailwind CSS** — stilizacija, svetla tema
- **shadcn-style komponente** — Button, Input, Card, Label
- **xlsx (SheetJS)** — uvoz Excel fajlova
- **Tauri 2** — pakovanje za desktop (Windows, macOS)

## Pokretanje (web)

```bash
npm install
npm run dev
```

Aplikacija je dostupna na http://localhost:5173.

## Pakovanje za desktop (Tauri)

### Windows (sa Mac-a — preko GitHub Actions)

1. Otvori repozitorijum na GitHub-u.
2. Idi u **Actions** → **Build Windows installer**.
3. Klikni **Run workflow** (ili push na `release` granu).
4. Kada build završi, u **Releases** preuzmi `.msi` ili `.exe` instalaciju.

### Lokalno (Mac)

```bash
npm run tauri:build
```

Izlaz: `src-tauri/target/release/bundle/` (`.app` i `.dmg` za macOS).

### Razvoj (Tauri)

```bash
npm run tauri:dev
```

## Funkcionalnosti

### 1. Unos prekovremenog rada (Tabela B)

- **Radnik** — pretraživač (searchable dropdown) na vrhu; radnici se dodaju/izmenjuju/brišu u „Radnici” (Settings).
- **Operacije** — za svaku operaciju:
  - **Datum** — samo radni dani (subota i nedelja su blokirani, upozorenje ako korisnik izabere vikend).
  - **Napomena**, **Radni nalog** — slobodan tekst.
  - **Početak** / **Kraj** — vreme (HH:MM); **Ukupno vreme** se automatski računa.
- **+ Dodaj operaciju** — neograničen broj operacija; svaka se može pojedinačno ukloniti.
- **Sati** — ukupan zbir „Ukupno vreme” za sve operacije.

### 2. Uvoz Tabele A (Excel)

- Dugme **„Uvezi Tabelu A”** — otvara dijalog za izbor `.xlsx` ili `.xls` fajla.
- Aplikacija traži kolonu tačno imenovanu **„Posle smene”** (bilo gde u tabeli).
- Za izabranog radnika (ili prvi red ako radnik nije izabran) uzima vrednost iz te kolone i koristi je kao **odbitak** od ukupnog prekovremenog rada.
- Ako kolona „Posle smene” ne postoji, prikazuje se jasna poruka o grešci.

### Rezultat

- **Ukupno sati** — zbir svih „Ukupno vreme”.
- **Posle smene (odbitak)** — vrednost uvezena iz Excel-a (ako postoji).
- **Neto prekovremeno** — Ukupno sati − Posle smene.

## Čuvanje podataka

- **Web:** `localStorage`.
- **Desktop (Tauri):** `localStorage` u WebView-u (podaci ostaju na računaru).

Svi podaci (radnici, operacije, izabrani radnik, „Posle smene”) se automatski čuvaju i učitavaju pri sledećem otvaranju.
