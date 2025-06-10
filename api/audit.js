import express from 'express';
import cors from 'cors';
import axios from 'axios';
import cheerio from 'cheerio';
import { XMLParser } from 'fast-xml-parser';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: '*',  // Allow all origins
    methods: ['GET', 'POST', 'OPTIONS'],  // Allow these HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],  // Allow these headers
    credentials: false,  // Don't include credentials
    preflightContinue: false,  // Don't pass the OPTIONS request to the next handler
    optionsSuccessStatus: 204  // Return 204 for OPTIONS requests
}));

// Apply CORS to all routes with specific origins allowed
app.use(function(req, res, next) {
    // List of allowed origins
    const allowedOrigins = [
        'https://brightforgeseo.com',
        'https://www.brightforgeseo.com',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5000',
        'http://127.0.0.1:5000'
    ];
    
    const origin = req.headers.origin;
    
    // Check if the request origin is in our list of allowed origins
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    } else {
        // For any other origin, allow it during development
        res.header('Access-Control-Allow-Origin', '*');
    }
    
    // Make sure all header values don't have spaces after commas
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Origin,Cache-Control,Accept');
    res.header('Access-Control-Allow-Credentials', 'false');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Handle OPTIONS method
    if (req.method === 'OPTIONS') {
        return res.status(204).send();
    }
    next();
});

app.use(express.json());

// Add preflight OPTIONS handling
app.options('*', cors());

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Enhanced health check endpoint for better Render monitoring
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
    });
});

// Keep-alive ping every 5 minutes to prevent idle timeout
setInterval(() => {
    console.log(`[${new Date().toISOString()}] Server keep-alive ping. Uptime: ${Math.floor(process.uptime() / 60)} minutes`);
}, 300000); // 5 minutes

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'SEO Audit Tool API',
        endpoints: {
            health: '/health',
            analyze: '/api/analyze'
        }
    });
});

// SEO Analysis endpoint
app.post('/api/analyze', async (req, res) => {
    const url = req.body.url;
    const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    console.log(`[${requestId}] Analyzing URL: ${url}`);
    
    // Validate URL
    if (!url || typeof url !== 'string') {
        console.error(`[${requestId}] Invalid URL provided:`, url);
        return res.status(400).json({ error: 'Invalid URL provided' });
    }
    
    // Set a timeout for the request
    const timeout = setTimeout(() => {
        console.error(`[${requestId}] Request timed out after 30 seconds for URL: ${url}`);
        return res.status(504).json({ error: 'Request timed out. The website may be too slow to respond.' });
    }, 30000); // 30 second timeout
    
    try {
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Fetch the webpage
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SEOAuditTool/1.0)'
            },
            timeout: 30000
        });

        // Parse the HTML
        const $ = cheerio.load(response.data);

        // Extract SEO elements - making sure to only get the target site's title
        let title = $('title').text();
        
        // Clean up the title to remove any SEO Audit Tool related text
        if (title.includes('SEO Audit Tool')) {
            // If title contains SEO Audit Tool, remove that part and anything after it
            title = title.split('SEO Audit Tool')[0].trim();
            // Also remove any trailing separators like | or -
            title = title.replace(/[\|\-\.]+\s*$/, '').trim();
        }
        
        console.log('Extracted title:', title);
        const metaDescription = $('meta[name="description"]').attr('content') || '';
        const viewportMeta = $('meta[name="viewport"]').attr('content') || '';
        // Super robust heading detection - using multiple methods in combination
        console.log('URL being analyzed:', url);
        console.log('Parsing HTML content length:', response.data.length);
        
        // Method 1: Use Cheerio with direct tag selectors and log fully
        let h1CountCheerio = $('h1').length;
        let h2CountCheerio = $('h2').length;
        let h3CountCheerio = $('h3').length;
        let h4CountCheerio = $('h4').length;
        let h5CountCheerio = $('h5').length;
        let h6CountCheerio = $('h6').length;

        // Log ALL found tags for debugging
        console.log('Cheerio found H1 tags:', $('h1').length);
        if (h1CountCheerio > 0) {
            $('h1').each((i, el) => {
                console.log(`H1 #${i+1} text:`, $(el).text());
                console.log(`H1 #${i+1} html:`, $(el).html());
            });
        }
        console.log('Cheerio found H2 tags:', $('h2').length);
        if (h2CountCheerio > 0) {
            $('h2').each((i, el) => {
                if (i < 3) console.log(`H2 #${i+1} text:`, $(el).text()); // Log only first 3 to avoid clutter
            });
        }
        
        // Method 2: Use regex approach as a backup
        const htmlContent = response.data;
        
        // These patterns handle complex nested tags better
        const h1Regex = /<h1[^>]*>[\s\S]*?<\/h1>/gi;
        const h2Regex = /<h2[^>]*>[\s\S]*?<\/h2>/gi;
        const h3Regex = /<h3[^>]*>[\s\S]*?<\/h3>/gi;
        const h4Regex = /<h4[^>]*>[\s\S]*?<\/h4>/gi;
        const h5Regex = /<h5[^>]*>[\s\S]*?<\/h5>/gi;
        const h6Regex = /<h6[^>]*>[\s\S]*?<\/h6>/gi;
        
        // Count matches with regex
        const h1Matches = htmlContent.match(h1Regex) || [];
        const h2Matches = htmlContent.match(h2Regex) || [];
        const h3Matches = htmlContent.match(h3Regex) || [];
        const h4Matches = htmlContent.match(h4Regex) || [];
        const h5Matches = htmlContent.match(h5Regex) || [];
        const h6Matches = htmlContent.match(h6Regex) || [];
        
        console.log('Regex found H1 tags:', h1Matches.length);
        h1Matches.forEach((match, i) => {
            if (i < 3) console.log(`Regex H1 #${i+1}:`, match.substring(0, 100) + (match.length > 100 ? '...' : ''));
        });
        console.log('Regex found H2 tags:', h2Matches.length);
        h2Matches.forEach((match, i) => {
            if (i < 3) console.log(`Regex H2 #${i+1}:`, match.substring(0, 100) + (match.length > 100 ? '...' : ''));
        });
        
        // Method 3: Try a more aggressive search with alternate patterns
        // This can help with pages that use custom components or have malformed HTML
        try {
            // Look for any tag that might be styled as a heading or have heading-like properties
            const potentialHeadingElements = $('[role="heading"], .heading, .title, .header, .h1, .h2, .h3');
            console.log('Potential additional heading elements found:', potentialHeadingElements.length);
            
            if (potentialHeadingElements.length > 0) {
                potentialHeadingElements.each((i, el) => {
                    if (i < 3) console.log(`Potential heading #${i+1}:`, $(el).text());
                });
            }
        } catch (error) {
            console.error('Error in heading detection method 3:', error.message);
        }
        
        // Method 4: Count any tag containing "h1", "h2" case-insensitively
        try {
            // This approach could catch customized heading tags like <custom-h1>
            const customH1Regex = /<[^>]*h1[^>]*>[\s\S]*?<\/[^>]*h1[^>]*>/gi;
            const customH2Regex = /<[^>]*h2[^>]*>[\s\S]*?<\/[^>]*h2[^>]*>/gi;
            const customH1Matches = htmlContent.match(customH1Regex) || [];
            const customH2Matches = htmlContent.match(customH2Regex) || [];
            
            console.log('Custom H1 tags found:', customH1Matches.length);
            console.log('Custom H2 tags found:', customH2Matches.length);
        } catch (error) {
            console.error('Error in heading detection method 4:', error.message);
        }
        
        // Method 5: Use HTML comment stripping and brute-force regex approach
        // This can help with complex nested HTML or websites with JavaScript rendering
        try {
            // Strip HTML comments that might contain heading tags but aren't rendered
            const strippedHtml = htmlContent.replace(/<!--[\s\S]*?-->/g, '');
            
            // Super aggressive regex patterns that are very permissive
            const bruteH1Regex = /<h1[^>]*>[\s\S]*?<\/h1>/gi;
            const bruteH2Regex = /<h2[^>]*>[\s\S]*?<\/h2>/gi;
            
            const bruteH1Matches = strippedHtml.match(bruteH1Regex) || [];
            const bruteH2Matches = strippedHtml.match(bruteH2Regex) || [];
            
            console.log('Brute force H1 tags found:', bruteH1Matches.length);
            console.log('Brute force H2 tags found:', bruteH2Matches.length);
            
            // Check for significant differences between methods
            if (bruteH1Matches.length > h1CountCheerio && bruteH1Matches.length > h1Matches.length) {
                console.log('Brute force method found more H1 tags than other methods');
                h1CountCheerio = bruteH1Matches.length; // Use this higher count
            }
            
            if (bruteH2Matches.length > h2CountCheerio && bruteH2Matches.length > h2Matches.length) {
                console.log('Brute force method found more H2 tags than other methods');
                h2CountCheerio = bruteH2Matches.length; // Use this higher count
            }
        } catch (error) {
            console.error('Error in heading detection method 5:', error.message);
        }
        
        // Use the higher count from all methods with additional safeguards
        // If there's a large discrepancy, log explanations and use the highest count
        
        // Additional check: directly search in the raw HTML for probable h2/h3 tags
        // Some sites use non-standard HTML that might confuse parsers
        const rawH2Count = (htmlContent.match(/<h2/gi) || []).length;
        const rawH3Count = (htmlContent.match(/<h3/gi) || []).length;
        console.log('Raw HTML tag counts:', { rawH2: rawH2Count, rawH3: rawH3Count });
        
        // Final counts: take the maximum of all counting methods
        const h1Count = Math.max(h1CountCheerio, h1Matches.length);
        const h2Count = Math.max(h2CountCheerio, h2Matches.length, rawH2Count);
        const h3Count = Math.max(h3CountCheerio, h3Matches.length, rawH3Count);
        const h4Count = Math.max(h4CountCheerio, h4Matches.length);
        const h5Count = Math.max(h5CountCheerio, h5Matches.length);
        const h6Count = Math.max(h6CountCheerio, h6Matches.length);
        
        console.log('FINAL HEADING COUNTS:', { h1: h1Count, h2: h2Count, h3: h3Count, h4: h4Count, h5: h5Count, h6: h6Count });
        
        if (Math.abs(h1CountCheerio - h1Matches.length) > 2) {
            console.log('WARNING: Large discrepancy in H1 count between methods!');
        }
        if (Math.abs(h2CountCheerio - h2Matches.length) > 5) {
            console.log('WARNING: Large discrepancy in H2 count between methods!');
        }

        // Get first H1 text if it exists
        let h1Text = '';
        if (h1Count > 0 && h1Matches[0]) {
            // Extract text from first H1 tag, removing HTML tags
            h1Text = h1Matches[0].replace(/<\/?[^>]+(>|$)/g, '').trim();
        }
        
        // Debug output for heading detection
        console.log('Enhanced heading detection:');
        console.log('H1 Tags:', h1Matches);
        console.log('H2 Tags:', h2Matches.slice(0, 5)); // Show first 5 only to avoid log clutter
        console.log('Heading counts:', { h1: h1Count, h2: h2Count, h3: h3Count, h4: h4Count, h5: h5Count, h6: h6Count });
        const imgCount = $('img').length;
        const imgWithAltCount = $('img[alt]').length;
        const internalLinks = $('a[href^="/"], a[href^="' + url + '"], a[href^="http://' + new URL(url).hostname + '"], a[href^="https://' + new URL(url).hostname + '"]').length;
        const externalLinks = $('a[href^="http"]:not([href^="' + url + '"]):not([href^="http://' + new URL(url).hostname + '"]):not([href^="https://' + new URL(url).hostname + '"])').length;
        const canonicalUrl = $('link[rel="canonical"]').attr('href') || '';
        const robotsMeta = $('meta[name="robots"]').attr('content') || '';
        const keywordsMeta = $('meta[name="keywords"]').attr('content') || '';
        const headings = {
            h1: h1Count,
            h2: h2Count,
            h3: h3Count,
            h4: h4Count,
            h5: h5Count,
            h6: h6Count
        };
        
        // Check for SSL - safely get it from the original URL
        // Axios response structure may vary between environments
        const hasSSL = url.startsWith('https://');
        console.log('SSL check:', { originalUrl: url, hasSSL });
        
        // Initialize values with defaults to avoid undefined
        // Analyze page load speed factors
        const scriptCount = $('script').length || 0;
        const cssCount = $('link[rel="stylesheet"]').length || 0;
        const inlineStyles = $('style').length || 0;
        console.log('Resource counts:', { scripts: scriptCount, css: cssCount, styles: inlineStyles });
        
        // Calculate text-to-code ratio for content quality assessment
        const bodyText = $('body').text();
        const textLength = bodyText.length;
        const htmlLength = htmlContent.length;
        const textToCodeRatio = textLength / htmlLength;
        console.log('Content quality:', { textLength, htmlLength, textToCodeRatio });
        
        // Count media elements for content richness
        const totalImages = imgCount || 0;
        const totalVideos = $('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length || 0;
        console.log('Media elements:', { images: totalImages, videos: totalVideos });
        
        // Check for structured data
        const structuredDataCount = $('script[type="application/ld+json"]').length || 0;
        
        // Estimate keyword density (simplified approach)
        let keywordDensity = 0;
        if (title && bodyText) {
            // Extract potential keywords from title
            const potentialKeywords = title.toLowerCase().split(/\s+/)
                .filter(word => word.length > 3) // Only consider words larger than 3 chars
                .filter(word => !['and', 'the', 'for', 'with'].includes(word)); // Remove common words
            
            if (potentialKeywords.length > 0) {
                // Count occurrences of the first potential keyword in body text
                const keyword = potentialKeywords[0];
                const keywordRegex = new RegExp(keyword, 'gi');
                const matches = bodyText.match(keywordRegex) || [];
                keywordDensity = (matches.length / (bodyText.split(/\s+/).length || 1)) * 100;
            }
        }
        console.log('Keyword density estimation:', keywordDensity.toFixed(2) + '%');
        
        // Check for social media meta tags
        const openGraphTags = $('meta[property^="og:"]').length || 0;
        const twitterTags = $('meta[name^="twitter:"]').length || 0;
        const socialMediaTags = openGraphTags + twitterTags;
        console.log('Social tags:', { openGraph: openGraphTags, twitter: twitterTags, total: socialMediaTags });
        
        // Mobile friendliness check - more detailed
        const hasMobileViewport = typeof viewportMeta === 'string' && viewportMeta.includes('width=device-width');
        console.log('Mobile viewport:', { meta: viewportMeta, hasMobileViewport });

        // === Advanced checks and scoring ===
        const checkSecurityHeaders = async (url) => {
            try {
                const headerResponse = await axios.head(url, { validateStatus: () => true, timeout: 10000 });
                const headers = headerResponse.headers || {};
                return {
                    hasXFrameOptions: Boolean(headers['x-frame-options']),
                    hasContentSecurityPolicy: Boolean(headers['content-security-policy']),
                    hasXXSSProtection: Boolean(headers['x-xss-protection']),
                    hasStrictTransportSecurity: Boolean(headers['strict-transport-security']),
                    hasReferrerPolicy: Boolean(headers['referrer-policy']),
                    hasPermissionsPolicy: Boolean(headers['permissions-policy'] || headers['feature-policy'])
                };
            } catch (err) {
                console.error('Security header check failed:', err.message);
                return {};
            }
        };

        const checkResourceHints = ($) => ({
            hasPreload: $('link[rel="preload"]').length > 0,
            hasPreconnect: $('link[rel="preconnect"]').length > 0,
            hasDnsPrefetch: $('link[rel="dns-prefetch"]').length > 0,
            totalResourceHints: $('link[rel="preload"], link[rel="preconnect"], link[rel="dns-prefetch"]').length
        });

        const analyzeImageOptimization = ($) => {
            const imgs = $('img');
            let withLazy = 0;
            let withSrcset = 0;
            imgs.each((i, el) => {
                const $img = $(el);
                if ($img.attr('loading') === 'lazy') withLazy++;
                if ($img.attr('srcset')) withSrcset++;
            });
            return { total: imgs.length, withLazy, withSrcset };
        };

        const analyzeURLStructure = (u) => {
            try {
                const { pathname } = new URL(u);
                const clean = pathname.toLowerCase() === pathname && !pathname.includes('_');
                const lenOk = pathname.length < 100;
                return { clean, lenOk, score: (clean ? 50 : 0) + (lenOk ? 50 : 0) };
            } catch {
                return { clean: false, lenOk: false, score: 0 };
            }
        };

        const calculateTechnicalScore = ({ hasSSL, hasMobileViewport, canonicalUrl, robotsMeta, resourceHints, securityHeaders }) => {
            let score = 0;
            if (hasSSL) score += 20;
            if (hasMobileViewport) score += 15;
            if (canonicalUrl) score += 10;
            if (!robotsMeta.includes('noindex')) score += 15;
            if (resourceHints && resourceHints.totalResourceHints) score += 10;
            if (securityHeaders && securityHeaders.hasContentSecurityPolicy) score += 10;
            return Math.min(score, 100);
        };

        const calculateContentScore = ({ textToCodeRatio, h1Count, h2Count, keywordDensity }) => {
            let score = 0;
            if (textToCodeRatio > 0.1) score += 20;
            if (h1Count === 1) score += 20;
            if (h2Count >= 2) score += 10;
            if (keywordDensity > 0.5 && keywordDensity < 5) score += 10;
            return Math.min(score, 100);
        };

        const calculateWeightedScore = (scores) => {
            const weights = { technical: 0.4, content: 0.4, performance: 0.2 };
            return Math.round(scores.technical * weights.technical + scores.content * weights.content + scores.performance * weights.performance);
        };

        const resourceHints = checkResourceHints($);
        const securityHeaders = await checkSecurityHeaders(url);
        const imageOptimization = analyzeImageOptimization($);
        const urlStructure = analyzeURLStructure(url);

        const technicalScore = calculateTechnicalScore({ hasSSL, hasMobileViewport, canonicalUrl, robotsMeta, resourceHints, securityHeaders });
        const contentScore = calculateContentScore({ textToCodeRatio, h1Count, h2Count, keywordDensity });
        const performanceScore = Math.max(100 - (scriptCount + cssCount) * 2, 0);
        const overallScore = calculateWeightedScore({ technical: technicalScore, content: contentScore, performance: performanceScore });

        const recommendations = [];
        if (!hasMobileViewport) recommendations.push('Add a viewport meta tag for mobile responsiveness');
        if (h1Count === 0) recommendations.push('Add at least one H1 heading');
        if (imgWithAltCount < imgCount) recommendations.push(`Add alt text to ${imgCount - imgWithAltCount} images`);
        if (keywordDensity < 0.5) recommendations.push('Use your primary keyword more frequently in body copy');
        if (!structuredDataCount) recommendations.push('Implement schema.org structured data');

        console.log('Scores:', { technicalScore, contentScore, performanceScore, overallScore });

        // === New advanced utility functions ===
        const fetchRobotsTxt = async (siteUrl) => {
            try {
                const robotsUrl = new URL('/robots.txt', siteUrl).href;
                const res = await axios.get(robotsUrl, { timeout: 15000, validateStatus: () => true });
                if (res.status >= 400) return { exists: false, status: res.status };
                const disallows = res.data.split('\n').filter(l => l.toLowerCase().startsWith('disallow'));
                return { exists: true, disallows, status: res.status };
            } catch (err) {
                return { exists: false, error: err.message };
            }
        };

        const fetchXmlSitemap = async (siteUrl) => {
            try {
                const sitemapUrl = new URL('/sitemap.xml', siteUrl).href;
                const res = await axios.get(sitemapUrl, { timeout: 15000, validateStatus: () => true });
                if (res.status >= 400) return { exists: false, status: res.status };
                const parser = new XMLParser();
                let parsed = {};
                try { parsed = parser.parse(res.data); } catch { }
                const urlCount = parsed?.urlset?.url ? (Array.isArray(parsed.urlset.url) ? parsed.urlset.url.length : 1) : 0;
                return { exists: true, urlCount };
            } catch (err) {
                return { exists: false, error: err.message };
            }
        };

        const validateHreflang = ($) => {
            const links = $('link[rel="alternate"][hreflang]');
            if (!links.length) return { hasHreflang: false };
            const codes = [];
            links.each((_, el) => codes.push($(el).attr('hreflang')));
            const errors = [];
            if (!codes.includes('x-default')) errors.push('Missing x-default hreflang');
            return { hasHreflang: true, count: links.length, errors };
        };

        const checkPagination = ($) => {
            const prev = $('link[rel="prev"]').length > 0;
            const next = $('link[rel="next"]').length > 0;
            return { prev, next, paginated: prev || next };
        };

        const checkImageSizes = async ($, pageUrl, limit = 5) => {
            const imgs = $('img').slice(0, limit);
            let total = 0, counted = 0;
            for (let i = 0; i < imgs.length; i++) {
                const src = $(imgs[i]).attr('src');
                if (!src) continue;
                let abs;
                try { abs = new URL(src, pageUrl).href; } catch { continue; }
                try {
                    const head = await axios.head(abs, { timeout: 10000, validateStatus: () => true });
                    const len = parseInt(head.headers['content-length'] || '0', 10);
                    if (len) { total += len; counted++; }
                } catch { }
            }
            return { sampled: counted, avgSize: counted ? Math.round(total / counted) : 0 };
        };

        const evaluateCaching = (headers) => {
            const cc = headers['cache-control'] || '';
            const maxAgeMatch = cc.match(/max-age=(\d+)/);
            const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 0;
            return { cacheControl: cc, maxAgeSeconds: maxAge, good: maxAge > 2592000 }; // >30d
        };

        const mixedContentCheck = ($, pageUrl) => {
            if (!pageUrl.startsWith('https://')) return { mixedCount: 0 };
            const count = $('img[src^="http://"], script[src^="http://"], link[href^="http://"], iframe[src^="http://"]').length;
            return { mixedCount: count };
        };

        const validateStructuredData = ($) => {
            let errors = 0;
            $('script[type="application/ld+json"]').each((_, el) => {
                try { JSON.parse($(el).html()); } catch { errors++; }
            });
            return { errors };
        };

        // === Execute new checks ===
        const robotsInfo = await fetchRobotsTxt(url);
        const sitemapInfo = await fetchXmlSitemap(url);
        const hreflangInfo = validateHreflang($);
        const paginationInfo = checkPagination($);
        const imageSizeInfo = await checkImageSizes($, url);
        const cachingInfo = evaluateCaching(response.headers || {});
        const mixedContentInfo = mixedContentCheck($, url);
        const structuredDataValidation = validateStructuredData($);

        // === Recommendations based on new checks ===
        if (!robotsInfo.exists) recommendations.push('Add a robots.txt');
        if (!sitemapInfo.exists) recommendations.push('Add a sitemap.xml and reference it in robots.txt');
        if (hreflangInfo.errors && hreflangInfo.errors.length) recommendations.push('Fix hreflang issues: ' + hreflangInfo.errors.join(', '));
        if (mixedContentInfo.mixedCount) recommendations.push(`${mixedContentInfo.mixedCount} insecure (HTTP) assets found on HTTPS page`);
        if (!cachingInfo.good) recommendations.push('Serve static assets with far-future Cache-Control headers');
        if (structuredDataValidation.errors) recommendations.push(`${structuredDataValidation.errors} structured-data blocks contain invalid JSON`);

        // Clear the timeout since the request completed successfully
        clearTimeout(timeout);
        
        res.json({
            url,
            analysis: {
                // Basic SEO Elements
                title,
                metaDescription,
                h1Text,
                h1Count,
                h2Count,
                h3Count,
                h4Count,
                h5Count,
                h6Count,
                imgCount,
                imgWithAltCount,
                internalLinks,
                externalLinks,
                canonicalUrl,
                robotsMeta,
                keywordsMeta,
                
                // Page Structure
                headings,
                
                // Technical SEO
                hasSSL,
                hasMobileViewport,
                viewportMeta,
                
                // Performance Indicators
                scriptCount,
                cssCount,
                inlineStyles,
                
                // Content Quality Metrics
                textToCodeRatio,
                keywordDensity,
                totalImages: imgCount,
                totalVideos,
                structuredDataCount,
                
                // Social Media
                socialMediaTags,
                openGraphTags,
                twitterTags,
                
                // Advanced scores
                technicalScore,
                contentScore,
                performanceScore,
                overallScore,

                // Crawl & technical extras
                robotsInfo,
                sitemapInfo,
                hreflangInfo,
                paginationInfo,
                imageSizeInfo,
                cachingInfo,
                mixedContentInfo,
                structuredDataValidation,
                
                timestamp: new Date().toISOString()
            },
            recommendations
        });

    } catch (error) {
        // Clear the timeout since the request completed (with an error)
        clearTimeout(timeout);

        console.error(`[${requestId}] Error analyzing URL:`, error.message);

        // Provide more specific error messages based on the error type
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return res.status(400).json({ 
                error: 'Could not connect to the website. Please check the URL and try again.'
            });
        } else if (error.response && error.response.status) {
            return res.status(error.response.status).json({ 
                error: `Website returned an error: ${error.response.status} ${error.response.statusText}`
            });
        }

        res.status(500).json({ 
            error: 'Failed to analyze URL', 
            message: error.message 
        });
    }
});

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
    console.error('UNCAUGHT EXCEPTION! Shutting down gracefully...', error);
    console.error(error.name, error.message, error.stack);
    // Give the server 3 seconds to finish current requests before shutting down
    setTimeout(() => {
        process.exit(1);
    }, 3000);
});

process.on('unhandledRejection', (error) => {
    console.error('UNHANDLED REJECTION! Shutting down gracefully...', error);
    // Give the server 3 seconds to finish current requests before shutting down
    setTimeout(() => {
        process.exit(1);
    }, 3000);
});

// Start server with improved error logging
const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
    console.log(`Node version: ${process.version}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('Server configured with improved reliability for Render deployment');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
}); 