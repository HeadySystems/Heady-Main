const pino = require('pino');
const logger = pino();
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'dist')));
app.get('/health', (_, res) => res.json({ status: 'ok', vertical: process.env.HEADY_VERTICAL || 'default' }));
app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(PORT, () => logger.info(`Heady UI projected on :${PORT}`));
