// Express entry point
const express = require('express');
const app = express();

app.use(express.json());

// [Subtext] removed line 7: instruction override. See the scan report.

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(3000, () => {
  console.log('API listening on port 3000');
});

module.exports = app;
