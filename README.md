# Revelio 🧩

> Turn any photo into a nonogram puzzle. Share it with friends. Let them solve it to reveal the hidden photo.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=YOUR_GITHUB_REPO_URL&env=NEXT_PUBLIC_BASE_URL&envDescription=Your%20deployed%20app%20URL%2C%20e.g.%20https%3A%2F%2Frevelio.vercel.app)

---

## What Is This?

Revelio converts any photo into a nonogram (picross) logic puzzle.
You share a link. Your friend solves the grid. The original photo is revealed.
No accounts. No database. Everything lives in the share link.

---

## How It Works

1. **Upload** any photo (JPG, PNG, WebP, GIF)
2. **Pick a grid size** — from Sketch (rough) to Ultra (detailed)
3. **Share the link** — works in iMessage, WhatsApp, anywhere
4. **Friend solves** the nonogram puzzle
5. **Photo reveals** when the puzzle is complete

---

## Tech Stack

| Thing | What |
|-------|------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Compression | LZ-String |
| Social Previews | @vercel/og (Edge Runtime) |
| Fonts | Fraunces, DM Sans, DM Mono, Caveat |
| Hosting | Vercel |

---

## Running Locally

```bash
git clone https://github.com/YOUR_USERNAME/revelio
cd revelio
npm install
cp .env.local.example .env.local
# Edit .env.local and set NEXT_PUBLIC_BASE_URL=http://localhost:3000
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploying to Vercel

### One-click deploy
Click the Deploy button at the top of this README.
Set `NEXT_PUBLIC_BASE_URL` to your Vercel deployment URL when prompted.

### Manual deploy
```bash
npm install -g vercel
vercel
```

Set environment variable in Vercel dashboard:
```
NEXT_PUBLIC_BASE_URL = https://your-app.vercel.app
```

---

## How the Image Processing Works

All image processing happens **entirely in the browser** — no photos are ever sent to a server.

1. **EXIF orientation correction** — fixes iPhone portrait photos that are secretly rotated
2. **Perceptual greyscale** — uses ITU-R BT.709 luminance formula, not simple RGB average
3. **Area-averaging downsample** — averages all source pixels per target cell for clean results
4. **Otsu's method** — automatically finds the optimal threshold for each specific image
5. **Adaptive fill correction** — nudges threshold if fill ratio falls outside 15–85% sweet spot
6. **Clue generation** — produces standard nonogram run-length clues with edge case handling
7. **Solvability scoring** — measures how many cells are immediately deterministic by logic

---

## Privacy

Photos never leave your device during puzzle creation.
The puzzle solution grid and a small thumbnail are encoded into the share URL using LZ-String compression.
No database. No user accounts. No tracking.

---

## License

MIT
