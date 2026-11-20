# Lofi for Programming

A keyboard-first SoundCloud player for long programming sessions. It combines a painted meadow, a vintage CRT interface, glass controls, and a single-open playlist accordion containing 317 tracks across 11 collections.

## Highlights

- Official SoundCloud Widget API playback
- Ten curated collections from distinct labels, artists, and underground beat communities
- Radio Juicy opens first by default
- Original-resolution artwork for the currently playing SoundCloud track
- Play, pause, seek, volume, mute, shuffle, previous, and next controls
- Automatic playback across collection boundaries
- Shareable track URLs through hash routes
- Favorites stored locally in the browser
- Keyboard-first controls and visible focus states
- Responsive layouts and reduced-motion support
- No backend, account, application secret, or database required

## Keyboard controls

| Key | Action |
| --- | --- |
| `Space` or `K` | Play or pause |
| `Left Arrow` or `J` | Seek backward 10 seconds |
| `Right Arrow` or `L` | Seek forward 10 seconds |
| `Up Arrow` / `Down Arrow` | Adjust volume |
| `N` / `P` | Next or previous track |
| `M` | Mute or unmute |
| `S` | Toggle shuffle |
| `F` | Toggle fullscreen |

## Technology

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Radix UI
- Glassy UI
- SoundCloud Widget API
- Bun

## Local development

Install [Bun](https://bun.sh/) 1.2.14 or newer, then run:

```bash
bun install --frozen-lockfile
bun run dev
```

The Vite development server prints the local URL.

## Validation

Run the same checks used by CI:

```bash
bun run check
```

Individual commands are also available:

```bash
bun run lint
bun run typecheck
bun run build
bun run preview
```

## Project structure

- `src/App.tsx` — application shell, playlist accordion, controls, and artwork handling
- `src/data/` — SoundCloud collection and track metadata
- `src/hooks/` — SoundCloud Widget and CRT sound behavior
- `src/components/glassyui/` — Glassy UI-derived controls
- `public/assets/` — project-specific meadow and television artwork

## Adding or changing playlists

Playlist metadata lives in `src/data/playlists.ts`. Keep each collection public and playable through SoundCloud’s official widget. Do not download or commit audio. Track artwork is requested from SoundCloud at runtime using the playing track’s original artwork URL.

## Deployment

The project is a static Vite application. Build it with:

```bash
bun run build
```

Deploy the generated `dist/` directory to Vercel, Netlify, GitHub Pages, or another static host.

## Licensing and attribution

The source code is available under the [MIT License](LICENSE).

Glassy UI-derived source retains its upstream MIT notice in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). SoundCloud audio, artwork, names, and trademarks remain with their respective rights holders. The project is not affiliated with or endorsed by SoundCloud.

The bundled meadow and television artwork was created by the project owner with ChatGPT assistance and is released under the project’s MIT License. See [ASSETS.md](ASSETS.md).

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and [SECURITY.md](SECURITY.md) before contributing or reporting a vulnerability.
