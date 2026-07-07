# EA Comms & Marketing Jobs

A self-updating job board for communications and marketing roles across the
effective altruism ecosystem.

## How it works

- **Source**: the public Algolia search index behind the
  [80,000 Hours job board](https://jobs.80000hours.org), which aggregates
  vacancies from EA-aligned organisations (Anthropic, GiveWell, Apollo
  Research, Future of Life Institute, and hundreds more).
- **Filtering**: jobs are matched by title keywords into four categories —
  Communications, Marketing, Content & Media — plus an "Outreach & Engagement"
  bucket for roles tagged with the Outreach skill that don't have an explicit
  comms title.
- **Freshness**: the page uses Next.js ISR (`revalidate = 21600`), so Vercel
  re-fetches the listings in the background every 6 hours. No database or cron
  job needed.

## Development

```bash
npm install
npm run dev
```

## Deployment

Deployed on Vercel. Push to `main` to redeploy; listings refresh themselves
automatically between deploys.
