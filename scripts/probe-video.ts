import { writeFile } from 'node:fs/promises';

const url = process.argv[2];

if (!url) {
  console.error('Uso: npx tsx scripts/probe-video.ts <url>');
  process.exit(2);
}

let target: URL;
try {
  target = new URL(url);
  if (target.protocol !== 'https:') throw new Error('La URL debe usar https.');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(2);
}

const requests = [
  { name: 'HEAD sin cookies', method: 'HEAD' as const, headers: {} },
  { name: 'GET Range 0-1 sin cookies', method: 'GET' as const, headers: { Range: 'bytes=0-1' } },
  { name: 'GET Range 1000000-1000100 sin cookies', method: 'GET' as const, headers: { Range: 'bytes=1000000-1000100' } },
  { name: 'HEAD con Referer ajeno', method: 'HEAD' as const, headers: { Referer: 'https://example.invalid/' } },
  { name: 'GET Range 0-1 con Referer ajeno', method: 'GET' as const, headers: { Range: 'bytes=0-1', Referer: 'https://example.invalid/' } },
];

const interestingHeaders = [
  'accept-ranges', 'content-type', 'content-length', 'content-range',
  'access-control-allow-origin', 'access-control-allow-credentials',
  'access-control-allow-methods', 'access-control-allow-headers',
  'cache-control', 'expires', 'location', 'set-cookie',
];

async function probe(request: (typeof requests)[number]) {
  const response = await fetch(target, {
    method: request.method,
    headers: { 'User-Agent': 'Lilflix Turbo probe/1.0', ...request.headers },
    redirect: 'follow',
  });

  const headers = Object.fromEntries(
    interestingHeaders
      .map((name) => [name, response.headers.get(name)])
      .filter(([, value]) => value !== null),
  );

  if (request.method === 'GET') await response.body?.cancel();

  return {
    name: request.name,
    status: response.status,
    url: response.url,
    redirected: response.redirected,
    headers,
  };
}

const results = [];

for (const request of requests) {
  try {
    results.push(await probe(request));
  } catch (error) {
    results.push({
      name: request.name,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const rangeResults = results.filter(
  (result) => result.name.startsWith('GET Range') && 'status' in result,
);

const report = {
  generatedAt: new Date().toISOString(),
  inputUrl: target.toString(),
  host: target.host,
  directVideoCandidate: results.some(
    (result) =>
      'status' in result &&
      (result.status === 200 || result.status === 206) &&
      result.headers?.['content-type']?.toLowerCase().startsWith('video/'),
  ),
  range206: rangeResults.length === 2 && rangeResults.every((result) => result.status === 206),
  results,
};

console.log(JSON.stringify(report, null, 2));
await writeFile('docs/turbo-probe-latest.json', JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log('\nGuardado en docs/turbo-probe-latest.json');
