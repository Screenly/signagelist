import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import yaml from 'js-yaml'

const PRODUCTS_DIR = join(import.meta.dir, '..', 'data', 'products')
const TIMEOUT_MS = 5000
const CONCURRENCY = 20

// Slugs already found by the first /rss.xml scan — skip them
const SKIP_SLUGS = new Set([
	'screenly',
	'broadsign',
	'digitalsignage-net',
	'embed-signage',
	'nixplay',
	'alpha-digital',
	'studiopro',
	'studioweb',
	'professional-signs',
	'smartplayer',
	'signstix',
	'addreality',
	'eggs-tv',
	'prtv',
	'idesk',
	'adfloow',
	'buzzblender',
])

const FEED_PATHS = ['/feed/', '/feed.xml', '/atom.xml', '/blog/rss.xml', '/blog/feed/', '/rss']

interface Product {
	name: string
	slug: string
	website?: string
	discontinued?: boolean
}

interface RssResult {
	slug: string
	name: string
	rssUrl: string
}

async function checkFeed(product: Product): Promise<RssResult | null> {
	if (!product.website || product.discontinued) return null

	const base = product.website.endsWith('/') ? product.website.slice(0, -1) : product.website

	for (const path of FEED_PATHS) {
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

async function main() {
	const files = readdirSync(PRODUCTS_DIR).filter((f) => f.endsWith('.yaml'))
	console.log(`Found ${files.length} product YAML files`)

	const products: Product[] = files.map((f) => {
		const raw = readFileSync(join(PRODUCTS_DIR, f), 'utf-8')
		return yaml.load(raw) as Product
	})

	const candidates = products.filter((p) => p.website && !p.discontinued && !SKIP_SLUGS.has(p.slug))
	console.log(`Skipping ${SKIP_SLUGS.size} slugs from first /rss.xml scan`)
	console.log(`Checking ${candidates.length} remaining products against ${FEED_PATHS.length} feed paths ...\n`)

	const results: RssResult[] = []
	let checked = 0

	for (let i = 0; i < candidates.length; i += CONCURRENCY) {
		const batch = candidates.slice(i, i + CONCURRENCY)
		const batchResults = await Promise.all(batch.map(checkFeed))

		for (const r of batchResults) {
			if (r) {
				results.push(r)
				console.log(`  [HIT] ${r.name} (${r.slug}) -- ${r.rssUrl}`)
			}
		}

		checked += batch.length
		if (checked % 100 === 0 || checked === candidates.length) {
			process.stderr.write(`  ... checked ${checked}/${candidates.length}\n`)
		}
	}

	console.log('\n--- Summary ---')
	console.log(`Total products:            ${files.length}`)
	console.log(`Skipped (first scan):      ${SKIP_SLUGS.size}`)
	console.log(`Checked in extended scan:  ${candidates.length}`)
	console.log(`New feeds found:           ${results.length}`)
	console.log(`Feed paths tried:          ${FEED_PATHS.join(', ')}`)
	console.log('')

	if (results.length > 0) {
		console.log('New products with working feeds:')
		for (const r of results.sort((a, b) => a.name.localeCompare(b.name))) {
			console.log(`  ${r.name.padEnd(35)} ${r.rssUrl}`)
		}
	}
}

main()
