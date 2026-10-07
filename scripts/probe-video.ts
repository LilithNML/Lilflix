import { argv, exit } from 'node:process';

const url = argv[2];
if (!url) {
  console.error('Uso: npx tsx scripts/probe-video.ts <url>');
  exit(1);
}

function printHeaders(label: string, response: Response, requestedRange?: string) {
  const headers = Object.fromEntries(response.headers.entries());
  console.log(JSON.stringify({
    probe: label,
    requestedRange: requestedRange ?? null,
    status: response.status,
    url: response.url,
    redirected: response.redirected,
    acceptRanges: headers['accept-ranges'] ?? null,
    contentType: headers['content-type'] ?? null,
    contentLength: headers['content-length'] ?? null,
    accessControlAllowOrigin: headers['access-control-allow-origin'] ?? null,
    accessControlAllowCredentials: headers['access-control-allow-credentials'] ?? null,
    setCookie: headers['set-cookie'] ?? null,
    referrerPolicy: headers['referrer-policy'] ?? null,
  }, null, 2));
}

async function probe(label: string, method: 'HEAD' | 'GET', range?: string, referer?: string) {
  try {
    const headers: Record<string, string> = {};
    if (range) headers.Range = range;
    if (referer) headers.Referer = referer;

    const response = await fetch(url, { method, redirect: 'follow', headers });
    printHeaders(label, response, range);
    if (method === 'GET') await response.body?.cancel();
  } catch (error) {
    console.error(JSON.stringify({
      probe: label,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2));
  }
}

await probe('HEAD', 'HEAD');
await probe('GET Range 0-1', 'GET', 'bytes=0-1');
await probe('GET Range 1000000-1000100', 'GET', 'bytes=1000000-1000100');
await probe('GET with Referer', 'GET', 'bytes=0-1', 'https://lilflix.invalid/');
