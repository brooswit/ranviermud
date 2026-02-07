import { Hono } from 'hono';
import { join } from 'path';
import { file } from 'bun';
import { stat } from 'fs/promises';
import { existsSync } from 'fs';

const staticRoutes = new Hono();

// Serve static files
staticRoutes.get('/*', async (c) => {
  const url = new URL(c.req.url);
  const pathname = url.pathname;
  
  // Skip API routes
  if (pathname.startsWith('/api')) {
    return c.notFound();
  }
  
  // Normalize pathname - handle root and trailing slashes
  let normalizedPath = pathname;
  if (normalizedPath === '/' || normalizedPath === '') {
    normalizedPath = '/index.html';
  } else if (normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath.slice(0, -1) + '/index.html';
  }
  
  const staticPath = join(import.meta.dir, '../../public', normalizedPath);
  
  // Check if file exists first
  if (!existsSync(staticPath)) {
    // File doesn't exist - serve index.html for SPA routing
    const indexFile = file(join(import.meta.dir, '../../public/index.html'));
    return new Response(indexFile, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  try {
    // Check if path is a directory
    const stats = await stat(staticPath);
    if (stats.isDirectory()) {
      // If it's a directory, serve index.html for SPA routing
      const indexFile = file(join(import.meta.dir, '../../public/index.html'));
      return new Response(indexFile, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // It's a file, serve it
    const staticFile = file(staticPath);
    
    // Determine content type based on file extension
    let contentType = 'application/octet-stream';
    if (normalizedPath.endsWith('.html')) {
      contentType = 'text/html';
    } else if (normalizedPath.endsWith('.js') || normalizedPath.endsWith('.mjs')) {
      contentType = 'application/javascript';
    } else if (normalizedPath.endsWith('.tsx') || normalizedPath.endsWith('.ts')) {
      // TypeScript files should be handled by Vite, but if served directly, treat as JS
      contentType = 'application/javascript';
    } else if (normalizedPath.endsWith('.css')) {
      contentType = 'text/css';
    } else if (normalizedPath.endsWith('.json')) {
      contentType = 'application/json';
    }
    
    return new Response(staticFile, {
      headers: { 'Content-Type': contentType }
    });
  } catch (error: any) {
    // Error reading file - serve index.html for SPA routing
    console.error('Error serving static file:', error);
    const indexFile = file(join(import.meta.dir, '../../public/index.html'));
    return new Response(indexFile, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
});

export default staticRoutes;
