import { Link } from 'react-router-dom';
import { FolderKanban, ArrowLeft } from 'lucide-react';

const SECTIONS = [
  {
    title: '1. Acceptance of terms',
    body: [
      `By creating an account or otherwise using Collab ("the Service"), you agree to be bound by these Terms of Use. If you don't agree to them, don't use the Service.`,
      `We may update these terms from time to time. If we make material changes, we'll make a reasonable effort to let you know — continuing to use the Service after changes take effect means you accept the updated terms.`,
    ],
  },
  {
    title: '2. What Collab is',
    body: [
      `Collab is a project workspace: projects and tasks organized by term, a calendar, a Kanban board, notes, synchronized Pomodoro "Focus Rooms" you can share with friends over a real-time connection, a friends/notifications system, and usage statistics.`,
      `The Service is provided on an "as available" basis and may change, and features may be added or removed, at any time.`,
    ],
  },
  {
    title: '3. Accounts',
    body: [
      `You need an account to use most of the Service. You're responsible for keeping your password confidential and for all activity that happens under your account.`,
      `You must provide accurate information when you register, and keep it up to date. You must be old enough to legally consent to these terms in your jurisdiction to create an account.`,
      `We may suspend or terminate an account that violates these terms, that we reasonably believe was created with false information, or that's been inactive for an extended period.`,
    ],
  },
  {
    title: '4. Acceptable use',
    body: [
      `You agree not to: use the Service for anything unlawful; upload content you don't have the right to share (including as an avatar image or in a note); attempt to disrupt, overload, or gain unauthorized access to the Service or other users' accounts; use Focus Room chat or friend invitations to harass or spam other users; or reverse-engineer, scrape, or resell the Service without our written permission.`,
      `We may remove content or suspend accounts that violate this section without prior notice.`,
    ],
  },
  {
    title: '5. Your content',
    body: [
      `You keep ownership of everything you create in Collab — your tasks, projects, notes, chat messages, and uploaded avatar image ("Your Content"). By using the Service, you grant us a limited license to store, process, and display Your Content solely to operate and provide the Service to you (and, where a feature is explicitly collaborative — like a shared Focus Room — to the other participants you invite).`,
      `The Notes feature can fetch and store the readable text of an article at a URL you provide. You're responsible for the links you submit, and for having the right to save that content for your own use. We don't claim ownership over third-party article text fetched this way, and we make no guarantee about the accuracy or availability of content from a URL you provide.`,
    ],
  },
  {
    title: '6. Intellectual property',
    body: [
      `Aside from Your Content, the Service — its design, code, and branding — belongs to Collab and its contributors. Nothing in these terms transfers that ownership to you.`,
    ],
  },
  {
    title: '7. Termination',
    body: [
      `You can stop using the Service and ask us to delete your account at any time. We may suspend or terminate your access if you violate these terms, or discontinue the Service (or any part of it) at our discretion, with reasonable notice where practical.`,
    ],
  },
  {
    title: '8. Disclaimers and limitation of liability',
    body: [
      `The Service is provided "as is" and "as available," without warranties of any kind, express or implied, including any warranty of merchantability, fitness for a particular purpose, or non-infringement. We don't guarantee the Service will be uninterrupted, error-free, or that data will never be lost — back up anything irreplaceable.`,
      `To the fullest extent permitted by law, Collab and its contributors aren't liable for any indirect, incidental, special, or consequential damages arising from your use of, or inability to use, the Service.`,
    ],
  },
  {
    title: '9. Governing law',
    body: [
      `These terms are governed by the laws applicable in your place of residence, without regard to conflict-of-law principles, except where local law requires otherwise.`,
    ],
  },
  {
    title: '10. Contact',
    body: [
      `Questions about these terms? Reach us at legal@collab.app.`,
    ],
  },
];

export const TermsOfUsePage = () => (
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
      <h1 className="mb-2 text-4xl font-bold text-foreground">Terms of Use</h1>
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

export default TermsOfUsePage;
