# Push na GitHub i Windows build

## 1. Kreiraj repozitorijum na GitHub-u

1. Idi na https://github.com/new
2. **Repository name:** `evidencija-prekovremenog`
3. Ostavi prazno (bez README, .gitignore)
4. Klikni **Create repository**

## 2. Poveži i push-uj

```bash
cd /Users/nikola/evidencija-prekovremenog

git remote add origin https://github.com/TVOJ_USERNAME/evidencija-prekovremenog.git
git push -u origin main
git push origin release
```

(Zameni `TVOJ_USERNAME` sa svojim GitHub korisničkim imenom.)

## 3. Podešavanje permisija

1. Na GitHub-u: **Settings** → **Actions** → **General**
2. **Workflow permissions** → izaberi **Read and write permissions**
3. **Save**

## 4. Pokreni Windows build

1. **Actions** → **Build Windows installer**
2. **Run workflow** → **Run workflow**
3. Sačekaj 5–10 minuta

## 5. Preuzmi instalaciju

1. **Releases** (desna strana)
2. Otvori draft release
3. Preuzmi `.msi` ili `.exe` fajl
4. Na Windows-u: pokreni i instaliraj
