import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ data: { ok: true } });
});

const port = Number(process.env.PORT ?? 3001);

app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);
});
