---
title: "shopextract vs Firecrawl: an initial benchmark on 10 Pakistani stores"
description: "I ran shopextract and Firecrawl on the same 37 pages from 10 Pakistani online stores. This is what was run, how it was run, what each tool got right, and the eight shopextract bugs it found."
pubDate: "Nov 13 2026"
tags: ["shopextract", "Benchmark", "Web Scraping", "E-commerce", "Open Source"]
---

I maintain [shopextract](/shopextract/), an open-source Python library that extracts product data from online stores. On 7 November 2026 I ran it against [Firecrawl](https://www.firecrawl.dev/) on 10 Pakistani stores, using the same URLs for both.

The short version:

- **First run:** shopextract returned 12 of 27 product pages correctly. Firecrawl returned 18 of 27 correctly, plus 3 that were the wrong product.
- The first run found eight defects in shopextract. All eight were addressed the same day. Two stores still fail for a reason that is not a parsing bug.
- **Second run, after the fixes:** shopextract returned 21 of 27 product pages. Only shopextract was run again. The Firecrawl numbers are from the first run.
- Firecrawl still reaches more stores: 8 of 10 category pages against 7 of 10.

This is one run on ten stores, done by the author of one of the two tools. Read the limits section before you quote a number.

## What was run

**Date:** 7 November 2026, both runs on the same day.

**shopextract:**

- First run: commit `91a38ac`, the head of [PR #103](https://github.com/umerkhan95/shopextract/pull/103).
- Second run: the fix branch that became [PR #104](https://github.com/umerkhan95/shopextract/pull/104). Both are merged into `main`. Neither is in the PyPI release, which is still 0.1.2.
- It ran on my laptop, on a home internet connection in Germany.
- Every call used `shopextract --output-format json --diagnostics quiet`.

**Firecrawl:**

- The hosted v2 API, endpoint `POST https://api.firecrawl.dev/v2/scrape`, from Firecrawl's own cloud.
- Product pages used `formats: ["product"]`. This is Firecrawl's deterministic product format and costs 1 credit per page.
- Category pages used `formats: [{type: "json", schema, prompt}]`. This is the LLM extraction mode and costs 5 credits per page.
- `waitFor: 5000` was set for the two JavaScript-rendered stores, haiermall and Imtiaz.
- The request timeout was 150 seconds.
- The run used about 80 credits in total.

The schema for category pages asked for `title`, `price`, `compare_at_price`, `currency`, `url`, `image_url`, `in_stock`, `brand` and `sku` for each product. The prompt was:

> Extract every product listed on this page. Return null for any value not shown on the page. Do not guess.

## The stores

| Store | Platform | Category page tested |
|---|---|---|
| Naheed | Magento | `/groceries-pets/dairy` |
| Shophive | Magento | `/appliances/kitchen/refrigerators` |
| mega.pk | Custom | `/fridge/` |
| Powerhouse | Shopify | `/collections/refrigerator-price-in-pakistan` |
| Telemart | Shopify | `/collections/appliances` |
| Khaadi | Salesforce Commerce Cloud | `/ready-to-wear/` |
| Sapphire | Salesforce Commerce Cloud | `/collections/dresses` |
| haiermall | Vue single-page app | `/en/refrigerators` |
| Imtiaz | BlinkX | milk category |
| czone | Custom, bot-protected | laptops category |

Two stores needed an extra shopextract flag:

- haiermall renders in the browser, so it ran with `--browser`.
- Imtiaz shows prices only after you choose a delivery branch, so it ran with `--location "Askari 1, Karachi"`.

Firecrawl has no option for a delivery branch.

## How it was run

For each store, in this order:

1. shopextract extracted the category page: `extract <url> -n 20 --timeout 240`. The `-n 20` caps the result at 20 products.
2. Firecrawl extracted the same category page. It reads the first page only.
3. Three product URLs were taken from shopextract's category result. If shopextract returned nothing, the three URLs came from Firecrawl's result.
4. For each product URL, shopextract ran `extract <url> -n 1 --timeout 120`, and then Firecrawl ran on the same URL.

There was a pause of 2 to 3 seconds between calls. Each call ran once. Time is wall-clock time for the whole call, measured by the script.

That gives 10 category pages and 27 product pages. Telemart has no product pages, because neither tool could read its category page.

After the per-store runs, three shopextract market commands ran once: `compare "Haier refrigerator"` across four stores, `compare-catalogs`, and `competitive gaps`.

Every response was saved to disk: stdout, stderr and the JSON output for shopextract, and the full API response for Firecrawl. All numbers below come from a script that reads those files.

### What "correct" means here

A product page counts as returned when the tool gives back a product for that URL. I then compared titles and prices where both tools returned the same URL.

- On 15 pages both tools returned a product and the prices agree on all 15: Naheed, Shophive, mega.pk and Sapphire.
- On Khaadi the two tools disagreed. I checked, and Firecrawl's three answers were the wrong product. They count as returned but not correct.
- On haiermall and Imtiaz only shopextract returned a product. I did not check those six pages against a second source.

## First run

### Category pages

| Store | shopextract | Firecrawl |
|---|---|---|
| Naheed | 20 products, 24 s | 32 products, 110 s, no stock values |
| Shophive | 20, 16 s, old price missing | 16, 40 s, old price on 6 |
| mega.pk | 13, 13 s | 13, 32 s |
| Powerhouse | failed, HTTP 429 | 23, 47 s |
| Telemart | failed, HTTP 429 | failed, `SCRAPE_TIMEOUT` |
| Khaadi | 20, 20 s | 24, 64 s |
| Sapphire | failed, 0 products | 12, 30 s |
| haiermall | 20, 38 s, stock and images on all 20 | 20, 34 s, no stock values, image on 1 |
| Imtiaz | 20, 7 s, branch prices | 0 products |
| czone | failed, HTTP 403 | 12, 39 s |
| **Worked** | **6 of 10** | **8 of 10** |

### Product pages

Three URLs per store.

| Store | shopextract | Firecrawl |
|---|---|---|
| Naheed | 3 of 3 | 3 of 3 |
| Shophive | 0 of 3 | 3 of 3 |
| mega.pk | 0 of 3 | 3 of 3 |
| Powerhouse | 0 of 3, HTTP 429 | 3 of 3 |
| Khaadi | 3 of 3 | 3 returned, all 3 wrong |
| Sapphire | 0 of 3 | 3 of 3 |
| haiermall | 3 of 3 | 0 of 3 |
| Imtiaz | 3 of 3 | 0 of 3 |
| czone | 0 of 3, HTTP 403 | 3 of 3 |
| **Correct** | **12 of 27** | **18 of 27** |

Firecrawl won the first run on product pages, 18 to 12.

### The Khaadi result

For all three Khaadi URLs on `pk.khaadi.com`, Firecrawl returned the same product: "Short Cambric Kurta" at USD 12, from the US store. The real pages are three different items priced between PKR 4,000 and PKR 10,000. Setting `location: {country: "PK"}` did not change the answer.

The response looked valid. It had a title, a price and a SKU. Nothing in it said the page was a different one. This is the failure I worry about most in product data, because nobody notices it.

### Speed

Median of successful calls:

| | shopextract | Firecrawl |
|---|---|---|
| Category page | about 18 s | about 39 s |
| Product page | about 6.3 s | about 3.3 s |

Firecrawl is faster on product pages. shopextract is faster on category pages, where Firecrawl uses an LLM. The two ran from different networks, so treat the times as rough.

## What the first run found in shopextract

Fifteen of shopextract's 27 product pages failed. I wrote up eight defects and traced each one.

1. **Product pages read as category pages.** Shophive and mega.pk product pages show related-product cards. shopextract saw the cards and treated the page as a listing. It then followed links like `/contact/`. This caused 6 of the 15 failures.
2. **Shopify HTTP 429.** shopextract reported the rate limit and stopped. More on this below.
3. **Old price missing on Magento category pages.** shopextract read the price from OpenGraph tags, which carry only the current price. The page had 6 old prices and shopextract returned none.
4. **Sapphire returned nothing.** Platform detection worked. The product page has no JSON-LD and no product OpenGraph tags, so there was nothing to read.
5. **czone HTTP 403.** Every request is blocked, including `robots.txt`. shopextract reported the wrong cause.
6. **Correct values marked as unsupported.** shopextract records where each value came from. Khaadi's image URL is relative on the page. shopextract joined it into a full URL and then failed to match it to its own capture. Google Shopping validation failed 20 of 20 products with correct data.
7. **haiermall option labels.** The parser preferred an internal key over the label shown to the shopper.
8. **`compare` ignored brand.** A search for "Haier refrigerator" matched a Dawlance and a PEL fridge, on the word "refrigerator" alone.

One more item was on my list and was wrong. I logged that Khaadi's MPN was a copy of its SKU. Khaadi's own JSON-LD states it that way, so shopextract was reporting the page correctly.

## The fixes

All eight are addressed in [PR #104](https://github.com/umerkhan95/shopextract/pull/104).

- **Product page detection:** a page is a product page when it declares one: a single JSON-LD `Product`, `og:type` product, a Magento or WooCommerce product body class, or a Salesforce product block whose id is in the URL. An `ItemList` keeps it a listing.
- **Old price:** read from the Magento old-price element for that product, and kept only when it is above the current price.
- **Sapphire:** a reader for the Salesforce product block. The page states no stock, so availability stays unsupported.
- **czone:** a 401 or 403 on the requested page is now reported as `blocked`. shopextract does not try to bypass it.
- **Evidence:** a relative URL joined to its page URL keeps its support, and the join is recorded.
- **haiermall:** the label shown to the shopper wins.
- **`compare`:** a brand named in the query rejects products from another brand.
- **Rate limit:** a new `--wait-rate-limit SECONDS` option waits once for `Retry-After` when it fits the limit.

The changes came with 34 new tests. Thirteen of them fail on the code from before the fixes. The rest are controls that pass on both.

## Second run

I ran shopextract again on the same category and product URLs. Firecrawl was not run again. Its column is the saved first-run result.

### Category pages

| Store | shopextract before | shopextract after | Firecrawl |
|---|---|---|---|
| Naheed | 20 | 20 | 32 |
| Shophive | 20, no old price | 20, old price on 6 | 16, old price on 6 |
| mega.pk | 13 | 13 | 13 |
| Powerhouse | HTTP 429 | HTTP 429 | 23 |
| Telemart | HTTP 429 | HTTP 429 | failed |
| Khaadi | 20 | 20 | 24 |
| Sapphire | failed | 12 | 12 |
| haiermall | 20 | 20 | 20 |
| Imtiaz | 20 | 20 | 0 |
| czone | HTTP 403 | HTTP 403 | 12 |
| **Worked** | **6 of 10** | **7 of 10** | **8 of 10** |

### Product pages

| Store | shopextract before | shopextract after | Firecrawl |
|---|---|---|---|
| Naheed | 3 of 3 | 3 of 3 | 3 of 3 |
| Shophive | 0 of 3 | 3 of 3 | 3 of 3 |
| mega.pk | 0 of 3 | 3 of 3 | 3 of 3 |
| Powerhouse | 0 of 3 | not run | 3 of 3 |
| Khaadi | 3 of 3 | 3 of 3 | 3 wrong |
| Sapphire | 0 of 3 | 3 of 3 | 3 of 3 |
| haiermall | 3 of 3 | 3 of 3 | 0 of 3 |
| Imtiaz | 3 of 3 | 3 of 3 | 0 of 3 |
| czone | 0 of 3 | 0 of 3 | 3 of 3 |
| **Correct** | **12 of 27** | **21 of 27** | **18 of 27** |

The Powerhouse product pages were not run the second time, because my IP was still rate limited. They count as failures for shopextract.

Median time after the fixes: 17.3 s for a category page and 5.5 s for a product page.

### Fields per product

Each tool returned 21 product pages. This table counts how many of the 21 carry each field. Firecrawl's 21 include the 3 wrong Khaadi pages.

| Field | shopextract | Firecrawl |
|---|---|---|
| Title and link | 21 | 21 |
| ID or SKU | 21 | 12 |
| Price with currency | 21 | 18 |
| Image | 21 | 18 |
| More than one image | 14 | 6 |
| Availability | 21 | 21 |
| Description | 15 | 15 |
| Brand | 9 | 9 |
| GTIN or MPN | 6 | 0 |
| Category | 15 | 6 |

Two of the shopextract numbers are weaker than they look:

- **Availability:** Sapphire's page states no stock. shopextract still exports `in_stock: true` for those 3 pages, while its own evidence marks the value as unsupported. Counting only supported values, availability is 18 of 21. This is an open bug.
- **Condition:** shopextract fills `condition` on all 21 and Firecrawl on none. I left it out of the table, because shopextract's value is a default, not something read from the page.

## Why two Shopify stores still fail

My first reading was that Cloudflare blocked shopextract's HTTP client. That was wrong. On re-test:

- `curl` got the same HTTP 429 from the same machine.
- An unrelated Shopify store returned 429 to the same IP.
- The response body was `local_rate_limited`, served from Shopify's own edge.
- The first request to Powerhouse failed in 0.57 seconds, so the limit was used up before the benchmark began. I had run live tests from the same IP earlier that day.

Shopify applies its strictest limits to bots that do not sign their requests. Firecrawl got HTTP 200 on the same store from its cloud IPs.

So these two failures are about my IP and an unsigned client, not about parsing. The `--wait-rate-limit` option worked as designed: it waited 60 seconds and retried once. Powerhouse answered 429 again. Signed requests are not implemented in shopextract.

## Limits of this benchmark

- **I wrote one of the tools.** I chose the stores, wrote the script and judged the results.
- **Ten stores, one country, one day.** Every call ran once. There are no repeats and no error bars.
- **The product URLs came from shopextract's own category results** where it had any. That favours pages shopextract can already reach.
- **Firecrawl was not re-run.** The after-fix comparison sets a new shopextract run against an older Firecrawl run.
- **The fixes were written against these same pages.** The second run shows the bugs are fixed on these stores. It does not show how shopextract does on stores it has not seen.
- **Different networks.** shopextract ran from a home connection that was already rate limited on Shopify. Firecrawl ran from its cloud.
- **Six pages have no second source.** On haiermall and Imtiaz only shopextract returned a product.
- **Not the PyPI release.** Both runs used code from `main`. `pip install shopextract` gives 0.1.2, which has none of these fixes.
- **The raw outputs and the script are not published yet.** They are on my machine.

## What I take from it

Firecrawl reaches more stores. It gets through bot protection and rate limits that stop a client on a home IP, and it reads product pages on platforms it has never seen.

shopextract returns more fields per product, records where each value came from, and handles two cases Firecrawl did not: delivery-branch pricing and a JavaScript-rendered store.

The benchmark's main use was finding bugs. It found eight in a day. The Khaadi case is why I think evidence per field matters: a wrong product with a valid-looking price is worse than no answer.

Open work: signed requests for Shopify, and not exporting a stock value that the evidence does not support.
