const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { readFile } = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { promisify } = require('node:util');

const chrome = process.argv[2];
const root = path.resolve(__dirname, '..');
const mock = `<script>
localStorage.setItem('kr-location', JSON.stringify({name:'Pärnu',lat:58.3859,lng:24.4971}));
const request = window.fetch.bind(window);
window.fetch = (url, options) => {
  if (!String(url).includes('/v1/events')) return request(url, options);
  const day = new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Tallinn',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  return Promise.resolve(new Response(JSON.stringify({next_offset:null,events:[{
    id:'smoke',title:'Kontsert brauserikatses',status:'active',date_precision:'date',
    start_date:day,end_date:day,municipality:'Pärnu linn',source_url:'https://example.org/event',
    checked_at:new Date().toISOString()
  }]})));
};
</script>`;

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const assets = {'/':'index.html','/app.js':'app.js','/config.js':'config.js','/styles.css':'styles.css'};
  if (!assets[pathname]) { res.writeHead(404).end(); return; }
  let body = await readFile(path.join(root, assets[pathname]), 'utf8');
  if (pathname === '/') body = body.replace('<script src="./config.js">', mock + '<script src="./config.js">')
    .replace(/<script defer src="https:\/\/unpkg[^\n]+/, '');
  res.setHeader('Content-Type', pathname.endsWith('.js') ? 'text/javascript' : pathname.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8');
  res.end(body);
});

server.listen(0, '127.0.0.1', async () => {
  try {
    for (const size of ['390,844', '1440,900']) {
      const { stdout } = await promisify(execFile)(chrome, [
        '--headless', '--disable-gpu', '--no-first-run', '--dump-dom',
        '--virtual-time-budget=4000', '--window-size='+size,
        'http://127.0.0.1:'+server.address().port
      ], { timeout: 25000 });
      assert.match(stdout, /<h3>Kontsert brauserikatses<\/h3>/);
      assert.match(stdout, /href="https:\/\/example.org\/event"/);
      assert.match(stdout, /Andmed kontrollitud/);
      console.log('Chrome', size, 'OK');
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
