const express = require('express');
require('dotenv').config();

const { handler } = require('./src/handler');

const app = express();
app.use(express.json());

app.use(async (req, res) => {
  const event = {
    httpMethod: req.method,
    path: req.path,
    body: req.body ? JSON.stringify(req.body) : null,
    headers: req.headers
  };

  const result = await handler(event);

  res.status(result.statusCode)
     .set(result.headers || {})
     .send(result.body);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Local backend server running on http://localhost:${PORT}`);
});
