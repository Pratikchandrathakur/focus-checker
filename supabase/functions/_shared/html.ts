import type { WeeklyReport } from './report.ts';

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export interface RenderedEmail { subject: string; html: string; text: string }

/** Builds the weekly email. Everything user-supplied is escaped; no images, scripts or remote CSS. */
export function renderReportEmail(r: WeeklyReport, o: { appUrl: string; name?: string }): RenderedEmail {
  const u = new URL(o.appUrl);
  if (u.protocol !== 'https:') throw new Error('appUrl must be https');
  const link = `${u.origin}/app/analytics`;
  const name = (o.name ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 40);
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi,';
  const rows: [string, string][] = [
    ['Focus time', `${r.focus.minutes} min`],
    ['Sessions', String(r.focus.sessions)],
  ];
  if (r.focus.avgScore !== null) rows.push(['Average session score', `${r.focus.avgScore}%`]);
  if (r.checks.avgReadiness !== null) rows.push(['Average readiness', `${r.checks.avgReadiness}%`]);
  if (r.resets.count) rows.push(['Breathing resets', String(r.resets.count)]);

  const td = 'padding:8px 0;border-bottom:1px solid #e3eaee;font-size:15px;color:#0f1f2e';
  const html = `<!doctype html><html><body style="margin:0;background:#f2f6f7;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:28px">
<tr><td>
<p style="margin:0 0 4px;font-size:13px;color:#465a6b">FocusChecker · ${escapeHtml(r.periodLabel)}</p>
<h1 style="margin:0 0 16px;font-size:24px;color:#0f1f2e">Your focus week</h1>
<p style="margin:0 0 16px;font-size:15px;color:#0f1f2e">${greeting}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${rows.map(([k, v]) => `<tr><td style="${td}">${escapeHtml(k)}</td><td align="right" style="${td};font-weight:bold">${escapeHtml(v)}</td></tr>`).join('\n')}
</table>
${r.highlights.length ? `<ul style="margin:16px 0;padding-left:20px;font-size:15px;color:#0f1f2e;line-height:1.5">${r.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join('')}</ul>` : ''}
${r.topTasks.length ? `<p style="margin:16px 0 4px;font-size:13px;color:#465a6b">Where your time went</p><ul style="margin:0;padding-left:20px;font-size:15px;color:#0f1f2e;line-height:1.5">${r.topTasks.map((t) => `<li>${escapeHtml(t.task)}: ${t.minutes} min</li>`).join('')}</ul>` : ''}
<p style="margin:24px 0 0"><a href="${link}" style="display:inline-block;background:#4cc3ff;color:#04202f;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:999px">Open your analytics</a></p>
<p style="margin:24px 0 0;font-size:12px;color:#465a6b">You get this because you turned on the weekly report. Turn it off any time in <a href="${link}" style="color:#0a6fa8">Analytics</a>. FocusChecker is a productivity tool, not a medical device.</p>
</td></tr></table></td></tr></table></body></html>`;

  const text = [
    `FocusChecker · ${r.periodLabel}`, 'Your focus week', '',
    ...rows.map(([k, v]) => `${k}: ${v}`), '',
    ...r.highlights.map((h) => `- ${h}`),
    ...(r.topTasks.length ? ['', 'Where your time went:', ...r.topTasks.map((t) => `- ${t.task}: ${t.minutes} min`)] : []),
    '', `Open your analytics: ${link}`,
    'Turn the weekly report off any time in Analytics.',
  ].join('\n');

  return { subject: `Your focus week: ${r.periodLabel}`, html, text };
}
