import { createFileRoute } from "@tanstack/react-router";

import { GITHUB_LOGIN, parseContributions } from "@/lib/github-contributions";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const baseHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...baseHeaders, "Cache-Control": "no-store", ...headers },
  });
}

function edgeCache(): Cache | undefined {
  return typeof caches === "undefined"
    ? undefined
    : (caches as unknown as { default?: Cache }).default;
}

export const Route = createFileRoute("/api/github/contributions/$user")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const user = params.user;
        if (!GITHUB_LOGIN.test(user)) {
          return json({ error: "invalid GitHub username" }, 400);
        }

        const cache = edgeCache();
        const cacheKey = new Request(
          new URL(`/api/github/contributions/${user.toLowerCase()}`, request.url).toString(),
        );
        const cached = await cache?.match(cacheKey);
        if (cached) {
          const body = (await cached.json()) as Record<string, unknown>;
          return json({ ...body, user }, 200, { "Cache-Control": "public, max-age=3600" });
        }

        let upstream: Response;
        try {
          upstream = await fetch(`https://github.com/users/${user}/contributions`, {
            headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
          });
        } catch {
          return json({ error: "could not reach github.com" }, 502);
        }
        if (upstream.status === 404) {
          return json({ error: "GitHub user not found" }, 404);
        }
        if (!upstream.ok) {
          return json({ error: `github.com responded ${upstream.status}` }, 502);
        }

        const days = parseContributions(await upstream.text());
        if (days.length === 0) {
          return json({ error: "could not parse the contribution calendar" }, 502);
        }

        const total = days.reduce((sum, day) => sum + day.count, 0);
        const response = json({ user, total, days }, 200, {
          "Cache-Control": "public, max-age=3600",
        });
        await cache?.put(cacheKey, response.clone());
        return response;
      },
    },
  },
});
