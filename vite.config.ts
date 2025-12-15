import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

// Plugin to handle POST requests for saving SVG files
const saveSvgPlugin = () => {
  return {
    name: 'save-svg-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/save-svg', async (req: any, res: any, next: any) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const { svg, path } = JSON.parse(body);
              const publicPath = join(process.cwd(), 'public', path || 'images/last.svg');
              const dir = dirname(publicPath);
              mkdirSync(dir, { recursive: true });
              writeFileSync(publicPath, svg, 'utf-8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, path: publicPath }));
            } catch (error: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: error.message }));
            }
          });
        } else {
          next();
        }
      });
    }
  };
};

// Plugin to handle POST requests for saving text files (e.g., MD files)
const saveFilePlugin = () => {
  return {
    name: 'save-file-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/save-file', async (req: any, res: any, next: any) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const { text, path } = JSON.parse(body);
              const publicPath = join(process.cwd(), 'public', path);
              const dir = dirname(publicPath);
              mkdirSync(dir, { recursive: true });
              writeFileSync(publicPath, text, 'utf-8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, path: publicPath }));
            } catch (error: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: error.message }));
            }
          });
        } else {
          next();
        }
      });
    }
  };
};

// Plugin to handle POST requests for saving image files (base64 PNG)
const saveImagePlugin = () => {
  return {
    name: 'save-image-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/save-image', async (req: any, res: any, next: any) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const { imageData, path } = JSON.parse(body);
              if (!imageData || typeof imageData !== 'string') {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Missing or invalid imageData field' }));
                return;
              }
              const publicPath = join(process.cwd(), 'public', path);
              const dir = dirname(publicPath);
              mkdirSync(dir, { recursive: true });
              
              // Convert base64 data URL to buffer
              const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
              const buffer = Buffer.from(base64Data, 'base64');
              writeFileSync(publicPath, buffer);
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, path: publicPath }));
            } catch (error: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: error.message }));
            }
          });
        } else {
          next();
        }
      });
    }
  };
};

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: ['vue'],
      dts: './src/types/auto-imports.d.ts'
    }),
    viteSingleFile(),
    saveSvgPlugin(),
    saveFilePlugin(),
    saveImagePlugin()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    middlewareMode: false,
    fs: {
      allow: ['..']
    }
  }
});

