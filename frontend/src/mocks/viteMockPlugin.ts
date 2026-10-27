import type { Plugin } from 'vite';
import { handleMockRequest } from './mockHandlers';

export function viteMockPlugin(): Plugin {
  return {
    name: 'vite-plugin-mediassist-mock',
    configureServer(server) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = (req.url as string) || '';
        // Only intercept /api/v1 calls
        if (!url.startsWith('/api/v1')) {
          return next();
        }

        const method = (req.method as string) || 'GET';
        const urlObj = new URL(url, 'http://localhost');
        const query = urlObj.searchParams;

        let body: any = null;
        if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
          body = await new Promise((resolve) => {
            let data = '';
            req.on('data', (chunk: any) => {
              data += chunk;
            });
            req.on('end', () => {
              if (!data) return resolve(null);
              try {
                resolve(JSON.parse(data));
              } catch {
                resolve(data);
              }
            });
          });
        }

        try {
          const response = await handleMockRequest(
            method,
            urlObj.pathname,
            query,
            body,
            req.headers as Record<string, string | string[] | undefined>
          );

          res.statusCode = response.status;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          res.end(JSON.stringify(response.body));
        } catch (err: any) {
          console.error('[MockServer Error]', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            error: { code: 'MOCK_INTERNAL_ERROR', message: err?.message || 'Lỗi xử lý mock server' }
          }));
        }
      });
    },
  };
}
