import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import redactRoutes from './routes/redact.routes.js';
import dashRoutes from './routes/dash.routes.js';
import docsRoutes from './routes/docs.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import searchRoutes    from './routes/search.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';

const app = express();
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api', redactRoutes);
app.use('/api/dash',dashRoutes);
app.use('/api/documents',docsRoutes);
app.use('/api/settings',settingsRoutes);
app.use('/api/search',    searchRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

export default app;