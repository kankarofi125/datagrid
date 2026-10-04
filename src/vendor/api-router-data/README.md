# Vendored api-router-data (v1.0.0)

Compiled output of the multi-provider VTU routing engine from
`~/Desktop/api_router_data` (`dist/`), used in-process by
`src/lib/vtu/router-data.ts`.

Covers DATA (price-aware: Alrahuz, Gladtidings, Easy Access, Gsubz,
Peyflex) plus airtime/electricity/cable/exam-pins (ordered failover:
VTpass, ClubKonnect).

The engine is a separate project with its own git history. Do not edit these
files here — change the engine repo, rebuild, and re-vendor.

## Refresh

```bash
cd ~/Desktop/api_router_data
npm test && npm run build
rm -rf ~/Desktop/data_webapp/src/vendor/api-router-data
mkdir -p ~/Desktop/data_webapp/src/vendor/api-router-data
cp -r dist/* ~/Desktop/data_webapp/src/vendor/api-router-data/
find ~/Desktop/data_webapp/src/vendor/api-router-data -name "*.tsbuildinfo" -delete
```

Then run `npx tsc --noEmit` and `npm run build` in `data_webapp`.

## Notes

- Only the library surface is used (`createRouter`, `createBillsRouter`,
  normalizers, types). The bundled HTTP server (`http/`) is not started by
  the web app.
- Vendored from a working tree that includes uncommitted upstream work:
  `refreshCatalogs` partial-failure tolerance, and the whole `src/bills/`
  module (VTpass + ClubKonnect adapters, bills router, bills HTTP routes,
  bills tests).
