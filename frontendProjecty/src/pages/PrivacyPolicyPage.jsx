import { Link } from 'react-router-dom';
import { FolderKanban, ArrowLeft } from 'lucide-react';

const SECTIONS = [
  {
    title: '1. Information we collect',
    body: [
      `Account information: your name, email address, and password (stored as a salted hash — we never store or can retrieve your plain-text password).`,
      `Profile information: an avatar image, if you choose to upload one.`,
      `Content you create: projects, terms, tasks, notes, Focus Room sessions and chat messages, and friend connections.`,
      `Usage and technical information: standard web server logs (IP address, browser type, timestamps) generated automatically by visiting the Service, and a JWT authentication token plus your theme preference stored in your browser's local storage.`,
    ],
  },
  {
    title: '2. How we use it',
    body: [
      `To provide the Service: authenticate you, sync your projects, tasks, and notes, run real-time Focus Room sessions over WebSockets, and deliver in-app notifications (friend requests, room invites, streaks, reminders).`,
      `To maintain and secure the Service: detect abuse, debug issues, and enforce our Terms of Use.`,
      `We do not use your content or account information for advertising, and we do not sell your personal information.`,
    ],
  },
  {
    title: '3. What we share',
    body: [
      `Collaborative features are visible to who you'd expect: a Focus Room's participants can see each other's display name, avatar, and chat messages in that room; an accepted friend can see your name and avatar.`,
      `We share data with the infrastructure we run on (e.g., our hosting and database providers) only as needed to operate the Service, under their own security practices. We don't sell or rent your personal information to third parties, and we only disclose it beyond that if required by law or to protect the rights, safety, or property of Collab or our users.`,
    ],
  },
  {
    title: '4. Third-party links',
    body: [
      `The Notes feature can fetch the readable text of a URL you provide, so it's saved directly in the app. We don't control the content at third-party URLs and aren't responsible for it — that fetch happens once, at your request, to save a copy for your own reference.`,
    ],
  },
  {
    title: '5. Data storage and security',
    body: [
      `Passwords are hashed with BCrypt before storage. Authentication uses signed JWT bearer tokens. Uploaded avatars are validated (file type and size) before being stored. We take reasonable technical measures to protect your data, but no online service can guarantee absolute security.`,
    ],
  },
  {
    title: '6. Data retention and deletion',
    body: [
      `We keep your account and content for as long as your account is active. If you delete your account (or ask us to), we'll remove your personal information and content within a reasonable time, except where we're required to retain something for legal or security reasons.`,
    ],
  },
  {
    title: '7. Your rights',
    body: [
      `Depending on where you live, you may have the right to access, correct, export, or delete your personal information, and to object to or restrict certain processing. You can update most of your information yourself from your Profile page, or contact us to exercise any of these rights.`,
    ],
  },
  {
    title: "8. Children's privacy",
    body: [
      `Collab isn't directed at children under 13, and we don't knowingly collect personal information from them. If you believe a child has created an account, contact us and we'll remove it.`,
    ],
  },
  {
    title: '9. Changes to this policy',
    body: [
      `If we make material changes to this policy, we'll make a reasonable effort to let you know before they take effect.`,
    ],
  },
  {
    title: '10. Contact',
    body: [
      `Questions about this policy, or want to exercise a data right? Reach us at privacy@collab.app.`,
    ],
  },
];

export const PrivacyPolicyPage = () => (
  <div className="min-h-screen bg-background text-foreground">
    <nav className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <FolderKanban className="h-4 w-4" />
          </span>
          Collab
        </Link>
        <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back home
        </Link>
      </div>
    </nav>

    <main className="container mx-auto max-w-3xl px-4 py-16">
      <p className="eyebrow-label mb-4 w-fit">[ legal ]</p>
      <h1 className="mb-2 text-4xl font-bold text-foreground">Privacy Policy</h1>
      <p className="mb-12 text-sm text-muted-foreground">Last updated: July 2026</p>

      <div className="space-y-10">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="mb-3 text-lg font-semibold text-foreground">{section.title}</h2>
            <div className="space-y-3">
              {section.body.map((paragraph, i) => (
                <p key={i} className="leading-relaxed text-muted-foreground">{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  </div>
);

export default PrivacyPolicyPage;
