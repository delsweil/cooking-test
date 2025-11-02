# Cooking Test (Next.js + Drizzle SQLite + Remote Ollama)

## Quick start
```bash
cp .env.example .env.local   # adjust OLLAMA_URL/MODEL
npm install
npx drizzle-kit push
npm run dev
# open http://localhost:3000
```

## What it does
- **DB test**: Inserts and fetches a row from SQLite (WAL enabled).
- **Agent test**: Calls your remote Ollama chat endpoint and stores both turns.

## Notes
- DB file lives at `./data/app.db`.
- Change model/endpoint in `.env.local`.
