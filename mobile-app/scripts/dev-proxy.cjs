const http = require('http');
const https = require('https');

const target = (process.env.API_TARGET || 'https://aft.cashbookbd.com').replace(/\/+$/, '');
const port = Number(process.env.PROXY_PORT || 3001);

const proxy = http.createServer((clientReq, clientRes) => {
  const targetUrl = new URL(clientReq.url, target);

  const headers = {
    ...clientReq.headers,
    host: targetUrl.host,
    origin: target,
    referer: `${target}/`,
  };

  delete headers['accept-encoding'];

  const upstreamReq = https.request(
    targetUrl,
    {
      method: clientReq.method,
      headers,
    },
    (upstreamRes) => {
      const responseHeaders = {
        ...upstreamRes.headers,
        'access-control-allow-origin': clientReq.headers.origin || '*',
        'access-control-allow-credentials': 'true',
        'access-control-allow-headers':
          clientReq.headers['access-control-request-headers'] || 'content-type, accept, authorization',
        'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      };

      clientRes.writeHead(upstreamRes.statusCode || 502, responseHeaders);
      upstreamRes.pipe(clientRes);
    },
  );

  upstreamReq.on('error', (error) => {
    clientRes.writeHead(502, { 'content-type': 'application/json' });
    clientRes.end(JSON.stringify({ message: error.message || 'Proxy request failed.' }));
  });

  if (clientReq.method === 'OPTIONS') {
    clientRes.writeHead(204, {
      'access-control-allow-origin': clientReq.headers.origin || '*',
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers':
        clientReq.headers['access-control-request-headers'] || 'content-type, accept, authorization',
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    });
    clientRes.end();
    upstreamReq.destroy();
    return;
  }

  clientReq.pipe(upstreamReq);
});

proxy.listen(port, () => {
  console.log(`CashBookBD API proxy listening on http://localhost:${port}`);
  console.log(`Forwarding requests to ${target}`);
});
