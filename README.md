# umerkhan.io

Personal website and blog built with Astro, deployed on Fly.io.

## Tech Stack

- **Framework**: Astro
- **Styling**: TailwindCSS + DaisyUI
- **Content**: MDX
- **Deployment**: Fly.io (Docker + nginx)

## Features

- Blog with tag filtering and pagination
- CV/Resume page
- Experience timeline with animated status indicators
- Client showcase
- Dark/Light theme toggle
- RSS feed
- Sitemap generation
- Responsive design

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

Deployed on Fly.io:

```bash
fly deploy
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── content/        # Blog posts (MDX)
├── layouts/        # Page layouts
├── lib/            # Utility functions
└── pages/          # Routes
```

## License

MIT
