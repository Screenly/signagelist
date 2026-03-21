import { z } from 'zod'

const ProductCategorySchema = z.enum(['CMS', 'Content provider', 'Computer vision'])

const DeliverySchema = z.enum(['cloud', 'on-premise', 'hybrid', 'self-hosted'])

const PaymentModelSchema = z.enum(['subscription', 'one-time', 'pay-as-you-go', 'free'])

const BillingBasisSchema = z.enum(['per_device', 'per_user', 'per_location', 'flat_rate'])

const PricingSchema = z.object({
	name: z.string(),
	payment_model: PaymentModelSchema,
	billing_basis: BillingBasisSchema,
	monthly: z.number().nullable(),
	yearly: z.number().nullable(),
	price: z.number().nullable().optional(),
})

const ModelSchema = z.object({
	delivery: DeliverySchema,
	free_trial: z.boolean(),
	pricing_available: z.boolean(),
	has_freemium: z.boolean(),
	pricing: z.array(PricingSchema),
})

const ScreensStatSchema = z.object({
	total: z.number(),
	source: z.string(),
	date: z.string(),
})

const StatsSchema = z
	.object({
		screens: ScreensStatSchema.optional(),
	})
	.default({})

const ComplianceSchema = z
	.object({
		soc2: z.boolean(),
		iso27001: z.boolean(),
		hipaa: z.boolean(),
		cra: z.boolean(),
		fedramp: z.boolean(),
	})
	.default({ soc2: false, iso27001: false, hipaa: false, cra: false, fedramp: false })

const ProductSchema = z
	.object({
		// Identity
		name: z.string(),
		slug: z.string(),
		description: z.string(),
		website: z.string().url(),
		year_founded: z.number().nullable(),
		headquarters: z.array(z.string()),
		open_source: z.boolean(),
		license: z.string().nullable().default(null),
		source_code_url: z.string().url().nullable().default(null),
		rss_feed_url: z.string().url().nullable().default(null),
		has_api: z.boolean().default(false),
		developer_portal_url: z.string().url().nullable().default(null),
		has_cli: z.boolean().default(false),
		has_mcp: z.boolean().default(false),
		has_sso: z.boolean().default(false),
		has_saml: z.boolean().default(false),
		self_signup: z.boolean(),
		discontinued: z.boolean(),
		// Taxonomies
		categories: z.array(ProductCategorySchema),
		platforms: z.array(z.string()),

		// Pricing
		models: z.array(ModelSchema),

		// Stats
		stats: StatsSchema,

		// Compliance
		compliance: ComplianceSchema,

		// Notes
		notes: z.array(z.string()).default([]),

		// Future G2-like fields
		features: z.array(z.string()).default([]),
		integrations: z.array(z.string()).default([]),
		target_audience: z.array(z.string()).default([]),
		deployment_options: z.array(z.string()).default([]),
		support_channels: z.array(z.string()).default([]),
		languages: z.array(z.string()).default([]),
		screenshots: z.array(z.string()).default([]),
		last_verified: z.string().nullable().default(null),
	})
	.refine((data) => !data.has_api || data.developer_portal_url !== null, {
		message: 'developer_portal_url is required when has_api is true',
		path: ['developer_portal_url'],
	})

export { ProductSchema, ProductCategorySchema, ModelSchema, PricingSchema }

export type Product = z.infer<typeof ProductSchema>
export type ProductCategory = z.infer<typeof ProductCategorySchema>
export type Model = z.infer<typeof ModelSchema>
export type Pricing = z.infer<typeof PricingSchema>
