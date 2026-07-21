import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

// Hit twice a week by the Vercel cron in vercel.json. Purging the home route's
// cache forces the next render to re-run the Algolia fetch and every liveness
// probe from scratch, so any listing whose posting has closed is dropped even
// if no one has visited the site in the meantime.
export const dynamic = "force-dynamic";

export function GET() {
  revalidatePath("/");
  return NextResponse.json({ revalidated: true, at: Date.now() });
}
