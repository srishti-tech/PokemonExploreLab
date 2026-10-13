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


## Added in this enhancement (original pages preserved)

- **Pokémon Wiki**: search by name or Pokédex number, filter by type/generation, browse paginated records, and open the existing detailed Pokémon research modal.
- **Trainer Encyclopedia**: curated profiles for popular trainers with region/specialty filters and clickable team Pokémon. Trainer teams are representative and may vary by continuity.
- **Pokémon Library**: searchable book discovery shelf with categories and links to find official editions. It does not distribute copyrighted book files.
- New styling is scoped under `plx-` class names to avoid changing the appearance of existing pages.
- These additions use the existing PokéAPI data layer and reuse the existing Pokémon detail modal. Trainer portraits use remote images with initials fallback.


## Friend Battle (new)

- Private six-character room codes let two signed-in trainer accounts battle from separate browsers/devices.
- Firestore snapshot listeners keep room status, Pokémon selection, HP, turn ownership, and battle logs synchronized in real time.
- Each trainer chooses a Pokémon; the host gets the first turn, and players can attack or defend. The winner is recorded in the existing battle history and receives XP.
- The original Quick Battle and other existing pages remain in place.
- **Required setup:** merge the `battleRooms` rules from `FIRESTORE_SETUP.md` into the existing Firestore rules. The feature cannot work online until Firestore permits authenticated room reads/writes.
- The battle is a simplified casual client-driven model, not a cheat-proof competitive battle engine.
