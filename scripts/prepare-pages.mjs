import { copyFile, writeFile } from "node:fs/promises";

// Pages serves this document for direct SPA routes; BrowserRouter keeps the URL.
// Offline navigation is handled separately by the PWA's cached index.html.
const output = new URL("../dist/", import.meta.url);
await copyFile(new URL("index.html", output), new URL("404.html", output));
await writeFile(new URL(".nojekyll", output), "");
