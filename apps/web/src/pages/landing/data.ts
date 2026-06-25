/**
 * All marketing copy for the /welcome storefront, in one place so the sections
 * stay presentational. Real, specific, India-first copy — no lorem.
 */
import {
  Users, Workflow, FileText, CalendarCheck, Bot,
  type LucideIcon,
} from 'lucide-react';

export const NAV_LINKS = [
  { label: 'Platform', href: '#platform' },
  { label: 'Product', href: '#product' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
] as const;

/** Modules shown in the hero marquee + problem→solution constellation. */
export const MODULES = [
  'Clients', 'Projects', 'Tasks', 'Attendance', 'Leaves', 'Timesheets',
  'Invoices', 'Payments', 'Expenses', 'Contracts', 'Tickets', 'Knowledge Base',
] as const;

/** Logo / trust strip — placeholder agency + tech names, clearly labelled. */
export const LOGOS = [
  'Lumen Studios', 'Webinar Republic', 'GrowthBy', 'Nucleus Media',
  'Funnelworks', 'Orbit Creative', 'Adlytics', 'Kindle Labs',
] as const;

export type Feature = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  icon: LucideIcon;
  demo: 'crm' | 'kanban' | 'invoice' | 'assistant' | 'command';
};

export const FEATURES: Feature[] = [
  {
    id: 'crm',
    eyebrow: 'Clients & CRM',
    title: 'Every client, contact and deal in one audited book.',
    body: 'A GST-ready client record from day one — GSTIN, billing address, contacts and the entire project history on a single screen.',
    bullets: ['GSTIN + PAN validated on entry', 'Contacts, deals & activity timeline', 'Two-layer RBAC on every field'],
    icon: Users,
    demo: 'crm',
  },
  {
    id: 'projects',
    eyebrow: 'Projects & Tasks',
    title: 'A board that refuses to let work skip a step.',
    body: 'Milestones, dependencies and assignments with transition guards built in — no card reaches “Done” before its blockers clear.',
    bullets: ['Kanban with status-transition guards', 'Dependencies & milestone tracking', 'Optimistic drag, server-reconciled'],
    icon: Workflow,
    demo: 'kanban',
  },
  {
    id: 'invoicing',
    eyebrow: 'GST Invoicing',
    title: 'GST that computes itself — to the paisa.',
    body: 'CGST/SGST for intra-state, IGST for inter-state, exact-money arithmetic and GSTR-ready exports. No spreadsheets, no rounding drift.',
    bullets: ['CGST / SGST / IGST auto-split', 'Exact-money (no float) totals', 'GSTR-1 ready exports'],
    icon: FileText,
    demo: 'invoice',
  },
  {
    id: 'people',
    eyebrow: 'Attendance & Leaves',
    title: 'The people ops your studio keeps in WhatsApp.',
    body: 'Attendance, leave balances and timesheets in one place — approvals that take a tap, not a thread.',
    bullets: ['Leave balances & approvals', 'Timesheets per project', 'Holiday + shift calendars'],
    icon: CalendarCheck,
    demo: 'command',
  },
  {
    id: 'ai',
    eyebrow: 'AI Assistant',
    title: 'Ask your operations anything.',
    body: 'A guard-railed, read-only assistant that answers over your own clients, invoices and docs — grounded in your data, never inventing it.',
    bullets: ['Read-only, permission-scoped RAG', 'Cites the record it answered from', 'Grounded in your knowledge base'],
    icon: Bot,
    demo: 'assistant',
  },
];

export const METRICS = [
  { value: 18, suffix: 'hrs', label: 'saved per week on ops admin', sub: 'across CRM, invoicing & approvals' },
  { value: 100, suffix: '%', label: 'GST-accurate invoices', sub: 'exact-money arithmetic, every time' },
  { value: 12, suffix: '', label: 'modules, one login', sub: 'no more tool-hopping' },
  { value: 99.95, suffix: '%', label: 'uptime, audited', sub: 'append-only trail on every action' },
];

export type Testimonial = { quote: string; name: string; role: string; initials: string };

export const TESTIMONIALS: Testimonial[] = [
  {
    quote: 'We ran the agency across WhatsApp, Sheets and three invoicing tools. Pixel Academy collapsed all of it into one screen our ops lead actually enjoys opening.',
    name: 'Ananya Rao', role: 'Founder, Lumen Studios', initials: 'AR',
  },
  {
    quote: 'GST used to be a Friday-night spreadsheet ritual. Now CGST/SGST splits compute themselves and the GSTR export is one click. That alone paid for it.',
    name: 'Karthik Menon', role: 'Ops Lead, Webinar Republic', initials: 'KM',
  },
  {
    quote: 'The Kanban guards stopped tasks slipping to “Done” with blockers open. Our delivery on-time rate jumped in the first month.',
    name: 'Priya Nair', role: 'Delivery Head, Nucleus Media', initials: 'PN',
  },
  {
    quote: 'The AI assistant answers “which invoices are overdue this week” in seconds, citing the exact records. It feels like a teammate who never sleeps.',
    name: 'Rohit Sharma', role: 'Co-founder, Funnelworks', initials: 'RS',
  },
  {
    quote: 'Onboarding a new project manager used to take a week of context. Now it’s one login — clients, history and permissions are all there.',
    name: 'Sneha Iyer', role: 'COO, Orbit Creative', initials: 'SI',
  },
];

export type Plan = {
  name: string;
  price: { monthly: number; annual: number };
  tagline: string;
  features: string[];
  cta: string;
  featured?: boolean;
};

export const PLANS: Plan[] = [
  {
    name: 'Studio',
    price: { monthly: 2499, annual: 1999 },
    tagline: 'For lean agencies getting off spreadsheets.',
    features: ['Up to 5 seats', 'Clients, Projects & Tasks', 'GST invoicing & payments', 'Email support'],
    cta: 'Start with Studio',
  },
  {
    name: 'Growth',
    price: { monthly: 5999, annual: 4799 },
    tagline: 'For scaling teams that live in the platform.',
    features: ['Up to 25 seats', 'Everything in Studio', 'Attendance, Leaves & Timesheets', 'AI assistant & knowledge base', 'RBAC + audit trail', 'Priority WhatsApp support'],
    cta: 'Choose Growth',
    featured: true,
  },
  {
    name: 'Scale',
    price: { monthly: 13999, annual: 11199 },
    tagline: 'For multi-team studios with compliance needs.',
    features: ['Unlimited seats', 'Everything in Growth', 'SSO & advanced roles', 'GSTR-ready exports & reports', 'Dedicated success manager'],
    cta: 'Talk to sales',
  },
];

export const FAQS = [
  {
    q: 'Is the GST invoicing actually compliant?',
    a: 'Yes. We split CGST/SGST for intra-state and IGST for inter-state automatically, compute every total with exact-money (integer paisa) arithmetic so there is no rounding drift, and produce GSTR-1-ready exports straight from your data.',
  },
  {
    q: 'Can I move my existing clients and projects in?',
    a: 'You can import clients, contacts and projects from CSV during onboarding, and our team will help map your existing structure. Nothing has to be re-keyed by hand.',
  },
  {
    q: 'Who can see what? How does access control work?',
    a: 'Two layers: role-based permissions decide which modules a person reaches, and record-level rules scope what they see inside them. Every action is written to an append-only audit trail.',
  },
  {
    q: 'Is the AI assistant safe with our data?',
    a: 'It is read-only and permission-scoped — it can only answer over records the asking user is already allowed to see, it cites the source record, and it never writes or invents data.',
  },
  {
    q: 'Do you support WhatsApp-led workflows?',
    a: 'Pixel Academy is built for India’s webinar-led, WhatsApp-first agencies. Approvals, reminders and ticket updates are designed to fit how your team already communicates.',
  },
  {
    q: 'What does pricing include and is it really in ₹?',
    a: 'All pricing is in Indian Rupees, billed per workspace. GST is added as applicable. Annual billing saves roughly 20% over monthly, and there are no per-invoice fees.',
  },
];

export const FOOTER = {
  product: ['Platform', 'Clients & CRM', 'GST Invoicing', 'Projects', 'AI Assistant', 'Pricing'],
  company: ['About', 'Customers', 'Careers', 'Blog', 'Contact'],
  legal: ['Privacy', 'Terms', 'GST & Compliance', 'Security'],
} as const;
