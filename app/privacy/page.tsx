import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, Database, EyeOff, Library, Lock, Send, Smartphone, TriangleAlert } from "lucide-react";
import { APP_NAME, DEFAULT_EMERGENCY_NUMBER } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy and limits",
  description: `What ${APP_NAME} sends, what it stores and for how long, what it never stores, and what it cannot do.`,
};

// Checked against OpenAI's "Data controls in the OpenAI platform" page in November 2026.
const OPENAI_DATA_CONTROLS = "https://developers.openai.com/api/docs/guides/your-data";

function Section({ id, title, Icon, children }: { id: string; title: string; Icon: typeof Send; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-6 flex-col gap-3">
      <h2 id={`${id}-title`} className="flex items-center gap-3 text-2xl font-bold">
        <Icon aria-hidden="true" className="size-7 shrink-0 text-primary" />
        {title}
      </h2>
      {children}
    </section>
  );
}

const list = "flex list-disc flex-col gap-2 pl-6";

// Official pages the urgent-moment advice is paraphrased from. Opened and read on 3 Nov 2026.
const ADVICE_SOURCES: { title: string; publisher: string; url: string; used: string }[] = [
  {
    title: "What To Do if You Were Scammed",
    publisher: "US Federal Trade Commission",
    url: "https://consumer.ftc.gov/articles/what-do-if-you-were-scammed",
    used: "Calling the bank straight away to ask them to stop or reverse a payment, keeping gift cards and receipts, changing passwords and turning on the extra sign-in check, and getting help to check a phone or computer.",
  },
  {
    title: "Phone Scams",
    publisher: "US Federal Trade Commission",
    url: "https://consumer.ftc.gov/articles/phone-scams",
    used: "Hanging up on a caller who pressures you, and that anyone offering to get lost money back is probably another scammer.",
  },
  {
    title: "How To Spot, Avoid, and Report Tech Support Scams",
    publisher: "US Federal Trade Commission",
    url: "https://consumer.ftc.gov/articles/how-spot-avoid-and-report-tech-support-scams",
    used: "Real computer companies do not call about problems with your computer, and checking your bank statement for payments you did not make.",
  },
  {
    title: "Courier fraud",
    publisher: "Report Fraud, UK police",
    url: "https://www.reportfraud.police.uk/courier-fraud/",
    used: "It is OK to refuse a caller, waiting five minutes or using a different phone before calling back, the bank and police never collect your card or money, and calling the bank straight away to stop a card.",
  },
];

export default function Privacy() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-8 text-lg">
      <Link href="/" className="inline-flex min-h-12 items-center gap-2 self-start font-bold text-primary underline underline-offset-4">
        <ArrowLeft aria-hidden="true" className="size-6" />
        {APP_NAME}
      </Link>

      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-bold">Privacy and limits</h1>
        <p className="text-xl">
          The short version: before a message leaves the phone, codes, card and account numbers, email addresses, phone
          numbers and the family&apos;s names are hidden. What is left is sent to an AI service to be read, and then it
          is gone from {APP_NAME}. Photos and voice recordings cannot be hidden first, so they are sent as they are. We
          never keep pictures or recordings. Family messages are kept for 7 days at most, and only when the person taps
          &ldquo;Show&rdquo; to share them. Families who want nothing sent at all can turn on private mode.
        </p>
      </div>

      <Section id="sent" title="What is sent, and to whom" Icon={Send}>
        <p>When someone checks a message, our server sends it to OpenAI&apos;s API to be read:</p>
        <ul className={list}>
          <li>
            <strong>Typed or pasted text</strong>, with personal details hidden on the phone first (see below).
          </li>
          <li>
            <strong>Photos and screenshots</strong>, as they are, apart from being made smaller on the phone. Making the
            picture smaller also removes hidden details such as the place where a photo was taken. Nothing in the picture
            itself can be hidden, because reading it is the AI service&apos;s job. If a picture shows a card number,
            cover it before taking the photo.
          </li>
          <li>
            <strong>Voice recordings</strong> (up to 60 seconds) are sent as they are to OpenAI&apos;s speech-to-text
            service to be turned into words. The words then have personal details hidden, like typed text, before they
            are checked.
          </li>
        </ul>
        <p>
          The phone talks only to our server, never to OpenAI directly, so the AI key stays secret. We ask OpenAI not to
          store the check (<code>store: false</code>). According to{" "}
          <a href={OPENAI_DATA_CONTROLS} className="font-bold text-primary underline underline-offset-4">
            OpenAI&apos;s data controls page
          </a>{" "}
          (checked November 2026):
        </p>
        <ul className={list}>
          <li>Data sent to the OpenAI API is not used to train their models.</li>
          <li>
            For the checks, OpenAI keeps abuse-monitoring logs for up to 30 days, unless the law requires them to keep
            them longer.
          </li>
          <li>For speech-to-text, the page lists no abuse-monitoring or other retention.</li>
        </ul>
        <p>
          &ldquo;Read it to me&rdquo; uses the voice built into the phone or browser. We choose a voice that works on the
          device when there is one.
        </p>
      </Section>

      <Section id="hidden" title="What is hidden before a message is sent" Icon={EyeOff}>
        <p>
          On the phone, before typed text or the words of a voice description are sent, {APP_NAME} replaces:
        </p>
        <ul className={list}>
          <li>card numbers with &ldquo;[CARD NUMBER]&rdquo;;</li>
          <li>bank account numbers, sort codes and IBANs with &ldquo;[ACCOUNT NUMBER]&rdquo;;</li>
          <li>codes and PINs of 4 to 8 digits with &ldquo;[CODE]&rdquo; (money amounts, dates and times stay);</li>
          <li>email addresses with &ldquo;[EMAIL]&rdquo; and phone numbers with &ldquo;[PHONE NUMBER]&rdquo;;</li>
          <li>the names of the person and their family members with &ldquo;[PARENT]&rdquo; and &ldquo;[FAMILY MEMBER]&rdquo;;</li>
          <li>
            everything in a link after the web address, so &ldquo;https://pay.example/ref/77&rdquo; becomes
            &ldquo;https://pay.example/[rest of link removed]&rdquo;. The address stays, because a fake address is one
            of the clearest signs of a scam.
          </li>
        </ul>
        <p>
          Every result has a &ldquo;What the AI service saw&rdquo; section that shows exactly what was sent. The
          warning signs, numbers and links shown to the person are still found on the phone in the full message, so
          hiding details does not make the phone&apos;s own check weaker. Hiding is done by fixed rules, so an unusual
          way of writing a number can slip through.
        </p>
      </Section>

      <Section id="private-mode" title="Private mode" Icon={Lock}>
        <p>
          A family member can turn on private mode in <em>Contacts and settings</em>, with their PIN. It is off unless
          they turn it on. With private mode on:
        </p>
        <ul className={list}>
          <li>nothing the person checks leaves their phone: no text, no pictures, no recordings;</li>
          <li>only typed or pasted messages can be checked, and photos and voice are switched off;</li>
          <li>
            each check uses our fixed rules alone and says &ldquo;Quick check on this phone only&rdquo;. A quick check
            can say &ldquo;Warning&rdquo; or &ldquo;Not sure&rdquo;, but never &ldquo;No warning signs found&rdquo;,
            and it misses more scams than a full check.
          </li>
        </ul>
        <p>&ldquo;Show [family name]&rdquo; still works in private mode, because it goes to the family, not to the AI service.</p>
      </Section>

      <Section id="stored" title="What we store, and for how long" Icon={Database}>
        <p>Only the family circle uses our database (Supabase). We store:</p>
        <ul className={list}>
          <li>
            <strong>The circle the family sets up:</strong> the parent&apos;s first name, text size, emergency number,
            family members&apos; names, relationships and phone numbers, and the verified contacts (such as the
            bank&apos;s real number). Kept until the family deletes the circle.
          </li>
          <li>
            <strong>The PIN</strong>, only as a scrambled code (a scrypt hash) that cannot be turned back into the PIN.
          </li>
          <li>
            <strong>Connected phones</strong>, as a scrambled code of each phone&apos;s secret key, with when it was
            connected and last used. The 6-digit connection code is also stored scrambled and expires after 15 minutes.
          </li>
          <li>
            <strong>Messages the parent chose to share</strong> with &ldquo;Show [family name]&rdquo;: a one-line
            summary, the first 500 characters of the text, the warning signs found, and the family&apos;s reply. Codes,
            card numbers and account numbers in the text are hidden; phone numbers and links stay, as plain text, so the
            family can see what to warn about. <strong>Deleted automatically after 7 days.</strong>
          </li>
          <li>
            <strong>URGENT alerts</strong>, sent when the parent taps &ldquo;Tell [family name]&rdquo; after hanging up
            on a worrying call, or says something already happened (for example &ldquo;I sent money&rdquo;): which
            choice they made, and, if it came from a checked message, the same summary and hidden-detail excerpt as
            above. <strong>Deleted automatically after 7 days.</strong>
          </li>
          <li>
            <strong>Request counters</strong> that stop the service being overused: a count per internet address per
            hour. The address is stored only as a scrambled code, and counters are deleted after a day.
          </li>
        </ul>
        <p>
          The family can delete everything at any time in <em>Contacts and settings</em>, with their PIN. The parent&apos;s
          phone stops working with the circle straight away.
        </p>
        <p>
          The website is hosted by Netlify, which keeps standard technical logs (such as internet addresses) under its own
          policy. Our server logs never contain the messages, pictures or words being checked.
        </p>
      </Section>

      <Section id="device" title="What stays on the parent's phone" Icon={Smartphone}>
        <ul className={list}>
          <li>
            The phone&apos;s secret key for the circle, and a copy of the names and numbers the family saved, so the call
            buttons and the Golden Rules still work without internet.
          </li>
          <li>The app&apos;s own screens, saved for offline use. These contain no personal information.</li>
        </ul>
        <p>
          The parent&apos;s phone can read the contacts but cannot change them. Only family members with the PIN can, so
          someone holding the phone cannot swap in their own number.
        </p>
      </Section>

      <Section id="never" title="What we never store" Icon={Ban}>
        <ul className={list}>
          <li>Photos or screenshots.</li>
          <li>Voice recordings, or the words written down from them.</li>
          <li>Messages that were checked but not shared with the family.</li>
          <li>Anything in our server logs about what was checked.</li>
        </ul>
        <p>
          The <Link href="/demo" className="font-bold text-primary underline underline-offset-4">demo</Link> stores
          nothing at all: its family messages stay in your browser tab and disappear when you close it. Checks in the
          demo are still sent to OpenAI as described above, unless you switch on private mode there. Please use the
          made-up samples, not real personal messages.
        </p>
      </Section>

      <Section id="advice" title="Where the advice comes from" Icon={Library}>
        <p>
          The steps on &ldquo;Someone is on the phone with me now&rdquo; and &ldquo;Something already happened&rdquo;
          are put in plain words from these official pages. We read them on 3 November 2026. Every call button uses a
          number the family saved, never one from a message or a web page.
        </p>
        <ul className={list}>
          {ADVICE_SOURCES.map((source) => (
            <li key={source.url}>
              <a href={source.url} className="font-bold text-primary underline underline-offset-4">
                {source.title}
              </a>{" "}
              ({source.publisher}). Used for: {source.used}
            </li>
          ))}
        </ul>
        <p>
          This is general guidance, not legal or financial advice. We cannot promise that money can be got back: the
          bank decides, and it is always worth asking.
        </p>
      </Section>

      <Section id="limitations" title="What it cannot do" Icon={TriangleAlert}>
        <ul className={list}>
          <li>
            <strong>It gives a second opinion, not a guarantee.</strong> It cannot catch every scam, and it can be wrong
            about a normal message. That is why it never says a message is &ldquo;safe&rdquo;, and always points to a
            family member or a number the family saved.
          </li>
          <li>
            <strong>It is not an emergency service.</strong> In an emergency, call {DEFAULT_EMERGENCY_NUMBER} or your local
            emergency number.
          </li>
          <li>
            <strong>It cannot listen to live phone calls.</strong> You can describe a call afterwards, out loud or in
            writing.
          </li>
          <li>
            <strong>Full checks need the internet and an AI service.</strong> Without them, it does a quick check with
            fixed rules and shows the Golden Rules. A quick check can say &ldquo;Warning&rdquo; or &ldquo;Not sure&rdquo;,
            but never &ldquo;No warning signs found&rdquo;.
          </li>
          <li>
            <strong>The family part needs a family member who answers.</strong> &ldquo;Show [family name]&rdquo; does not
            replace a phone call.
          </li>
          <li>
            <strong>English only.</strong>
          </li>
          <li>
            <strong>Tested on made-up messages only.</strong> Our evaluation uses 48 fictional messages written by the
            builder, so results on real messages may differ.
          </li>
        </ul>
      </Section>
    </main>
  );
}
