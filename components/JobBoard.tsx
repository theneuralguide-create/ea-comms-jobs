"use client";

import { useMemo, useState } from "react";
import type { Job, JobCategory } from "@/lib/jobs";

const DAY = 86400;

const CATEGORIES: Array<JobCategory | "All"> = [
  "All",
  "Communications",
  "Marketing",
  "Content & Media",
  "Outreach & Engagement",
];

function daysAgo(unix: number): number {
  return Math.floor((Date.now() / 1000 - unix) / DAY);
}

function postedLabel(unix: number): string {
  const d = daysAgo(unix);
  if (d <= 0) return "Posted today";
  if (d === 1) return "Posted yesterday";
  if (d < 7) return `Posted ${d} days ago`;
  if (d < 30) return `Posted ${Math.floor(d / 7)}w ago`;
  if (d < 365) return `Posted ${Math.floor(d / 30)}mo ago`;
  // A handful of listings are perpetual rolling-application pages ("General
  // Applications", "Volunteer, General Application") whose timestamps never
  // reflect a real posting date, so an exact month count beyond a year would
  // be false precision rather than useful information.
  return "Posted over a year ago";
}

function closingSoon(job: Job): boolean {
  if (!job.closesAt) return false;
  const days = (job.closesAt - Date.now() / 1000) / DAY;
  return days > 0 && days <= 10;
}

function dayBucket(unix: number): string {
  const d = daysAgo(unix);
  if (d <= 1) return "New this week";
  if (d < 7) return "New this week";
  if (d < 21) return "Recent";
  return "Still open";
}

function Logo({ job }: { job: Job }) {
  const [failed, setFailed] = useState(false);
  if (!job.logoUrl || failed) {
    return <div className="logo-fallback">{job.org.charAt(0)}</div>;
  }
  return (
    <img
      className="logo"
      src={job.logoUrl}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

const pinIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
    <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.4" />
  </svg>
);

const cashIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v10M15.5 9.5c-.7-1-1.9-1.5-3.5-1.5-2 0-3 1-3 2.2 0 3 6.5 1.6 6.5 4.6 0 1.3-1.2 2.2-3 2.2-1.7 0-3-.6-3.7-1.6" />
  </svg>
);

const levelIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
    <path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round" />
  </svg>
);

export default function JobBoard({ jobs }: { jobs: Job[] }) {
  const [category, setCategory] = useState<JobCategory | "All">("All");
  const [query, setQuery] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [area, setArea] = useState("All");

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const j of jobs) c.set(j.category, (c.get(j.category) ?? 0) + 1);
    return c;
  }, [jobs]);

  const areas = useMemo(() => {
    const c = new Map<string, number>();
    for (const j of jobs)
      for (const a of j.areas) c.set(a, (c.get(a) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [jobs]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      if (category !== "All" && j.category !== category) return false;
      if (area !== "All" && !j.areas.includes(area)) return false;
      if (remoteOnly && !j.remote) return false;
      if (
        q &&
        !`${j.title} ${j.org} ${j.locations.join(" ")} ${j.areas.join(" ")}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [jobs, category, query, remoteOnly, area]);

  let lastBucket = "";

  return (
    <>
      <div className="filters">
        <div className="chip-row">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`chip${category === c ? " active" : ""}`}
              onClick={() => setCategory(c)}
            >
              {c}
              <span className="count">
                {c === "All" ? jobs.length : counts.get(c) ?? 0}
              </span>
            </button>
          ))}
        </div>
        <div className="tool-row">
          <input
            className="search"
            type="search"
            placeholder="Search roles, organisations, locations…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="area-select"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            aria-label="Filter by cause area"
          >
            <option value="All">All cause areas</option>
            {areas.map(([name, count]) => (
              <option key={name} value={name}>
                {name} ({count})
              </option>
            ))}
          </select>
          <label className="toggle">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(e) => setRemoteOnly(e.target.checked)}
            />
            Remote only
          </label>
        </div>
      </div>

      <div className="jobs">
        {visible.length === 0 && (
          <div className="empty">
            No roles match those filters right now — check back tomorrow, the
            board refreshes daily.
          </div>
        )}
        {visible.map((job) => {
          const bucket = dayBucket(job.postedAt);
          const showLabel = bucket !== lastBucket;
          lastBucket = bucket;
          return (
            <div key={job.id}>
              {showLabel && <p className="day-label">{bucket}</p>}
              <article className="card">
                <div className="card-top">
                  <Logo job={job} />
                  <div className="card-head">
                    <h2>
                      <a
                        href={job.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {job.title}
                      </a>
                    </h2>
                    <p className="org-line">
                      {job.orgUrl ? (
                        <a
                          href={job.orgUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {job.org}
                        </a>
                      ) : (
                        <strong>{job.org}</strong>
                      )}
                      {job.areas.length > 0 && <> · {job.areas.join(", ")}</>}
                    </p>
                  </div>
                  <div className="badges">
                    {daysAgo(job.postedAt) <= 3 && (
                      <span className="badge new">NEW</span>
                    )}
                    {closingSoon(job) && (
                      <span className="badge closing">Closing soon</span>
                    )}
                    <span className="badge cat">{job.category}</span>
                  </div>
                </div>

                <div className="fact-row">
                  {job.locations.length > 0 && (
                    <span className="fact">
                      {pinIcon}
                      {job.locations.slice(0, 3).join(" · ")}
                      {job.locations.length > 3 &&
                        ` +${job.locations.length - 3}`}
                    </span>
                  )}
                  {job.salary && (
                    <span className="fact">
                      {cashIcon}
                      {job.salary}
                    </span>
                  )}
                  {job.experience.length > 0 && (
                    <span className="fact">
                      {levelIcon}
                      {job.experience.join(", ")}
                    </span>
                  )}
                </div>

                {job.descriptionHtml && (
                  <details>
                    <summary>About this role</summary>
                    <div
                      className="desc"
                      dangerouslySetInnerHTML={{ __html: job.descriptionHtml }}
                    />
                  </details>
                )}

                <div className="card-actions">
                  <a
                    className="apply"
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View &amp; apply →
                  </a>
                  <span className="posted">{postedLabel(job.postedAt)}</span>
                </div>
              </article>
            </div>
          );
        })}
      </div>
    </>
  );
}
