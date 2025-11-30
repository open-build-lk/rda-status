# Sri Lanka Road Network Status

A real-time platform for tracking road infrastructure damage across Sri Lanka's national road network. This platform displays road closures, damage reports, and traffic disruptions caused by natural disasters, enabling citizens to plan travel routes and authorities to coordinate repair efforts.

## Project Scope

This platform serves as a public information system for road network status in Sri Lanka:

- **Real-time damage visualization** - Interactive map showing blocked and damaged road segments
- **Damage classification** - Categorization by type (flooding, landslides, washouts, collapses, blockages)
- **Severity levels** - Clear indication of damage severity from low to critical
- **Province-level coverage** - All 9 provinces with national (A/B roads) and provincial road data

### Data Source

Road damage data is provided by the **Ministry of Transport, Highways and Urban Development** through the Road Development Authority (RDA).

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4
- **Maps**: Leaflet with OpenStreetMap (free, unlimited usage)
- **Backend**: Hono on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite) with Drizzle ORM
- **Storage**: Cloudflare R2 for media files
- **Hosting**: Cloudflare Workers (edge deployment)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (package manager and runtime)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### Installation

```bash
# Install dependencies
bun install
```

### Development

Start the development server:

```bash
bun dev
```

Your application will be available at [http://localhost:5173](http://localhost:5173).

### Database

Generate migrations:

```bash
bun run db:generate
```

Apply migrations locally:

```bash
bun run db:migrate
```

Open Drizzle Studio:

```bash
bun run db:studio
```

## Production

Build for production:

```bash
bun run build
```

Deploy to Cloudflare Workers:

```bash
bun run deploy
```

## Project Structure

```
src/
├── react-app/          # Frontend React application
│   ├── components/     # Reusable UI components
│   │   ├── layout/     # Header, Footer, Navigation
│   │   └── map/        # Map components (DisasterMap, MapLegend)
│   ├── data/           # Static data (road segments, snapped paths)
│   ├── pages/          # Page components
│   └── stores/         # Zustand state stores
├── worker/             # Backend Hono API
│   ├── db/             # Database schema and migrations
│   ├── middleware/     # Auth and other middleware
│   └── routes/         # API route handlers
└── shared/             # Shared types and constants
scripts/
└── snap-roads.ts       # One-time script to pre-compute road geometries
```

## Features

- **Interactive Map** - Pan, zoom, and click on road segments to view damage details
- **Road Geometry** - Damage displayed along actual road paths (not straight lines)
- **Damage Markers** - Visual indicators at damage locations with type-specific icons
- **Severity Coloring** - Color-coded road segments (yellow/orange/red/dark red)
- **Mobile Responsive** - Works on desktop and mobile devices
- **Dark Mode** - Supports system dark mode preference

## Contributing

We welcome contributions! Please feel free to submit issues and pull requests.

## License

This project is open source and available under the MIT License.

---

**This platform is developed and maintained by volunteers** as part of the OpenRebuildLK initiative to support disaster recovery efforts in Sri Lanka.
