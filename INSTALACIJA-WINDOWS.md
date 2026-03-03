# Windows instalacija (build sa Mac-a)

## Korak 1: GitHub repozitorijum

Projekt mora biti na GitHub-u (npr. `github.com/tvoj-user/evidencija-prekovremenog`).

## Korak 2: Podešavanje permisija

1. Idi u **Settings** → **Actions** → **General**
2. Skroluj do **Workflow permissions**
3. Izaberi **Read and write permissions**
4. Sačuvaj

## Korak 3: Pokretanje build-a

**Opcija A — ručno:**
1. **Actions** → **Build Windows installer**
2. **Run workflow** → **Run workflow**

**Opcija B — push na release:**
```bash
git push origin release
```

## Korak 4: Preuzimanje instalera

1. Kada workflow završi (zelena kvačica), idi u **Releases**
2. Otvori najnoviji draft release
3. Preuzmi **Evidencija prekovremenog rada_0.1.0_x64-setup.nsis.zip** ili **.msi** fajl
4. Raspakuj i pokreni instalaciju — korisnik samo klikne „Instaliraj” i gotovo

## Prvi put?

Ako nemaš `release` granu:
```bash
git checkout -b release
git push -u origin release
```
