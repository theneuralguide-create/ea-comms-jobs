// Data source: the 80,000 Hours job board (jobs.80000hours.org), which
// aggregates vacancies across the EA ecosystem. Its public Algolia search
// index is queried server-side and results are cached via ISR, so the site
// refreshes itself daily without a database or cron job.

const ALGOLIA_APP_ID = "W6KM1UDIB3";
const ALGOLIA_API_KEY = "d1d7f2c8696e7b36837d5ed337c4a319"; // public search-only key embedded in jobs.80000hours.org
const ALGOLIA_INDEX = "jobs_prod";

export type JobCategory =
  | "Communications"
  | "Marketing"
  | "Content & Media"
  | "Outreach & Engagement";

export interface Job {
  id: string;
  title: string;
  org: string;
  orgUrl: string;
  logoUrl: string;
  applyUrl: string;
  locations: string[];
  remote: boolean;
  salary: string | null;
  experience: string[];
  areas: string[];
  roleType: string[];
  descriptionHtml: string;
  postedAt: number; // unix seconds
  closesAt: number | null;
  category: JobCategory;
  core: boolean; // true = title clearly comms/marketing; false = outreach-adjacent
  highlighted: boolean;
}

interface AlgoliaHit {
  post_pk: number;
  title: string;
  description_short: string;
  url_external: string;
  posted_at: number;
  created_at: number;
  closes_at: number | null;
  salary: string;
  salary_type: string;
  repost: boolean;
  highlighted: boolean;
  company_name: string;
  company_url: string;
  company_logo_url: string;
  card_locations: string[];
  tags_skill: string[] | null;
  tags_area: string[] | null;
  tags_role_type: string[] | null;
  tags_exp_required: string[] | null;
  tags_location_type: string[] | null;
}

const CATEGORY_RULES: Array<[JobCategory, RegExp]> = [
  [
    "Communications",
    /communicat|\bcomms\b|public relations|\bpr\b|\bpress\b|media relations|spokesperson|public affairs|public engagement/i,
  ],
  [
    "Marketing",
    /marketing|\bgrowth\b|\bbrand(ing)?\b|\bseo\b|\bgeo\b|demand gen|advertis|acquisition/i,
  ],
  [
    "Content & Media",
    /\bcontent\b|copywrit|editor|editorial|social media|\bvideo\b|podcast|storytell|journalis|\bwriter\b|\bmedia\b|campaign|\bdigital\b|\boutreach\b/i,
  ],
];

function categorize(hit: AlgoliaHit): { category: JobCategory; core: boolean } | null {
  for (const [category, re] of CATEGORY_RULES) {
    if (re.test(hit.title)) return { category, core: true };
  }
  if ((hit.tags_skill ?? []).includes("Outreach")) {
    return { category: "Outreach & Engagement", core: false };
  }
  return null;
}

export async function fetchJobs(): Promise<{ jobs: Job[]; fetchedAt: number }> {
  const res = await fetch(
    `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`,
    {
      method: "POST",
      headers: {
        "X-Algolia-API-Key": ALGOLIA_API_KEY,
        "X-Algolia-Application-Id": ALGOLIA_APP_ID,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "",
        hitsPerPage: 1000,
        attributesToRetrieve: [
          "post_pk",
          "title",
          "description_short",
          "url_external",
          "posted_at",
          "created_at",
          "closes_at",
          "salary",
          "salary_type",
          "repost",
          "highlighted",
          "company_name",
          "company_url",
          "company_logo_url",
          "card_locations",
          "tags_skill",
          "tags_area",
          "tags_role_type",
          "tags_exp_required",
          "tags_location_type",
        ],
      }),
      // Revalidate every 6 hours; Vercel serves the cached page and
      // re-fetches in the background, so listings stay at most 6h stale.
      next: { revalidate: 21600 },
    }
  );

  if (!res.ok) throw new Error(`Algolia request failed: ${res.status}`);
  const data = (await res.json()) as { hits: AlgoliaHit[] };

  // Auto-retire stale listings: anything last posted more than 6 months ago
  // is dropped so the board doesn't accumulate dead roles. A job the source
  // has re-posted is kept regardless of age — reposting is the signal that a
  // role is still open. Because the site re-fetches every 6 hours, this
  // pruning happens automatically; nothing is stored, so there is no separate
  // cron/cleanup job to run.
  const STALE_AFTER = 183 * 24 * 60 * 60; // ~6 months, in seconds
  const nowSec = Math.floor(Date.now() / 1000);

  const jobs: Job[] = [];
  for (const hit of data.hits) {
    const match = categorize(hit);
    if (!match) continue;
    const postedAt = Math.max(hit.posted_at, hit.created_at);
    if (nowSec - postedAt > STALE_AFTER && !hit.repost) continue;
    jobs.push({
      id: String(hit.post_pk),
      title: hit.title.trim(),
      org: hit.company_name,
      orgUrl: hit.company_url,
      logoUrl: hit.company_logo_url,
      applyUrl: hit.url_external,
      locations: hit.card_locations ?? [],
      remote:
        (hit.tags_location_type ?? []).includes("Remote") ||
        (hit.card_locations ?? []).some((l) => /remote/i.test(l)),
      salary:
        hit.salary && hit.salary_type !== "Not Found" ? hit.salary : null,
      experience: hit.tags_exp_required ?? [],
      areas: hit.tags_area ?? [],
      roleType: hit.tags_role_type ?? [],
      descriptionHtml: hit.description_short ?? "",
      // Some rolling/evergreen listings never get posted_at refreshed and are
      // stuck on a bulk-import placeholder from ~Jan 2022; created_at (when
      // 80k's system last touched the record) is the more reliable recency
      // signal for those. For normally-refreshed listings posted_at is the
      // larger value, so this doesn't change anything for them.
      postedAt,
      closesAt: hit.closes_at,
      category: match.category,
      core: match.core,
      highlighted: hit.highlighted,
    });
  }

  jobs.sort((a, b) => b.postedAt - a.postedAt);
  return { jobs, fetchedAt: Math.floor(Date.now() / 1000) };
}
