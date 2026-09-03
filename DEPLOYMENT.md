# GitHub Pages

Site: https://hemantgolhar.github.io/CitelCoach/

In the repository's **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source (one-time setup).

From this repository, commit the deployment changes and push:

```sh
git add vite.config.js src/main.jsx package.json scripts/prepare-pages.mjs .github/workflows/deploy.yml DEPLOYMENT.md
git commit -m "Configure CitelCoach for GitHub Pages"
git push origin main
```

The deployment command is `git push origin main`. Each push runs the full test suite, builds the app and deploys the `dist` artifact. Once the workflow exists on GitHub, an authenticated GitHub CLI can also redeploy the current remote main branch:

```sh
gh workflow run deploy.yml --repo hemantgolhar/CitelCoach --ref main
```

## Local use

`npm run dev` serves the app at **http://localhost:5173/CitelCoach/** (use the port Vite prints if 5173 is busy).

`npm run build` creates the PWA and copies its entry document to `dist/404.html` for GitHub Pages direct-route loading. `npm run preview` previews the production build under `/CitelCoach/`.

Vite assets, BrowserRouter, manifest launch URL, icons, service-worker scope and offline navigation fallback share `/CitelCoach/`. A first online request to a nested route is served through GitHub Pages' custom 404 document; after the service worker controls the app, offline navigation uses the precached entry document.

No IndexedDB schema or data is changed. Browser storage is origin-specific: data on localhost does not automatically appear on github.io. Use the existing backup export/import if you want to transfer your records.

References: [Vite deployment guide](https://vite.dev/guide/static-deploy#github-pages), [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
