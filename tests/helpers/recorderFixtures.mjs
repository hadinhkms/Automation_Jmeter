/** Fixtures for tests/test-recorder.mjs. */

export const rawHeaders = [
  { name: 'Host', value: 'api.example.com' },
  { name: 'sec-ch-ua', value: '"Chromium";v="124"' },
  { name: 'sec-fetch-dest', value: 'empty' },
  { name: 'Authorization', value: 'Bearer eyJhbGciOi...' },
  { name: 'Content-Type', value: 'application/json' },
  { name: 'X-Custom-Header', value: 'MyValue' },
]

export const sampleHar = {
  log: {
    version: '1.2',
    creator: { name: 'Chrome DevTools', version: '124' },
    pages: [{ id: 'page_1', title: 'Login Page' }],
    entries: [
      {
        pageref: 'page_1',
        startedDateTime: '2026-09-02T01:00:00.000Z',
        time: 120,
        request: {
          method: 'GET',
          url: 'https://api.example.com/v1/users?page=1&limit=20&search=h%C3%A0+n%E1%BB%99i',
          queryString: [
            { name: 'page', value: '1' },
            { name: 'limit', value: '20' },
            { name: 'search', value: 'hà nội' },
          ],
          headers: [{ name: 'Authorization', value: 'Bearer test_token' }],
          cookies: [{ name: 'sessionId', value: 'sess_12345', domain: 'example.com' }],
        },
        response: {
          status: 200,
          statusText: 'OK',
          headers: [{ name: 'Content-Type', value: 'application/json; charset=utf-8' }],
          content: {
            size: 150,
            mimeType: 'application/json',
            text: Buffer.from(JSON.stringify({ message: 'Xin chào Việt Nam' })).toString('base64'),
            encoding: 'base64',
          },
        },
      },
      {
        pageref: 'page_1',
        startedDateTime: '2026-09-02T01:00:01.000Z',
        time: 250,
        request: {
          method: 'POST',
          url: 'https://api.example.com/v1/login',
          headers: [{ name: 'Content-Type', value: 'application/x-www-form-urlencoded' }],
          postData: {
            mimeType: 'application/x-www-form-urlencoded',
            params: [
              { name: 'username', value: 'user1' },
              { name: 'password', value: 'secretPass' },
            ],
          },
        },
        response: {
          status: 200,
          statusText: 'OK',
          content: { mimeType: 'application/json', text: '{"status":"success"}' },
        },
      },
    ],
  },
}
