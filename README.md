# Bedrock Playsound — GitHub Pages

## Quick start (no build)
1) Create a new repo on GitHub (e.g., `bedrock-playsound`).
2) Upload these files to the repo root (this `index.html` is the whole app).
3) Go to **Settings → Pages**:
   - **Source**: Deploy from a branch
   - **Branch**: `main` / **root**
4) Save → Wait ~1 minute → Your site is live at the Pages URL.

### Option B: `docs/` folder
- Put `index.html` inside `docs/` and in Pages settings select `main` / `docs`.

## Notes
- You can drop `sound_definitions.json` or audio files (`.ogg/.wav/.mp3`) onto the page.
- For many/large audios, prefer external hosting (S3/Cloud Storage). Raw GitHub works for small tests.
- If you keep audio in this repo, place under `sounds/` and reference the file URLs directly.
