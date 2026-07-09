# Toldot

Toldot is an interactive, source-linked explorer of biblical genealogies. The
first edition connects Adam to Jesus, preserves Matthew and Luke as distinct
source layers, adds the immediate families of the patriarchs, and includes
curated story passages for notable people.

The site is a static React SPA. All graph data and WEB/KJV excerpts are bundled
at build time; once the initial application has loaded, navigation and person
panels do not make network requests.

## Development

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
npm test
npm run build
```

## Scripture data

`src/data/scripture.generated.ts` is generated from the vetted eBible-derived
WEB and KJV resources bundled with the local BibleReader project:

```bash
npm run data:scripture
```

Override the default SQLite path with `BIBLE_SQLITE=/path/to/bible.sqlite`.

- World English Bible: public domain; WEB is a trademark of eBible.org.
- King James Version: public domain outside UK Crown rights.

The generated file contains only the passages used by this edition, not either
complete Bible.

## Container

The production image builds the SPA and serves it with Nginx. Deep links such
as `/people/rahab` fall back to `index.html` and are handled client-side.

```bash
docker build -t toldot .
docker run --rm -p 8080:80 toldot
```

Production is routed by the sibling `http-server` Traffic Server stack at
`https://toldot.brianneradt.com`.
