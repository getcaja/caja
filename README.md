<p align="center">
  <img src="caja-icon.png" alt="Caja" width="80" />
</p>

<h1 align="center">Caja</h1>

<p align="center">
  Visual layout editor for building UI with Tailwind CSS
</p>

<p align="center">
  <a href="https://github.com/getcaja/caja/releases">Download</a> &middot;
  <a href="https://github.com/getcaja/caja/issues">Issues</a>
</p>

---

![Caja Screenshot](Screenshot.png)

## What is Caja?

Caja is a native desktop design tool for building real UIs visually. Design with flexbox, grid, spacing, and typography — everything outputs clean, production-ready HTML + Tailwind CSS.

- **Visual layout** — Flexbox and grid controls, spacing, sizing, and responsive design
- **Tailwind native** — Every property maps to real Tailwind classes. What you see is what you export
- **AI-powered** — Built-in MCP server lets Claude Code design directly in Caja
- **Native macOS app** — Fast, offline, local file storage. Built with Tauri
- **Multi-page** — Create full sites with multiple pages and routing
- **Patterns** — Save and reuse component patterns with override slots

## Getting Started

### Download

Grab the latest release from the [Releases page](https://github.com/getcaja/caja/releases).

### Build from Source

```bash
git clone https://github.com/getcaja/caja.git
cd caja
npm install
npm run tauri:dev
```

**Requirements:** Node.js 18+, Rust 1.70+

### Claude Code Integration

Caja includes a built-in MCP server. Click the plug icon in the title bar or run:

```
Ask Claude: "Design a landing page in Caja"
```

All 33+ MCP tools are available — create frames, style with Tailwind, manage pages, export patterns, and more.

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4
- **Desktop:** Tauri v2 (Rust)
- **UI:** Radix primitives, Lucide icons
- **AI:** Model Context Protocol (MCP)

## License

MIT