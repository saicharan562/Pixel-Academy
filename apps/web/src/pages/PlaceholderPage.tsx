import { useNavigate } from 'react-router-dom';
import { Hammer } from 'lucide-react';
import { Button, EmptyState, PageHeader } from '../components/ui.js';

/** Designed "not built yet" state for modules still on the roadmap. */
export function PlaceholderPage({ title }: { title: string }) {
  const navigate = useNavigate();
  return (
    <div>
      <PageHeader title={title} subtitle="On the roadmap" />
      <EmptyState
        icon={Hammer}
        title={`${title} is coming soon`}
        description="We're crafting this module to the same standard as the rest of the workspace. It'll light up here the moment it ships."
        action={<Button variant="secondary" onClick={() => navigate('/')}>Back to overview</Button>}
      />
    </div>
  );
}
