# Ranvier MUD Editor

A web-based editor for creating and managing RanvierMUD bundles, areas, rooms, NPCs, and items.

## Features

- 📦 Bundle management (create, view, edit)
- 🗺️ Area management
- 🚪 Room editor
- 👤 NPC editor
- 🎒 Item editor
- 📝 YAML file editing with live preview

## Installation

Make sure you have [Bun](https://bun.sh) installed.

```bash
cd editor
bun install
```

## Running

```bash
bun run dev
```

The editor will be available at `http://localhost:3000`

## Usage

1. Open the editor in your browser
2. Click on a bundle to view its areas
3. Select an area to view its resources (rooms, NPCs, items)
4. Click on any resource to edit it
5. Use the "+" buttons to create new resources

## API

The editor provides a REST API at `/api`:

- `GET /api/bundles` - List all bundles
- `POST /api/bundles` - Create a new bundle
- `GET /api/bundles/:bundleName/areas` - List areas in a bundle
- `POST /api/bundles/:bundleName/areas` - Create a new area
- `GET /api/bundles/:bundleName/areas/:areaName/rooms` - List rooms
- `POST /api/bundles/:bundleName/areas/:areaName/rooms` - Create/update room
- Similar endpoints for NPCs and Items
