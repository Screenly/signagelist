#!/usr/bin/env bun

/**
 * Interactive CLI to create a new product YAML file.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import * as readline from 'node:readline'
import * as yaml from 'js-yaml'

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
})

const ask = (query: string): Promise<string> => {
	return new Promise((resolve) => rl.question(query, resolve))
}

async function main(): Promise<void> {
	const slug = await ask('Product slug (URL-safe ID, e.g. "my-product"): ')
	if (!slug) {
		console.error('Slug is required')
		rl.close()
		return
	}

	const directory = join(import.meta.dir, '..', 'data', 'products')
	if (!existsSync(directory)) {
		mkdirSync(directory, { recursive: true })
	}

	const filePath = join(directory, `${slug}.yaml`)

	if (existsSync(filePath)) {
		const overwrite = await ask(`Product "${slug}" already exists. Overwrite? (y/N): `)
		if (overwrite.toLowerCase() !== 'y') {
			console.log('Cancelled.')
			rl.close()
			return
		}
	}

	const product = {
		name: '',
		slug,
		description: '',
		website: '',
		year_founded: null,
		headquarters: [],
		open_source: false,
		rss_feed_url: null,
		self_signup: false,
		discontinued: false,
		categories: [],
		platforms: [],
		models: [
			{
				delivery: 'cloud',
				free_trial: false,
				pricing_available: false,
				has_freemium: false,
				pricing: [
					{
						name: '',
						payment_model: 'subscription',
						billing_basis: 'per_device',
						monthly: null,
						yearly: null,
					},
				],
			},
		],
		stats: {},
		notes: [],
		features: [],
		integrations: [],
		target_audience: [],
		deployment_options: [],
		support_channels: [],
		languages: [],
		screenshots: [],
		last_verified: null,
	}

	const yamlContent = yaml.dump(product, {
		lineWidth: -1,
		noRefs: true,
		quotingType: '"',
		forceQuotes: false,
		sortKeys: false,
	})

	writeFileSync(filePath, yamlContent, 'utf-8')
	console.log(`\nCreated: ${filePath}`)
	console.log('Edit the file to fill in product details, then run "bun run cli.ts check" to validate.')

	rl.close()
}

main()
