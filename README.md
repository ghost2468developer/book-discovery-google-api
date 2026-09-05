# Folio

Folio is a responsive book discovery app powered by the Google Books API. It supports keyword, title, author, and ISBN searches, category browsing, sorting, pagination, book details, and embedded previews.

## Requirements

- Node.js 20 or newer
- npm
- A Google Cloud project with the Books API enabled for reliable API access

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env.local
   ```

3. Add your Google Books API key to `.env.local`:

   ```env
   VITE_GOOGLE_BOOKS_API_KEY=your_api_key_here
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open the local URL printed by Vite, usually `http://localhost:5173`.

## Google Books API Key

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Open **APIs & Services > Library**.
4. Find and enable the **Books API**.
5. Open **APIs & Services > Credentials**.
6. Select **Create credentials > API key**.
7. Restrict the key to the **Books API**.
8. Add website restrictions for your local and deployed origins, such as `http://localhost:5173/*` and your production domain.

The app can attempt public searches without a key, but an API key is recommended for consistent quota and production use.

Vite exposes variables prefixed with `VITE_` to browser code. The API key is therefore visible to users of the deployed app. Do not treat it as a secret; protect it with Google Cloud API and HTTP referrer restrictions. Never commit `.env.local`.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_GOOGLE_BOOKS_API_KEY` | Recommended | Browser API key restricted to the Google Books API and approved website origins. |

Restart the Vite development server after changing environment variables.

## Available Commands

```bash
npm run dev       # Start the development server
npm run build     # Type-check and create the production build
npm run preview   # Preview the production build locally
```

The production output is written to `dist/`.

## Production Deployment

1. Add `VITE_GOOGLE_BOOKS_API_KEY` to the environment variables in your hosting provider.
2. Add the production domain to the API key's HTTP referrer restrictions in Google Cloud.
3. Run `npm run build`.
4. Deploy the generated `dist/` output.

The embedded preview reader loads Google's viewer script from `https://www.google.com/books/jsapi.js`. Preview availability varies by book, embeddability, region, and publisher restrictions. When an embedded preview is unavailable, Folio links to the corresponding Google Books page when possible.

## Project Structure

```text
src/App.tsx       Main interface, API integration, and preview reader
src/index.css     Tailwind import and global styles
src/main.tsx      React entry point
index.html        Document metadata and app mount point
```

## API Reference

- [Google Books API overview](https://developers.google.com/books/docs/v1/using)
- [Volumes search reference](https://developers.google.com/books/docs/v1/reference/volumes/list)
- [Embedded Viewer API guide](https://developers.google.com/books/docs/viewer/developers_guide)