import { TemporaryRoleShell } from '../layouts/TemporaryRoleShell'

export function CoachShellPage() {
  return (
    <TemporaryRoleShell
      eyebrow="Coach workspace"
      title="The coach workspace is connected."
      description="Authentication and role-based routing are working. Analytics, attempt review, essays, and activity monitoring will be built in their dedicated phase."
    >
      <div className="rounded-xl border border-gold/25 bg-amber-50 p-5 text-sm leading-6 text-navy">
        Phase 1 shell: coach access confirmed.
      </div>
    </TemporaryRoleShell>
  )
}
