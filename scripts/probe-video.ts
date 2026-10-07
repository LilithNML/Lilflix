import { argv, exit } from 'node:process';

const url = argv[2];
if (!url) {
  console.error('Uso: npx tsx scripts/probe-video.ts <url>');
  exit(1);
}

function printHeaders(response: Response) {
  const headers = Object.fromEntries(response.headers.entries());
  console.log(JSON.stringify({
    status: response.status,
    url: response.url,
    redirected: response.redirected,
    acceptRanges: headers['accept-ranges'] ?? null,
    contentType: headers['content-type'] ?? null,
    contentLength: headers['content-length'] ?? null,
    accessControlAllowOrigin: headers['access-control-allow-origin'] ?? null,
    accessControlAllowCredentials: headers['access-control-allow-credentials'] ?? null,
    setCookie: headers['set-cookie'] ?? null,
    refererPolicy: headers['referrer-policy'] ?? null,
  }, null, 2));
}

async function probe(method: 'HEAD' | 'GET', range?: string) {
  const response = await fetch(url, {
    method,
    redirect: 'follow',
    headers: range ? { Range: range } : undefined,
  });
  printHeaders(response);
  if (method === 'GET') await response.body?.cancel();
}

console.log('=== HEAD ===');
await probe('HEAD');
console.log('=== GET Range 0-1 ===');
await probe('GET', 'bytes=0-1');
console.log('=== GET Range 1000000-1000100 ===');
await probe('GET', 'bytes=1000000-1000100');
