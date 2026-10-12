# SFPM maintenance request portal

Tenant maintenance-request portal for Stress Free Property Management Inc.
Target domain: `maintenance.stressfreepm.ca`.

- Next.js (App Router, TypeScript) + Tailwind v4, static export (`out/`).
- Deployed to GitHub Pages from the `gh-pages` branch by `./deploy.sh`.
- **Submit is not wired yet.** The single integration point is `src/lib/submit-request.ts`
  (search `TODO(wire-submit)`). Nothing leaves the browser in this build.

```bash
npm ci
npm run dev                  # http://localhost:3000/sfpm-maintenance
./deploy.sh                  # preview build -> naukhangreenwin.github.io/sfpm-maintenance
./deploy.sh domain           # root build + CNAME -> maintenance.stressfreepm.ca (after DNS)
```
