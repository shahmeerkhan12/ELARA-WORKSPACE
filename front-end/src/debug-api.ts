// Quick script to introspect the backend API schema
async function checkAPI() {
  const BASE = "https://anaerobic-submitter-embattled.ngrok-free.dev";
  
  for (const [label, url] of [
    ["OpenAPI schema", "/openapi.json"],
    ["API docs", "/docs"],
  ]) {
    try {
      const r = await fetch(BASE + url, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      console.log(`${label}: ${r.status}`);
      const text = await r.text();
      console.log(text.slice(0, 2000));
    } catch (e) {
      console.log(`${label} error:`, e);
    }
  }
}
checkAPI();