# Blabarsdiscgolf

Lokal version av hemsidan med Supabase som databas.

## Supabase

1. Skapa ett Supabase-projekt.
2. Kör SQL:en i `supabase-schema.sql` i Supabase SQL Editor.
3. Öppna `supabase-config.js` och fyll i:
   - `url`: Project URL från Supabase.
   - `anonKey`: Project API anon public key.

Tabellen heter `scores` och motsvarar den gamla SheetDB-strukturen:

- `namn`
- `hole1` till `hole9`
- `totalt`

Om Supabase inte är konfigurerat eller inte går att nå använder sidan `localStorage` som fallback.
