# SignageList

A curated directory of 548+ digital signage software, CMS, platforms and tools.

Perfect for managing, scheduling, and displaying content across screens, smart displays, kiosks, menuboards, dashboards and more!

**[Browse the directory](https://signagelist.org)** | **[Submit a product](SUBMISSION_GUIDE.md)**

## Tech Stack

- **[Hugo](https://gohugo.io/)** — Static site generator with Content Adapters
- **[Bun](https://bun.sh/)** — Package manager and TypeScript runtime
- **[Tailwind CSS v4](https://tailwindcss.com/)** — Utility-first CSS
- **[Biome](https://biomejs.dev/)** — Linting and formatting

## Getting Started

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Build for production
hugo --minify
```

## Data

Product data lives as individual YAML files in `data/products/`. Each file is the single source of truth for one product. Hugo Content Adapters generate pages directly from these files — no preprocessing pipeline needed.

```bash
# Validate all product data
bun run check

# Add a new product interactively
bun run add
```

## Add a Product

See our **[Submission Guide](SUBMISSION_GUIDE.md)** for detailed instructions on how to add new products or update existing ones.

We accept submissions through GitHub Issues to maintain a transparent curation process.

## Contributions

We welcome contributions from developers experienced with Hugo to help enhance this project.

If you're not a programmer but have an idea or suggestion, feel free to create an issue and share your thoughts. We'd love to hear your feedback and consider it for future improvements!

## Fire OS Notes

For products supporting Android, we also include Fire OS compatibility. Since Fire OS is based on Android, most Android apps work seamlessly on Amazon Fire devices.

Learn more: [Fire OS Overview](https://developer.amazon.com/docs/fire-tv/fire-os-overview.html)

## License

The product dataset (`data/products/`) is licensed under the [Open Data Commons Open Database License (ODbL) v1.0](LICENSE-DATA).

### Data Attribution

"SignageList dataset © 514sid and contributors, licensed under ODbL"

## Attribution

© 2026 514sid

SignageList dataset was initially created and is primarily maintained by 514sid.
Most of the data collection, verification, and curation has been performed by the original author.
