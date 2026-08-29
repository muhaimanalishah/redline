# Redline

Redline is a minimalist, distraction-free Markdown editor featuring in-place AI writing assistance and inline redline diff reviews. Instead of replacing text wholesale or requiring external chat windows, Redline lets you review AI edits directly within your document using visual diff highlights and granular accept or reject controls.

**[Live Demo](https://redline-delta-ruby.vercel.app/)**

<p align="center">
  <img src=".github/readme-assets/editor-dark.jpg" alt="Redline editor in dark theme with workspace sidebar" width="49%" />
  <img src=".github/readme-assets/editor-light.jpg" alt="Redline editor in light theme with workspace sidebar" width="49%" />
</p>

---

## Features

* **Inline Redline Diffs:** Inspect additions and deletions visually before committing them. Accept or reject changes per block or in bulk.
* **ProseMirror and TipTap Core:** Rich-text editing with bidirectional Markdown synchronization, tables, task lists, code blocks, blockquotes, links, and images.
* **Notion-Style Title and Placeholders:** Borderless auto-resizing document title with seamless keyboard navigation and contextual empty line placeholders.
* **Command Palette Search:** Global search modal (<kbd>Cmd/Ctrl + K</kbd> or <kbd>Cmd/Ctrl + P</kbd>) with real-time keyword matching across titles and body text, excerpt snippets, and bold match highlighting.
* **Document Management Sidebar:** Multi-page sidebar supporting document creation, in-place renaming, pinning, archiving, and trash restoration.
* **Dual Database Persistence (SQLite & PostgreSQL):** Runs on zero-config local SQLite (`./db/local.db`) out of the box, or connects directly to PostgreSQL when a `DATABASE_URL` is configured.
* **Demo Mode:** Run Redline in simulated mode with zero external API dependencies (`NEXT_PUBLIC_DEMO_MODE=true`) featuring realistic streaming AI diffs and voice dictation.
* **AI Transformation Modes:**
  * **Presets:** Proofread and fix, shorten, expand, summarize, tone adjustment (professional, casual, direct, academic), bullet lists, and tables.
  * **Custom Instructions:** Custom prompts for in-place text replacement or generation from scratch.
* **Voice Transcription:** In-memory audio recording with live waveform visualizer, pause/resume support, and direct transcription insertion.
* **Interactive Controls:** Floating morphing dock powered by Framer Motion, keyboard-driven navigation, and raw Markdown source view toggle.
* **Theme and Customization:** Multiple color themes (Dark, Charcoal, Nord, Sepia, High Contrast, Light) and viewport zoom controls (75% to 150%).

---

## Tech Stack

* **Framework:** Next.js (App Router), React 19, TypeScript
* **Rich Text:** TipTap v3, ProseMirror, tiptap-markdown
* **Database & ORM:** Drizzle ORM, SQLite (`better-sqlite3`), PostgreSQL (`postgres.js`)
* **AI Integration:** Vercel AI SDK (`ai`), `@ai-sdk/openai`
* **Animations & UI:** Framer Motion, CSS Modules, Lucide Icons, Sonner

---

## Getting Started

### Prerequisites

* Node.js 18+ or later
* npm, pnpm, or yarn
* An OpenAI API Key (optional if running in Demo Mode)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/muhaimanalishah/redline.git
   cd redline
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env.local` file in the root directory:
   ```env
   # Set to true to run fully offline with simulated AI and zero API keys
   NEXT_PUBLIC_DEMO_MODE=false

   # OpenAI API configuration (required for live AI execution)
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-4o-mini
   OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe

   # Optional PostgreSQL connection (defaults to local SQLite if omitted)
   # DATABASE_URL=postgresql://user:password@localhost:5432/redline
   ```

4. Push the database schema:
   ```bash
   npm run db:push
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Scripts

* `npm run dev`: Starts the Next.js development server.
* `npm run build`: Builds the application for production.
* `npm run start`: Starts the production build.
* `npm run lint`: Runs ESLint checks.
* `npm run typecheck`: Runs TypeScript type validation.
* `npm run db:push`: Pushes schema changes to the active database (SQLite or PostgreSQL).
* `npm run db:generate`: Generates database migration files.

---

## License

MIT
