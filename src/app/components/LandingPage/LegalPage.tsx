import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { SITE } from '../../config';

// Plain-language starting points. Have them reviewed before charging money.

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
      <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

function Privacy() {
  return (
    <>
      <Section title="The short version">
        <p>
          As a guest, everything stays in your own browser. If you create an account, your sessions, check-ins and
          breathing logs are stored in our database so they sync across your devices. We don't sell data and we don't
          use it for advertising.
        </p>
      </Section>
      <Section title="What we store">
        <p>Guest: your history, self-ratings, timer state and preferences, in this browser only (localStorage).</p>
        <p>
          Account: your email, name and password hash (handled by our authentication provider, Supabase), plus the
          same history, stored in a database where access rules ensure only you can read or change your rows.
        </p>
        <p>Export everything as JSON or CSV from the Journal. "Clear" deletes it from this device and from your account.</p>
      </Section>
      <Section title="What reaches our servers">
        <p>
          Our hosting provider receives standard request logs (IP address, browser, pages requested) to serve the site
          and protect it from abuse. Sign-in emails are sent through our email provider. If we add analytics, we'll
          update this page first.
        </p>
      </Section>
      <Section title="Deleting your account">
        <p>Email us from your account address and we'll delete the account and all its data within 30 days.</p>
      </Section>
      <Section title="Paid plans">
        <p>
          When Pro launches, payments will be handled by a third-party merchant of record. We never see or store your
          full card details. Account data needed for sync will be stored with our database provider and deleted on request.
        </p>
      </Section>
      <Section title="Children">
        <p>{SITE.name} is not directed at children under 13.</p>
      </Section>
      <Section title="Contact">
        <p>Questions or deletion requests: <a className="text-sky-600 underline" href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a></p>
      </Section>
    </>
  );
}

function Terms() {
  return (
    <>
      <Section title={`Using ${SITE.name}`}>
        <p>
          {SITE.name} is a productivity tool: a focus timer, guided breathing exercises, audio and self-tracking.
          You may use the free version for personal or work purposes. Don't misuse the service or try to disrupt it.
        </p>
      </Section>
      <Section title="Not medical advice">
        <p>
          {SITE.name} is not a medical device and does not diagnose, treat or prevent any condition. Breathing
          exercises and audio are offered for general wellbeing. Stop any exercise that makes you dizzy or
          uncomfortable. If you have a heart, respiratory, seizure or mental-health condition, check with a qualified
          professional first. Keep audio at a comfortable, low volume.
        </p>
      </Section>
      <Section title="Your data">
        <p>
          Data you create is yours. In the free version it lives in your browser; clearing site data deletes it. We
          recommend exporting regularly.
        </p>
      </Section>
      <Section title="Paid plans">
        <p>
          Paid features, prices and billing terms will be shown before purchase. Subscriptions can be cancelled anytime
          and remain active until the end of the paid period. Refund requests within 14 days of purchase will be honoured.
        </p>
      </Section>
      <Section title="No warranty">
        <p>
          The service is provided "as is". To the extent permitted by law, {SITE.owner} isn't liable for indirect or
          consequential losses, including lost data. These terms are governed by the laws of {SITE.jurisdiction}.
        </p>
      </Section>
      <Section title="Changes & contact">
        <p>
          We may update these terms and will change the date below when we do. Contact:{' '}
          <a className="text-sky-600 underline" href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>
        </p>
      </Section>
    </>
  );
}

export function LegalPage({ kind, onBack }: { kind: 'privacy' | 'terms'; onBack: () => void }) {
  return (
    <div className="min-h-screen clay-canvas">
      <div className="max-w-2xl mx-auto px-5 py-10 md:py-16">
        <button onClick={onBack} className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-sky-600">
          <ArrowLeft size={14} /> Back to {SITE.name}
        </button>
        <article className="clay-card p-6 md:p-10 space-y-6">
          <header className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
              {kind === 'privacy' ? 'Privacy Policy' : 'Terms of Use'}
            </h1>
            <p className="text-xs text-slate-400">Last updated {SITE.legalLastUpdated}</p>
          </header>
          {kind === 'privacy' ? <Privacy /> : <Terms />}
        </article>
      </div>
    </div>
  );
}
