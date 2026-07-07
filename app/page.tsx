import { fetchJobs } from "@/lib/jobs";
import JobBoard from "@/components/JobBoard";

export const revalidate = 21600; // re-fetch listings every 6 hours

export default async function Home() {
  const { jobs, fetchedAt } = await fetchJobs();

  const updated = new Date(fetchedAt * 1000).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="wrap">
      <header className="masthead">
        <p className="kicker">Effective Altruism · Careers</p>
        <h1>
          Comms &amp; Marketing
          <br />
          in High-Impact Orgs
        </h1>
        <p className="lede">
          Communications, marketing, and media roles across the effective
          altruism ecosystem — pulled daily from the 80,000 Hours job board and
          filtered so you only see the roles that fit.
        </p>
        <p className="meta">
          <span>
            <strong>{jobs.length}</strong> open roles
          </span>
          <span>
            Updated <strong>{updated}</strong>
          </span>
          <span>Refreshes automatically every day</span>
        </p>
      </header>

      <JobBoard jobs={jobs} />

      <footer className="colophon">
        Listings sourced from the{" "}
        <a
          href="https://jobs.80000hours.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          80,000 Hours job board
        </a>
        , which aggregates vacancies from organisations working on the world's
        most pressing problems. Roles are filtered automatically for
        communications, marketing, content, and outreach work — always check
        the full posting before applying.
      </footer>
    </div>
  );
}
