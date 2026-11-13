---
title: "shopextract vs Firecrawl: an initial benchmark on 10 Pakistani stores"
description: "I gave shopextract and Firecrawl the same 37 pages from 10 Pakistani online stores. Here is what each tool got right, what went wrong, and what I fixed."
pubDate: "Nov 13 2026"
tags: ["shopextract", "Benchmark", "Web Scraping", "E-commerce", "Open Source"]
---

I maintain [shopextract](/shopextract/), an open-source tool that reads product data from online stores: the name, the price, the stock, the images. [Firecrawl](https://www.firecrawl.dev/) is a well-known paid service that can do the same job. On 7 November 2026 I gave both tools the same pages from 10 Pakistani stores and compared the answers.

The short version:

- **First run:** shopextract read 12 of 27 product pages correctly. Firecrawl read 18 of 27 correctly, plus 3 where it returned the wrong product.
- The first run showed eight problems in shopextract. I worked on all eight the same day.
- **Second run, after the fixes:** shopextract read 21 of 27 product pages. I ran only shopextract again. The Firecrawl numbers are from the first run.
- Firecrawl still gets into more stores: 8 of 10 against 7 of 10.

This is one test on ten stores, done by the author of one of the two tools. Read the limits section before you quote a number.

## The stores

| Store | Page tested |
|---|---|
| Naheed | Dairy |
| Shophive | Refrigerators |
| mega.pk | Fridges |
| Powerhouse | Refrigerators |
| Telemart | Appliances |
| Khaadi | Ready-to-wear |
| Sapphire | Dresses |
| haiermall | Refrigerators |
| Imtiaz | Milk |
| czone | Laptops |

Two stores need special handling:

- **haiermall** builds its pages inside the browser, so a tool has to open the page like a real browser does.
- **Imtiaz** shows prices only after you choose a delivery branch. I chose a branch in Karachi. Firecrawl has no option for this.

## How it was run

For each store:

1. Both tools read one category page, which is a page that lists many products.
2. I took three products from that list.
3. Both tools read the page of each of those three products.

That gives 10 category pages and 27 product pages. Telemart has no product pages in the test, because neither tool could read its category page.

Each page was read once. I saved every answer from both tools, and a script counted the results from the saved files.

A product page counts as read when the tool returns a product for that link. Where both tools returned a product, I compared the names and the prices:

- On 15 pages both tools returned a product, and the prices agree on all 15.
- On Khaadi the two tools disagreed. I checked the store, and Firecrawl's three answers were the wrong product.
- On haiermall and Imtiaz only shopextract returned a product. I did not check those six pages against a second source.

## First run

On category pages, shopextract read 6 of 10 stores and Firecrawl read 8 of 10.

On product pages, Firecrawl won, 18 to 12:

| Store | shopextract | Firecrawl |
|---|---|---|
| Naheed | 3 of 3 | 3 of 3 |
| Shophive | 0 of 3 | 3 of 3 |
| mega.pk | 0 of 3 | 3 of 3 |
| Powerhouse | 0 of 3, rate limited | 3 of 3 |
| Khaadi | 3 of 3 | 3 returned, all 3 wrong |
| Sapphire | 0 of 3 | 3 of 3 |
| haiermall | 3 of 3 | 0 of 3 |
| Imtiaz | 3 of 3 | 0 of 3 |
| czone | 0 of 3, blocked | 3 of 3 |
| **Correct** | **12 of 27** | **18 of 27** |

### The Khaadi result

I gave Firecrawl three different products from Khaadi's Pakistani store. For all three it returned the same product: "Short Cambric Kurta" at USD 12, from Khaadi's US store. The real pages are three different items priced between PKR 4,000 and PKR 10,000. Telling Firecrawl that the country is Pakistan did not change the answer.

The answer looked valid. It had a name, a price and a product code. Nothing in it said that it came from a different page. This is the failure I worry about most in product data, because nobody notices it.

### Speed

Typical time for a page that worked:

| | shopextract | Firecrawl |
|---|---|---|
| Category page | about 18 seconds | about 39 seconds |
| Product page | about 6 seconds | about 3 seconds |

Firecrawl is faster on product pages. shopextract is faster on category pages. The two tools ran from different networks, so treat the times as rough.

## What went wrong in shopextract

shopextract failed on 15 of its 27 product pages. I found eight problems:

1. **Product pages mistaken for lists.** Shophive and mega.pk show "related products" on each product page. shopextract saw those and decided the page was a list. This caused 6 of the 15 failures.
2. **Rate limits on two stores.** Powerhouse and Telemart refused my connection for sending too many requests. shopextract reported it and stopped. More on this below.
3. **Old price missing.** When a product is on sale, the store shows the old price crossed out. On Shophive's category page shopextract returned the new price and missed all 6 old prices.
4. **Sapphire returned nothing.** Sapphire keeps its product data in a part of the page that shopextract did not read.
5. **czone blocks automated visitors.** Every request was refused. shopextract gave the wrong reason for the failure.
6. **Correct values marked as unconfirmed.** shopextract records where on the page each value came from. For Khaadi's images it lost track of that link. Its own check then failed 20 of 20 products that had correct data.
7. **Wrong option names on haiermall.** shopextract returned an internal code instead of the name the shopper sees.
8. **Price comparison ignored the brand.** A search for "Haier refrigerator" also matched a Dawlance and a PEL fridge.

One more item on my list turned out to be wrong. I thought shopextract copied a value on Khaadi by mistake. Khaadi's own page states it that way, so shopextract reported the page correctly.

## The fixes

I worked on all eight the same day, and added 34 new tests.

Six of them help shopextract read more pages. Two do not:

- **czone:** shopextract now says clearly that the store blocked it. It does not try to get around the block.
- **Rate limits:** shopextract can now wait and try once more. That did not help in this test, as the section on Shopify explains.

The fixes are in the [code on GitHub](https://github.com/umerkhan95/shopextract). They are not yet in the version you get when you install shopextract today.

## Second run

I ran shopextract again on the same pages. I did not run Firecrawl again. Its column is the saved first-run result.

### Category pages

The numbers are how many products each tool returned. shopextract was asked for 20 at most.

| Store | shopextract before | shopextract after | Firecrawl |
|---|---|---|---|
| Naheed | 20 | 20 | 32 |
| Shophive | 20, no old price | 20, old price on 6 | 16, old price on 6 |
| mega.pk | 13 | 13 | 13 |
| Powerhouse | rate limited | rate limited | 23 |
| Telemart | rate limited | rate limited | failed |
| Khaadi | 20 | 20 | 24 |
| Sapphire | failed | 12 | 12 |
| haiermall | 20 | 20 | 20 |
| Imtiaz | 20 | 20 | 0 |
| czone | blocked | blocked | 12 |
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

I could not run the Powerhouse product pages the second time, because the store was still refusing my connection. They count as failures for shopextract.

## How much detail each tool returns

Each tool returned 21 product pages. This table counts how many of the 21 carry each detail. Firecrawl's 21 include the 3 wrong Khaadi pages.

| Detail | shopextract | Firecrawl |
|---|---|---|
| Name and link | 21 | 21 |
| Product code | 21 | 12 |
| Price with currency | 21 | 18 |
| Image | 21 | 18 |
| More than one image | 14 | 6 |
| In stock or not | 21 | 21 |
| Description | 15 | 15 |
| Brand | 9 | 9 |
| Barcode or manufacturer number | 6 | 0 |
| Category | 15 | 6 |

One shopextract number is weaker than it looks. Sapphire's pages do not say whether a product is in stock. shopextract still reports "in stock" for those 3 pages, while its own record says the page does not confirm it. Counting only confirmed values, the stock number is 18 of 21. This is an open bug.

## Why two Shopify stores still fail

Powerhouse and Telemart both run on Shopify. My first guess was that a security service blocked shopextract. That was wrong. I checked:

- A plain request from the same computer, without shopextract, was refused the same way.
- A different Shopify store, with no link to these two, also refused my connection.
- The first request to Powerhouse was refused in about half a second. So my limit was used up before the benchmark began. I had run tests from the same connection earlier that day.

Shopify is strictest with automated visitors that do not identify themselves. Firecrawl got through on the same store from its own servers.

So these two failures are about my internet connection and how shopextract introduces itself to Shopify. They are not about reading the page. The new wait-and-retry worked as designed: it waited 60 seconds and tried once more. Powerhouse refused again.

## Limits of this benchmark

- **I wrote one of the tools.** I chose the stores, wrote the script and judged the results.
- **Ten stores, one country, one day.** Every page was read once. There are no repeats.
- **The product links came from shopextract's own results** where it had any. That favours pages shopextract can already reach.
- **Firecrawl was not re-run.** The second comparison sets a new shopextract run against an older Firecrawl run.
- **The fixes were written against these same pages.** The second run shows the problems are fixed on these stores. It does not show how shopextract does on stores it has not seen.
- **Different networks.** shopextract ran from a home connection in Germany that Shopify was already limiting. Firecrawl ran from its own servers.
- **Six pages have no second source.** On haiermall and Imtiaz only shopextract returned a product.
- **Not the released version.** Both runs used unreleased code from GitHub. The version you install today has none of these fixes.
- **The saved answers and the script are not published yet.**

## What I take from it

Firecrawl gets into more stores. It passes blocks and rate limits that stop a tool on a home connection, and it reads product pages on store software it has never seen.

shopextract returns more detail per product and records where each value came from. It also handled two cases Firecrawl did not: prices that depend on the delivery branch, and a store that builds its pages inside the browser.

The main use of the benchmark was finding problems. It found eight in a day. The Khaadi case is why I think a record of where each value came from matters: a wrong product with a valid-looking price is worse than no answer.

Open work: identify shopextract to Shopify properly, and stop reporting a stock value that the page does not confirm.
