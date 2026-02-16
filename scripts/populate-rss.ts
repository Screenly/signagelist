import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import yaml from 'js-yaml'

const PRODUCTS_DIR = join(import.meta.dir, '..', 'data', 'products')
const TIMEOUT_MS = 5000
const CONCURRENCY = 20

const ALL_FEED_PATHS = ['/rss.xml', '/feed/', '/feed.xml', '/atom.xml', '/blog/rss.xml', '/blog/feed/', '/rss']

interface Product {
	name: string
	slug: string
	website?: string
	discontinued?: boolean
	rss_feed_url?: string | null
}

interface RssResult {
	slug: string
	name: string
	rssUrl: string
}

async function checkFeedPaths(product: Product): Promise<RssResult | null> {
	if (!product.website || product.discontinued) return null

	const base = product.website.endsWith('/') ? product.website.slice(0, -1) : product.website

	for (const path of ALL_FEED_PATHS) {
		const feedUrl = `${base}${path}`

		try {
			const controller = new AbortController()
			const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

			const response = await fetch(feedUrl, {
				signal: controller.signal,
				redirect: 'follow',
				headers: {
					'User-Agent': 'Mozilla/5.0 (compatible; SignageList RSS checker)',
				},
			})

			clearTimeout(timer)

			if (response.status === 200) {
				const contentType = (response.headers.get('content-type') ?? '').toLowerCase()
				if (contentType.includes('xml') || contentType.includes('rss') || contentType.includes('atom')) {
					return { slug: product.slug, name: product.name, rssUrl: feedUrl }
				}
			}
		} catch {
			// timeout, network error, DNS failure, etc.
		}
	}

	return null
}

function insertRssFeedUrl(fileContent: string, rssUrl: string): string {
	const lines = fileContent.split('\n')
	const rssFeedLine = `rss_feed_url: ${rssUrl}`

	// Strategy 1: Insert before "self_signup:"
	const selfSignupIndex = lines.findIndex((l) => l.startsWith('self_signup:'))
	if (selfSignupIndex !== -1) {
		lines.splice(selfSignupIndex, 0, rssFeedLine)
		return lines.join('\n')
	}

	// Strategy 2: Insert after "open_source:" (and after license/source_code_url if present)
	const openSourceIndex = lines.findIndex((l) => l.startsWith('open_source:'))
	if (openSourceIndex !== -1) {
		// Find the last related field after open_source
		let insertAfter = openSourceIndex
		for (let i = openSourceIndex + 1; i < lines.length; i++) {
			if (lines[i].startsWith('license:') || lines[i].startsWith('source_code_url:')) {
				insertAfter = i
			} else {
				break
			}
		}
		lines.splice(insertAfter + 1, 0, rssFeedLine)
		return lines.join('\n')
	}

	// Fallback: insert before "discontinued:" if nothing else found
	const discontinuedIndex = lines.findIndex((l) => l.startsWith('discontinued:'))
	if (discontinuedIndex !== -1) {
		lines.splice(discontinuedIndex, 0, rssFeedLine)
		return lines.join('\n')
	}

	// Last resort: append before categories
	const categoriesIndex = lines.findIndex((l) => l.startsWith('categories:'))
	if (categoriesIndex !== -1) {
		lines.splice(categoriesIndex, 0, rssFeedLine)
		return lines.join('\n')
	}

	throw new Error(`Could not find insertion point in file for ${rssUrl}`)
}

async function main() {
	const files = readdirSync(PRODUCTS_DIR).filter((f) => f.endsWith('.yaml'))
	console.log(`Found ${files.length} product YAML files\n`)

	// Load all products
	const products: { product: Product; filename: string }[] = files.map((f) => {
		const raw = readFileSync(join(PRODUCTS_DIR, f), 'utf-8')
		return { product: yaml.load(raw) as Product, filename: f }
	})

	// Filter: active, has website, doesn't already have rss_feed_url set
	const candidates = products.filter(({ product }) => product.website && !product.discontinued && !product.rss_feed_url)

	const alreadyHasRss = products.filter(({ product }) => !!product.rss_feed_url).length

	console.log(`Active with website (no existing rss_feed_url): ${candidates.length}`)
	if (alreadyHasRss > 0) {
		console.log(`Skipping ${alreadyHasRss} products that already have rss_feed_url`)
	}
	console.log(`Checking ${ALL_FEED_PATHS.length} feed paths per product (stopping at first hit)...\n`)

	// Discover RSS feeds
	const results: RssResult[] = []
	let checked = 0

	for (let i = 0; i < candidates.length; i += CONCURRENCY) {
		const batch = candidates.slice(i, i + CONCURRENCY)
		const batchResults = await Promise.all(batch.map(({ product }) => checkFeedPaths(product)))

		for (const r of batchResults) {
			if (r) {
				results.push(r)
				console.log(`  [RSS] ${r.name} (${r.slug}) -- ${r.rssUrl}`)
			}
		}

		checked += batch.length
		if (checked % 100 === 0 || checked === candidates.length) {
			process.stderr.write(`  ... checked ${checked}/${candidates.length}\n`)
		}
	}

	console.log(`\n--- Discovery Summary ---`)
	console.log(`Total products:         ${files.length}`)
	console.log(`Already have RSS:       ${alreadyHasRss}`)
	console.log(`Checked:                ${candidates.length}`)
	console.log(`Feeds discovered:       ${results.length}`)

	if (results.length === 0) {
		console.log('\nNo new RSS feeds found. Nothing to update.')
		return
	}

	// Update YAML files
	console.log(`\n--- Updating YAML files ---`)
	let updated = 0
	const errors: string[] = []

	for (const result of results) {
		const filePath = join(PRODUCTS_DIR, `${result.slug}.yaml`)

		try {
			const content = readFileSync(filePath, 'utf-8')

			// Double-check: skip if rss_feed_url already present in text
			if (content.includes('rss_feed_url:')) {
				console.log(`  [SKIP] ${result.slug} -- already has rss_feed_url in file`)
				continue
			}

			const newContent = insertRssFeedUrl(content, result.rssUrl)
			writeFileSync(filePath, newContent, 'utf-8')
			console.log(`  [UPDATED] ${result.slug} -- ${result.rssUrl}`)
			updated++
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err)
			errors.push(`${result.slug}: ${msg}`)
			console.error(`  [ERROR] ${result.slug}: ${msg}`)
		}
	}

	console.log(`\n--- Update Summary ---`)
	console.log(`Files updated:  ${updated}`)
	console.log(`Errors:         ${errors.length}`)

	if (errors.length > 0) {
		console.log('\nErrors:')
		for (const e of errors) {
			console.log(`  ${e}`)
		}
	}

	// Run schema validation
	console.log(`\n--- Running schema validation (bun run check) ---\n`)
	const checkResult = Bun.spawnSync(['bun', 'run', 'check'], {
		cwd: join(import.meta.dir, '..'),
		stdout: 'inherit',
		stderr: 'inherit',
	})

	if (checkResult.exitCode !== 0) {
		console.error(`\nSchema validation failed with exit code ${checkResult.exitCode}`)
		process.exit(1)
	}

	console.log('\nAll done! Schema validation passed.')
}

main()
