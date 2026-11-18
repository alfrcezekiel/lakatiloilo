import { http, HttpResponse, type JsonBodyType } from "msw";

// The backend address the app uses in tests (vitest.config.mts).
export const API = "http://api.example.test";

// Answers every test starts with. Empty on purpose: each test says what
// the backend should answer for the requests it expects, and any other
// request fails the test (onUnhandledRequest: "error" in test/setup.ts).
export const handlers = [];

// A refusal the way the NestJS backend sends it: a status code and a plain
// sentence in `message`, which the website shows as it is.
export const refusal = (status: number, message: string) =>
  HttpResponse.json({ statusCode: status, message }, { status });

// Small helpers so tests read like "the backend answers …".
export const backend = {
  post: (path: string, answer: (request: Request) => JsonBodyType | Response | Promise<Response>) =>
    http.post(`${API}${path}`, async ({ request }) => {
      const result = await answer(request);
      return result instanceof Response ? result : HttpResponse.json(result, { status: 201 });
    }),
  delete: (path: string, answer: (request: Request) => JsonBodyType | Response) =>
    http.delete(`${API}${path}`, ({ request }) => {
      const result = answer(request);
      return result instanceof Response ? result : HttpResponse.json(result);
    }),
};
