import { AppShell } from 'design-system';

const NAV = [{ label: 'Agents', href: '/agents', active: true }];

export default function AgentsPage() {
  return (
    <AppShell nav={NAV} productName="Agent Studio" title="Agents">
      <p className="text-sm text-text-muted">Loading…</p>
    </AppShell>
  );
}
