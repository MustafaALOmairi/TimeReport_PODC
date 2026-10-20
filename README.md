# Time Report – Port of Duqm

Paperless shift reporting: PHP + MySQL backend, single-page web frontend.

## Install (XAMPP / WAMP / any PHP 8.1+ host)
1. Copy this folder to your web root (e.g. `htdocs/time-report`).
2. Import `schema.sql` into MySQL (phpMyAdmin → Import).
3. Edit `config.php` with your DB host / user / password.
4. Put your logo at `assets/logo.png`.
5. Open `http://localhost/time-report/`.

## Files
- `index.html`, `style.css`, `app.js` – UI (Home, New Report, Discharge List, Advanced Search)
- `api.php` – JSON API (list, meta, get, save, delete, pams)
- `schema.sql` – tables: time_reports, work_activities, manpower, equipment_usage, discharge_lists, discharge_items

## Features
- Time Report form: MV, VOY, date, shift, berth, bollard, yard, work activities (auto total hours), what we do, foreman/tallyman/docker, equipment & operators
- Save / edit / view / delete; PAMS Done toggle
- Advanced search with date, shift, yard, berth filters
- Export as image (PNG), PDF, or Print (A4)
- Responsive (works on Android browsers; wrap with a WebView / Electron for an app)

## Notes
- No login yet: add authentication before exposing to a network.
- Export libraries load from cdnjs; download them locally for offline use.

## Hosting on GitHub Pages (Supabase backend)
GitHub Pages cannot run PHP/MySQL, so use Supabase (free) for storage:
1. Create a project at supabase.com.
2. SQL Editor → paste `supabase.sql` → Run.
3. Project Settings → API: copy the Project URL and the anon/publishable key.
4. Put them in `config.js` (`SUPABASE_URL`, `SUPABASE_KEY`), commit and push.
The anon key is meant to be public, but the SQL policies allow anyone with the site link to read/write. Add login before real use.
