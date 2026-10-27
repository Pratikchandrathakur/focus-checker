import { buildWeeklyReport } from './report.ts';
import { renderReportEmail } from './html.ts';

export interface Recipient { user_id: string; email: string; name?: string }
export interface JobDeps {
  now: () => Date;
  appUrl: string;
  maxPerRun: number;
  listRecipients: (limit: number) => Promise<Recipient[]>;
  fetchItems: (userId: string, sinceIso: string) => Promise<unknown[]>;
  send: (m: { to: string; subject: string; html: string; text: string }) => Promise<void>;
  markSent: (userId: string) => Promise<void>;
  log: (line: string) => void;
}

// One address, no whitespace/control characters, no commas or angle brackets (blocks header injection).
const EMAIL_RE = /^[^\s,;<>"'()\\\u0000-\u001f]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

export async function runWeeklyReports(d: JobDeps): Promise<{ sent: number; skipped: number; failed: number }> {
  const out = { sent: 0, skipped: 0, failed: 0 };
  const recipients = (await d.listRecipients(d.maxPerRun)).slice(0, d.maxPerRun);
  const since = new Date(d.now().getTime() - 14 * 864e5).toISOString();

  for (const r of recipients) {
    try {
      if (typeof r.email !== 'string' || r.email.length > 254 || !EMAIL_RE.test(r.email)) { out.skipped++; continue; }
      const report = buildWeeklyReport(await d.fetchItems(r.user_id, since), { now: d.now() });
      if (!report.hasActivity) { out.skipped++; continue; }
      const mail = renderReportEmail(report, { appUrl: d.appUrl, name: r.name });
      await d.send({ to: r.email, ...mail });
      await d.markSent(r.user_id);
      out.sent++;
    } catch {
      out.failed++;
      d.log(JSON.stringify({ event: 'report_failed', user: r.user_id })); // ids only, never addresses
    }
  }
  d.log(JSON.stringify({ event: 'report_run', ...out }));
  return out;
}
