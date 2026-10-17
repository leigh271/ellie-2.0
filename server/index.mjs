import app from './app.mjs';

const port = Number(process.env.PORT || 8787);

app.listen(port, '0.0.0.0', () => {
  console.log(`Ellie API listening on http://0.0.0.0:${port}${process.env.ELLIE_OFFLINE === '1' ? ' (snapshot mode)' : ''}`);
});
