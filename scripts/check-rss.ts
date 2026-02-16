import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import yaml from 'js-yaml'

const PRODUCTS_DIR = join(import.meta.dir, '..', 'data', 'products')
const TIMEOUT_MS = 5000
const CONCURRENCY = 20

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

async function checkRss(product: Product): Promise<RssResult | null> {
	if (!product.website || product.discontinued) return null

	const base = product.website.endsWith('/') ? product.website.slice(0, -1) : product.website
	const rssUrl = `${base}/rss.xml`

	try {
		const controller = new AbortController()
		const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

		const response = await fetch(rssUrl, {
			signal: controller.signal,
			redirect: 'follow',
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; SignageList RSS checker)',
			},
		})

		clearTimeout(timer)

		if (response.status === 200) {
			const contentType = response.headers.get('content-type') ?? ''
			if (contentType.includes('xml')) {
				return { slug: product.slug, name: product.name, rssUrl }
			}
		}
	} catch {
		// timeout, network error, DNS failure, etc.
	}

	return null
}

async function main() {
	const files = readdirSync(PRODUCTS_DIR).filter((f) => f.endsWith('.yaml'))
	console.log(`Found ${files.length} product YAML files\n`)

	const products: Product[] = files.map((f) => {
		const raw = readFileSync(join(PRODUCTS_DIR, f), 'utf-8')
		return yaml.load(raw) as Product
	})

	const candidates = products.filter((p) => p.website && !p.discontinued)
	console.log(`Checking ${candidates.length} active products with websites for /rss.xml ...\n`)

	const results: RssResult[] = []
	let checked = 0

	for (let i = 0; i < candidates.length; i += CONCURRENCY) {
		const batch = candidates.slice(i, i + CONCURRENCY)
		const batchResults = await Promise.all(batch.map(checkRss))

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

	console.log('\n--- Summary ---')
	console.log(`Total products:      ${files.length}`)
	console.log(`Active with website: ${candidates.length}`)
	console.log(`Working /rss.xml:    ${results.length}`)
	console.log('')

	if (results.length > 0) {
		console.log('Products with working RSS feeds:')
		for (const r of results.sort((a, b) => a.name.localeCompare(b.name))) {
			console.log(`  ${r.name.padEnd(35)} ${r.rssUrl}`)
		}
	}
}

main()
