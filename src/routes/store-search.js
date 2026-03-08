/**
 * HeadyStore Search Route — /api/store/search
 * Uses Perplexity Sonar for real product search when available.
 * Falls back to category-intelligent vendor search links — no fake data.
 * Part of PPA #26: Dynamic User-Specific E-Commerce
 */

const SHOPPING_SYSTEM_PROMPT = `You are a product search engine. Given a user query and budget, find REAL products available for purchase online right now.

Return ONLY valid JSON — no markdown, no explanation, no code fences:
{
  "products": [
    {
      "name": "Exact Product Name",
      "vendor": "Store Name",
      "price": 99.99,
      "url": "https://actual-store-url.com/product",
      "image_url": "https://product-image-url.jpg",
      "match": 95,
      "description": "Brief 1-line description",
      "category": "emoji"
    }
  ],
  "summary": "Brief summary of results"
}

Rules:
- Return 4-8 real, purchasable products
- Use real prices and real store URLs
- Only recommend vendors that actually sell the product category
- Stay within the stated budget
- Sort by relevance (match score)
- Include the actual product image URL from the vendor page
- Include diverse vendors when possible`;

// ═══════════════════════════════════════════════════════════════
// VENDOR REGISTRY — only map vendors to what they actually sell
// ═══════════════════════════════════════════════════════════════
const VENDOR_REGISTRY = {
    // General (every category)
    amazon: {
        name: 'Amazon',
        icon: '🛒',
        favicon: 'https://www.amazon.com/favicon.ico',
        searchUrl: (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}`,
        categories: ['*'], // sells everything
    },

    // Electronics & Tech
    bestbuy: {
        name: 'Best Buy',
        icon: '🏪',
        favicon: 'https://www.bestbuy.com/favicon.ico',
        searchUrl: (q) => `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(q)}`,
        categories: ['electronics', 'audio', 'monitors', 'smart-home', 'gaming', 'phones', 'cameras', 'watches', 'computers', 'tablets'],
    },
    bhphoto: {
        name: 'B&H Photo',
        icon: '📷',
        favicon: 'https://www.bhphotovideo.com/favicon.ico',
        searchUrl: (q) => `https://www.bhphotovideo.com/c/search?Ntt=${encodeURIComponent(q)}`,
        categories: ['electronics', 'cameras', 'audio', 'monitors', 'computers'],
    },
    newegg: {
        name: 'Newegg',
        icon: '💻',
        favicon: 'https://www.newegg.com/favicon.ico',
        searchUrl: (q) => `https://www.newegg.com/p/pl?d=${encodeURIComponent(q)}`,
        categories: ['electronics', 'computers', 'monitors', 'gaming', 'keyboards'],
    },

    // Fashion & Shoes
    nike: {
        name: 'Nike',
        icon: '👟',
        favicon: 'https://www.nike.com/favicon.ico',
        searchUrl: (q) => `https://www.nike.com/w?q=${encodeURIComponent(q)}`,
        categories: ['shoes', 'athletic', 'clothing', 'sportswear'],
    },
    zappos: {
        name: 'Zappos',
        icon: '👠',
        favicon: 'https://www.zappos.com/favicon.ico',
        searchUrl: (q) => `https://www.zappos.com/search?term=${encodeURIComponent(q)}`,
        categories: ['shoes', 'clothing', 'bags'],
    },
    footlocker: {
        name: 'Foot Locker',
        icon: '🏃',
        favicon: 'https://www.footlocker.com/favicon.ico',
        searchUrl: (q) => `https://www.footlocker.com/search?query=${encodeURIComponent(q)}`,
        categories: ['shoes', 'athletic', 'sportswear'],
    },
    stockx: {
        name: 'StockX',
        icon: '📈',
        favicon: 'https://stockx.com/favicon.ico',
        searchUrl: (q) => `https://stockx.com/search?s=${encodeURIComponent(q)}`,
        categories: ['shoes', 'sneakers', 'streetwear', 'watches'],
    },
    nordstrom: {
        name: 'Nordstrom',
        icon: '👗',
        favicon: 'https://www.nordstrom.com/favicon.ico',
        searchUrl: (q) => `https://www.nordstrom.com/sr?keyword=${encodeURIComponent(q)}`,
        categories: ['shoes', 'clothing', 'bags', 'watches', 'fashion'],
    },

    // Home & Furniture
    wayfair: {
        name: 'Wayfair',
        icon: '🏠',
        favicon: 'https://www.wayfair.com/favicon.ico',
        searchUrl: (q) => `https://www.wayfair.com/keyword.php?keyword=${encodeURIComponent(q)}`,
        categories: ['furniture', 'home', 'lighting'],
    },
    ikea: {
        name: 'IKEA',
        icon: '🪑',
        favicon: 'https://www.ikea.com/favicon.ico',
        searchUrl: (q) => `https://www.ikea.com/us/en/search/?q=${encodeURIComponent(q)}`,
        categories: ['furniture', 'home', 'lighting'],
    },

    // Books & Media
    bookshop: {
        name: 'Bookshop.org',
        icon: '📚',
        favicon: 'https://bookshop.org/favicon.ico',
        searchUrl: (q) => `https://bookshop.org/search?keywords=${encodeURIComponent(q)}`,
        categories: ['books'],
    },

    // Outdoor & Sports
    rei: {
        name: 'REI',
        icon: '⛰️',
        favicon: 'https://www.rei.com/favicon.ico',
        searchUrl: (q) => `https://www.rei.com/search?q=${encodeURIComponent(q)}`,
        categories: ['outdoor', 'shoes', 'bags', 'athletic', 'camping'],
    },

    // Gaming
    gamestop: {
        name: 'GameStop',
        icon: '🎮',
        favicon: 'https://www.gamestop.com/favicon.ico',
        searchUrl: (q) => `https://www.gamestop.com/search/?q=${encodeURIComponent(q)}`,
        categories: ['gaming', 'consoles'],
    },
};

// ═══════════════════════════════════════════════════════════════
// CATEGORY DETECTION — map natural language queries to categories
// ═══════════════════════════════════════════════════════════════
const CATEGORY_KEYWORDS = {
    shoes: ['shoe', 'sneaker', 'boot', 'running', 'jordan', 'nike', 'adidas', 'slipper', 'sandal', 'heel', 'loafer'],
    audio: ['headphone', 'earphone', 'earbud', 'speaker', 'audio', 'noise cancel', 'soundbar', 'bluetooth speaker'],
    electronics: ['laptop', 'tablet', 'computer', 'charger', 'cable', 'usb', 'adapter', 'power bank', 'ssd', 'hard drive'],
    keyboards: ['keyboard', 'keycap', 'mechanic', 'typing', 'switch'],
    monitors: ['monitor', 'display', 'screen', '4k', 'ultrawide'],
    'smart-home': ['smart home', 'homekit', 'thermostat', 'alexa', 'echo', 'nest', 'ring', 'smart plug', 'smart bulb'],
    gaming: ['game', 'gaming', 'console', 'controller', 'playstation', 'xbox', 'switch', 'steam deck'],
    phones: ['phone', 'iphone', 'samsung', 'pixel', 'smartphone', 'cell'],
    cameras: ['camera', 'lens', 'tripod', 'photo', 'dslr', 'mirrorless', 'gopro'],
    watches: ['watch', 'smartwatch', 'fitness', 'tracker', 'garmin', 'apple watch', 'fitbit'],
    furniture: ['chair', 'desk', 'stand', 'ergonomic', 'couch', 'sofa', 'table', 'shelf', 'bookcase'],
    bags: ['bag', 'backpack', 'tote', 'briefcase', 'laptop bag', 'messenger', 'duffel', 'suitcase'],
    clothing: ['shirt', 'pants', 'jacket', 'coat', 'hoodie', 'dress', 'jeans', 'shorts', 'sweater'],
    books: ['book', 'novel', 'textbook', 'kindle', 'ebook', 'paperback', 'hardcover'],
    outdoor: ['camping', 'tent', 'hiking', 'climbing', 'outdoor', 'kayak', 'fishing'],
};

function detectCategories(query) {
    const q = query.toLowerCase();
    const matched = [];

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(k => q.includes(k))) {
            matched.push(category);
        }
    }

    return matched.length > 0 ? matched : ['general'];
}

function getVendorsForCategories(categories) {
    const vendors = new Set();

    for (const vendor of Object.values(VENDOR_REGISTRY)) {
        if (vendor.categories.includes('*')) {
            vendors.add(vendor);
            continue;
        }
        for (const cat of categories) {
            if (vendor.categories.includes(cat)) {
                vendors.add(vendor);
                break;
            }
        }
    }

    return Array.from(vendors);
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════
async function storeSearchHandler(req, res) {
    try {
        const { query, budget = 200, style = 'minimal' } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        const userMessage = `Find real products to buy: "${query}". Maximum budget: $${budget}. Style preference: ${style}. Search the internet for actual products with real prices and real purchase URLs.`;

        // Try Perplexity first (has web search built in)
        const perplexityKey = process.env.PERPLEXITY_API_KEY || process.env.AI_PROVIDER_PERPLEXITY_KEY;
        if (perplexityKey) {
            try {
                const response = await fetch('https://api.perplexity.ai/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${perplexityKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'sonar',
                        messages: [
                            { role: 'system', content: SHOPPING_SYSTEM_PROMPT },
                            { role: 'user', content: userMessage },
                        ],
                        temperature: 0.2,
                        max_tokens: 2000,
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    const content = data.choices?.[0]?.message?.content || '';

                    const jsonMatch = content.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        return res.json(parsed);
                    }
                }
            } catch (err) {
                console.error('Perplexity store search failed:', err.message);
            }
        }

        // Fallback: Generate category-intelligent search links
        // These are HONEST — they say "Search [vendor]" and link to real search pages
        const categories = detectCategories(query);
        const vendors = getVendorsForCategories(categories);

        // Cap at 6 vendors, prioritize category-specific ones over Amazon
        const sorted = vendors.sort((a, b) => {
            const aGeneral = a.categories.includes('*') ? 1 : 0;
            const bGeneral = b.categories.includes('*') ? 1 : 0;
            return aGeneral - bGeneral;
        }).slice(0, 6);

        const products = sorted.map((vendor, i) => ({
            name: `Search ${vendor.name} for "${query}"`,
            vendor: vendor.name,
            price: 0,
            url: vendor.searchUrl(query),
            image_url: vendor.favicon,
            match: 90 - (i * 3),
            description: `Browse real ${categories[0] || 'product'} results on ${vendor.name}`,
            category: vendor.icon,
            _isSearchLink: true,
        }));

        return res.json({
            products,
            summary: `Showing search links for "${query}" on ${sorted.length} ${categories.join('/')} retailers. Click to browse real results.`,
            _fallback: true,
            _categories: categories,
        });

    } catch (err) {
        console.error('Store search error:', err);
        res.status(500).json({ error: 'Search failed', message: err.message });
    }
}

module.exports = { storeSearchHandler };
