#!/usr/bin/env bun

/**
 * Fetches the Amazon Signage CMS partners page, extracts partner names,
 * and adds "Amazon Signage" to matching product YAML files if missing.
 *
 * Usage: bun run scripts/sync-amazon-signage.ts
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import yaml from 'js-yaml'

const PLATFORM = 'Amazon Signage'
const PARTNERS_URL = 'https://signage.amazon.com/cms-partners'
const PRODUCTS_DIR = join(import.meta.dir, '..', 'data', 'products')

// ---------------------------------------------------------------------------
// Fetch and extract partner names from the page
// ---------------------------------------------------------------------------

console.log(`Fetching ${PARTNERS_URL}...\n`)

const res = await fetch(PARTNERS_URL, {
	headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SignageList/1.0)' },
})
if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${PARTNERS_URL}`)
const html = await res.text()

// Extract partner names from cms_partner_card-text-wrap divs.
// Structure: cms_partner_card > cms_partner_card-content > cms_partner_card-text-wrap > heading/div with name
const partnerNames: string[] = []

// Structure: cms_partner_card-text-wrap > heading-component > <h3>Partner Name</h3>
for (const m of html.matchAll(/cms_partner_card-text-wrap[\s\S]*?<h3[^>]*>([^<]+)<\/h3>/gi)) {
	const text = m[1].trim()
	if (text.length >= 2) partnerNames.push(text)
}

console.log(`Found ${partnerNames.length} partner name candidates in cms_partner_card elements`)

console.log(`Extracted ${partnerNames.length} candidate names from the page:`)
for (const n of partnerNames.sort()) {
	console.log(`  • ${n}`)
}

// ---------------------------------------------------------------------------
// Normalize helpers
// ---------------------------------------------------------------------------

function normalize(s: string): string {
	return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// ---------------------------------------------------------------------------
// Load all product YAML files
// ---------------------------------------------------------------------------

interface ProductRaw {
	name: string
	slug: string
	platforms?: string[]
	[key: string]: unknown
}

const files = readdirSync(PRODUCTS_DIR).filter((f) => f.endsWith('.yaml'))
const products = files.map((f) => {
	const content = readFileSync(join(PRODUCTS_DIR, f), 'utf-8')
	return { filename: f, content, product: yaml.load(content) as ProductRaw }
})

// ---------------------------------------------------------------------------
// String-based platform insertion (preserves YAML formatting)
// ---------------------------------------------------------------------------

function addPlatformToContent(content: string, platform: string): string {
	// Match the entire platforms block
	const platformsMatch = content.match(/^(platforms:\n)((?:  - .+\n?)+)/m)
	if (!platformsMatch) {
		// No platforms block — shouldn't happen but handle gracefully
		throw new Error('Could not find platforms block in YAML')
	}

	const blockLines = platformsMatch[2]
	const existing = [...blockLines.matchAll(/^  - (.+)$/gm)].map((m) => m[1])

	if (existing.includes(platform)) return content // already present

	const sorted = [...existing, platform].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
	const newBlock = sorted.map((p) => `  - ${p}`).join('\n') + '\n'

	return content.replace(/^(platforms:\n)(?:  - .+\n?)+/m, `$1${newBlock}`)
}

// ---------------------------------------------------------------------------
// Match products against partner names and update
// ---------------------------------------------------------------------------

console.log(`\n--- Matching against ${products.length} product YAML files ---\n`)

let matched = 0
let updated = 0
let alreadyHas = 0
const errors: string[] = []

for (const { filename, content, product } of products) {
	const normProduct = normalize(product.name)

	if (normProduct.length < 3) continue

	const matchedPartner = partnerNames.find((p) => {
		const np = normalize(p)
		if (np.length < 3) return false
		if (np === normProduct) return true
		// Only allow substring matching when the shorter string covers most of the longer one
		const shorter = np.length < normProduct.length ? np : normProduct
		const longer = np.length < normProduct.length ? normProduct : np
		return shorter.length >= 5 && shorter.length / longer.length >= 0.6 && longer.includes(shorter)
	})

	if (!matchedPartner) continue
	matched++

	const platforms: string[] = product.platforms ?? []

	if (platforms.includes(PLATFORM)) {
		console.log(`  [SKIP]    ${product.name} — already has "${PLATFORM}"`)
		alreadyHas++
		continue
	}

	console.log(`  [MATCH]   ${product.name}  ←  "${matchedPartner}"`)

	try {
		const newContent = addPlatformToContent(content, PLATFORM)
		writeFileSync(join(PRODUCTS_DIR, filename), newContent, 'utf-8')
		console.log(`  [UPDATED] ${product.name}`)
		updated++
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err)
		errors.push(`${product.slug}: ${msg}`)
		console.error(`  [ERROR]   ${product.name}: ${msg}`)
	}
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\n--- Summary ---')
console.log(`Partners found on page : ${partnerNames.length}`)
console.log(`Products matched       : ${matched}`)
console.log(`Files updated          : ${updated}`)
console.log(`Already had platform   : ${alreadyHas}`)
console.log(`Errors                 : ${errors.length}`)

if (errors.length > 0) {
	for (const e of errors) console.error(`  ${e}`)
}

if (updated > 0) {
	console.log('\n--- Running schema validation ---\n')
	const check = Bun.spawnSync(['bun', 'run', 'check'], {
		cwd: join(import.meta.dir, '..'),
		stdout: 'inherit',
		stderr: 'inherit',
	})
	if (check.exitCode !== 0) {
		console.error('\nSchema validation failed.')
		process.exit(1)
	}
	console.log('\nAll done! Schema validation passed.')
} else {
	console.log('\nNo files needed updating.')
}
