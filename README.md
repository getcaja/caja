<p align="center">
  <img src="caja-icon.png" alt="Caja" width="80" />
</p>

<h1 align="center">Caja</h1>

<p align="center">
  <strong>Design, and done.</strong>
</p>

<p align="center">
  A design tool built for the AI era. Your browser engine is the canvas,<br>no middleware, no translation layers. Design by hand, delegate to AI, or both.
</p>

<p align="center">
  <a href="https://getcaja.app">Website</a> &middot;
  <a href="https://docs.getcaja.app">Docs</a> &middot;
  <a href="https://github.com/getcaja/caja/releases">Download</a> &middot;
  <a href="https://github.com/getcaja/caja/issues">Issues</a>
</p>

---

![Caja Screenshot](Screenshot.png)

## No Middle Man

Your designs are the implementation. Real HTML, real CSS, real Tailwind. No rebuild, no translation layer. Every property on the canvas maps to a real Tailwind class, and every class maps back to the canvas.

## Built for You and Agents

Design by hand or connect Claude, Cursor, or any AI agent via MCP. Every change appears on canvas in real time. You and agents are both first-class citizens.

## Features

- **Tailwind CSS v4** — Design visually, get real tokens. `gap-4` not `gap-[16px]`
- **Components** — Save any frame as a reusable component with named slots. Export `.cjl` libraries
- **Responsive** — Large-first design with three breakpoints (LG, MD, SM)
- **Multi-page** — Multiple pages with routing and link navigation
- **Export** — JSX, HTML snippets, or full pages with embedded Tailwind CSS
- **Native macOS** — Fast, offline, local files. Built with Tauri

## Getting Started

### Download

Grab the latest release from the [Releases page](https://github.com/getcaja/caja/releases). Free and open source.

### Build from Source

```bash
git clone https://github.com/getcaja/caja.git
cd caja
npm install
npm run tauri:dev
```

**Requirements:** Node.js 18+, Rust 1.70+

### AI Integration

Caja includes a built-in MCP server with 31 tools. Add it to Claude Code, Cursor, or any MCP client:

```json
{
  "mcpServers": {
    "caja": {
      "command": "/Applications/Caja.app/Contents/Resources/caja-mcp"
    }
  }
}
```

Build layouts, style with Tailwind, manage pages, handle responsive overrides, and more — all from your agent.

## Tech Stack

- [Tauri v2](https://v2.tauri.app/) — Native macOS app
- [React 19](https://react.dev/) — UI framework
- [Tailwind CSS v4](https://tailwindcss.com/) — Utility-first CSS
- [Radix UI](https://www.radix-ui.com/) — Accessible UI primitives
- [MCP](https://modelcontextprotocol.io/) — AI agent integration

## License

[MIT](LICENSE)