# recurscent-web

Public website for **Recurscent, Inc.** (`https://recurscent.com`).

This repository contains only public-facing website source and brand assets. Internal pitch decks, business plans, and investor documents live in the separate `recurscent` repository.

## Build

```bash
bun run build
```

Output is written to `dist/`.

## Local Preview

```bash
bun run serve
```

Then open `http://127.0.0.1:8787/`.

## Fleet Pages Preview

From an authorized fleet host (`saturn`, `earth`, `mercury`, `jupiter`):

```bash
bun run preview:fleet
```

## Production Hosting

Deploy `dist/` to Cloudflare Pages with custom domains `recurscent.com` and `www.recurscent.com` (either directly from GitHub via Cloudflare Pages or through a registered persistent target in `fleet-infra/registry/fleet-pages.json`).
