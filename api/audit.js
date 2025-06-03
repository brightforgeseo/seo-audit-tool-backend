import express from 'express';
import cors from 'cors';
import axios from 'axios';
import cheerio from 'cheerio';

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

// Apply CORS to all routes
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'false');
    
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

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
    try {
        const { url } = req.body;
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
        // Enhanced heading detection with more robust approach
        // Log the HTML to debug
        console.log('Parsing HTML content length:', response.data.length);
        
        // Get all heading tags directly from the HTML using regex
        // Using regex that handles multi-line and nested content better
        const htmlContent = response.data;
        const h1Regex = /<h1[^>]*>[\s\S]*?<\/h1>/gi;
        const h2Regex = /<h2[^>]*>[\s\S]*?<\/h2>/gi;
        const h3Regex = /<h3[^>]*>[\s\S]*?<\/h3>/gi;
        const h4Regex = /<h4[^>]*>[\s\S]*?<\/h4>/gi;
        const h5Regex = /<h5[^>]*>[\s\S]*?<\/h5>/gi;
        const h6Regex = /<h6[^>]*>[\s\S]*?<\/h6>/gi;
        
        // Count all matches
        const h1Matches = htmlContent.match(h1Regex) || [];
        const h2Matches = htmlContent.match(h2Regex) || [];
        const h3Matches = htmlContent.match(h3Regex) || [];
        const h4Matches = htmlContent.match(h4Regex) || [];
        const h5Matches = htmlContent.match(h5Regex) || [];
        const h6Matches = htmlContent.match(h6Regex) || [];
        
        const h1Count = h1Matches.length;
        const h2Count = h2Matches.length;
        const h3Count = h3Matches.length;
        const h4Count = h4Matches.length;
        const h5Count = h5Matches.length;
        const h6Count = h6Matches.length;

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
        
        // Check for social media meta tags
        const openGraphTags = $('meta[property^="og:"]').length || 0;
        const twitterTags = $('meta[name^="twitter:"]').length || 0;
        const socialMediaTags = openGraphTags + twitterTags;
        console.log('Social tags:', { openGraph: openGraphTags, twitter: twitterTags, total: socialMediaTags });
        
        // Mobile friendliness check - more detailed
        const hasMobileViewport = typeof viewportMeta === 'string' && viewportMeta.includes('width=device-width');
        console.log('Mobile viewport:', { meta: viewportMeta, hasMobileViewport });

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
                
                // Social Media
                socialMediaTags,
                openGraphTags,
                twitterTags,
                
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Start server
const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
    console.log(`Node version: ${process.version}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
}); 