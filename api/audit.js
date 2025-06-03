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
        // Improve heading detection with more robust selectors
        const h1Count = $('h1').length;
        const h1Text = $('h1').first().text() || '';
        const h2Count = $('h2').length;
        const h3Count = $('h3').length;
        const h4Count = $('h4').length;
        const h5Count = $('h5').length;
        const h6Count = $('h6').length;
        
        // Debug output for heading detection
        console.log('Heading counts:', { h1: h1Count, h2: h2Count, h3: h3Count, h4: h4Count, h5: h5Count, h6: h6Count });
        const imgCount = $('img').length;
        const imgWithAltCount = $('img[alt]').length;
        const internalLinks = $('a[href^="/"], a[href^="' + url + '"], a[href^="http://' + new URL(url).hostname + '"], a[href^="https://' + new URL(url).hostname + '"]').length;
        const externalLinks = $('a[href^="http"]:not([href^="' + url + '"]):not([href^="http://' + new URL(url).hostname + '"]):not([href^="https://' + new URL(url).hostname + '"])').length;
        const canonicalUrl = $('link[rel="canonical"]').attr('href') || '';
        const robotsMeta = $('meta[name="robots"]').attr('content') || '';
        const viewportMeta = $('meta[name="viewport"]').attr('content') || '';
        const keywordsMeta = $('meta[name="keywords"]').attr('content') || '';
        const headings = {
            h1: h1Count,
            h2: h2Count,
            h3: h3Count,
            h4: h4Count,
            h5: h5Count,
            h6: h6Count
        };
        
        // Check for SSL
        const hasSSL = url.startsWith('https://');
        
        // Analyze page load speed factors
        const scriptCount = $('script').length;
        const cssCount = $('link[rel="stylesheet"]').length;
        const inlineStyles = $('style').length;
        
        // Check for social media meta tags
        const openGraphTags = $('meta[property^="og:"]').length;
        const twitterTags = $('meta[name^="twitter:"]').length;
        const socialMediaTags = openGraphTags + twitterTags;
        
        // Mobile friendliness check
        const hasMobileViewport = viewportMeta.includes('width=device-width');

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