import { z, defineCollection } from "astro:content";

const baseSchema = z.object({
  title: z.string(),
  description: z.string(),
  pubDate: z.coerce.date(),
  updatedDate: z.string().optional(),
  heroImage: z.string().optional(),
  badge: z.string().optional(),
  tags: z.array(z.string()).refine(items => new Set(items).size === items.length, {
    message: 'tags must be unique',
  }).optional(),
});

// Extend base schema for specific collections
const articlesSchema = baseSchema;
const blogSchema = baseSchema;
const storeSchema = baseSchema.extend({
  custom_link_label: z.string(),
  custom_link: z.string().optional(),
  pricing: z.string().optional(),
  oldPricing: z.string().optional(),
  checkoutUrl: z.string().optional(),
});

export type BlogSchema = z.infer<typeof blogSchema>;
export type StoreSchema = z.infer<typeof storeSchema>;
export type ArticlesSchema = z.infer<typeof articlesSchema>;

const blogCollection = defineCollection({ schema: blogSchema });
const storeCollection = defineCollection({ schema: storeSchema });
const articlesCollection = defineCollection({ schema: articlesSchema });

export const collections = {
    'blog': blogCollection,
    'store': storeCollection,
    'articles': articlesCollection
}