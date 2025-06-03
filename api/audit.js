import express from 'express';
import cors from 'cors';
import axios from 'axios';
import cheerio from 'cheerio';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
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

        // Extract SEO elements
        const title = $('title').text();
        const metaDescription = $('meta[name="description"]').attr('content') || '';
        const h1Count = $('h1').length;
        const imgCount = $('img').length;
        const imgWithAltCount = $('img[alt]').length;
        const canonicalUrl = $('link[rel="canonical"]').attr('href') || '';
        const robotsMeta = $('meta[name="robots"]').attr('content') || '';

        res.json({
            url,
            analysis: {
                title,
                metaDescription,
                h1Count,
                imgCount,
                imgWithAltCount,
                canonicalUrl,
                robotsMeta,
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