import 'dotenv/config';
import app from './src/app.js';
import startAutoDeleteJob from './src/jobs/autoDelete.js';
import { ensureIndex } from './src/utils/elastic.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await ensureIndex();
    startAutoDeleteJob();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
};

startServer();