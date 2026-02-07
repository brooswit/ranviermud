import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { PORT } from './config';
import bundles from './routes/bundles';
import areas from './routes/areas';
import resources from './routes/resources';
import ai from './routes/ai';
import staticRoutes from './routes/static';
import { readJsonFile } from './utils/fileUtils';
import { RANVIER_JSON } from './config';

const app = new Hono();

// CORS for development
app.use('/*', cors());

// API Routes
app.route('/api/bundles', bundles);
app.route('/api/bundles', areas);
app.route('/api/bundles', resources);
app.route('/api/ai', ai);

// Get ranvier.json config
app.get('/api/config', async (c) => {
  try {
    const config = await readJsonFile(RANVIER_JSON);
    return c.json({ config });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Serve static files (must be last)
app.route('/', staticRoutes);

console.log(`🚀 Ranvier Editor running on http://localhost:${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
