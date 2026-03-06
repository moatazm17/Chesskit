const R2_BASE = "https://pub-eb870cdb3c464a7f917c6400b7995b81.r2.dev";

export const onRequest: PagesFunction = async (context) => {
  const path = (context.params.path as string[]).join("/");
  const r2Url = `${R2_BASE}/${path}`;

  const response = await fetch(r2Url);
  if (!response.ok) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  if (path.endsWith(".wasm")) {
    headers.set("Content-Type", "application/wasm");
  } else if (path.endsWith(".js")) {
    headers.set("Content-Type", "application/javascript");
  }

  return new Response(response.body, {
    status: response.status,
    headers,
  });
};
