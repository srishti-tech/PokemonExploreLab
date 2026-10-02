# Pokémon Lab — UI & Reliability Update

## Run

No build tool or environment variables are required.

Open `index.html` in a modern browser, or serve the folder with:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Included

- Light / Dark / System theme with persistence
- Responsive desktop/tablet/mobile layout
- Collapsible sidebar sections
- Font Awesome icons
- Rotating Poké Ball loading states
- Firebase Authentication for real user registration/login
- Dynamic collection progress
- Online Pokédex with featured records on first open
- Search by Pokémon and complete type results
- Info/evolution research page
- Collection, favorites and shiny tracking
- Team Builder
- Compare
- Type Lab and type matrix
- Simplified damage/stat calculators
- Quick Battle + history
- Mystery Card + persistent recent reveals/streak
- Quiz and Cry Quiz
- Daily Challenge
- Regions, Trainer, Achievements and Analytics
- Recently viewed and XP progression
- Firestore persistence for signed-in trainer data

## Data source / limitations

Pokémon data is fetched from PokéAPI. Internet access is required for live data. There is no private API key.

Authentication is handled by Firebase Authentication. Signed-in trainer data and application state are stored in Firestore under `users/{uid}`.

Battle and calculator mechanics are intentionally simplified and labelled as estimates; they are not a replacement for the official game engine.
