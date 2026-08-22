import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import compression from 'compression';
import cors from 'cors';
import favicon from 'serve-favicon';
import helmet from 'helmet';
import config from './config/index.ts';
import { handleApiError } from './http/errors.ts';
import { sendApiError } from './http/response.ts';
import { requestContext } from './middleware/request-context.ts';
import messageRoutes from './modules/messages/message.routes.ts';
import healthRoutes from './routes/health.routes.ts';
import webRoutes from './routes/web.routes.ts';

const app = express();
const isProduction = config.env === 'production';

app.set('trust proxy', config.trustProxy);
app.use(requestContext);
app.use(helmet(config.cspRule));
if (isProduction) app.use(compression());
if (config.cors.origins.length > 0) app.use(cors({ origin: config.cors.origins }));

app.use(express.static(config.frontend.distPath, { index: false }));
app.use(express.static(config.frontend.publicPath, { index: false }));
app.use(favicon(path.join(config.frontend.publicPath, 'assets/img/favicon.ico')));
app.use(healthRoutes);
app.use('/', webRoutes);
app.use('/api/v1', messageRoutes);

app.use('/api', (req, res) => sendApiError(res, {
  status: 404,
  code: 'API_NOT_FOUND',
  message: 'API resource not found',
  requestId: req.id,
}));

app.use((_req, res) => res.redirect(302, '/'));

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (req.originalUrl.startsWith('/api/')) {
    return handleApiError(err, req, res, {
      event: 'unhandled_error',
      normalizeBodyParser: true,
    });
  }

  const error = err instanceof Error ? err : new Error('Unknown error');
  const status = typeof err === 'object' && err !== null && 'status' in err
    ? Number((err as { status?: unknown }).status) || 500
    : 500;

  if (status >= 500) {
    console.error(JSON.stringify({
      level: 'error',
      event: 'unhandled_error',
      requestId: req.id,
      message: error.message,
      stack: config.env === 'development' ? error.stack : undefined,
    }));
  }

  return res.sendStatus(status);
});

export default app;
