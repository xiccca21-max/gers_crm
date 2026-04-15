import { Inngest } from "inngest";

// Next/Vercel collect page data at build; env may be missing until project settings are filled.
const inngestId = process.env.INNGEST_ID ?? "nextcrm-build-placeholder";
const inngestName = process.env.INNGEST_APP_NAME ?? "NextCRM-Build";

export const inngest = new Inngest({
  id: inngestId,
  name: inngestName,
  eventKey: process.env.INNGEST_EVENT_KEY,
  signingKey: process.env.INNGEST_SIGNING_KEY,
});
