import { Hono } from 'hono';
import { healthRoutes } from './features/health/health.routes';

const app = new Hono();

app.route('/health', healthRoutes);
app.get('/', (c) => c.text('retaino api'));

app.onError((err, c) => c.json({ error: err.message }, 500));

export default app;
