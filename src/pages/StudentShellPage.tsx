import { TemporaryRoleShell } from '../layouts/TemporaryRoleShell'

export function StudentShellPage() {
  return (
    <TemporaryRoleShell
      eyebrow="Student workspace"
      title="Your study dashboard is ready for the next phase."
      description="Authentication and role-based routing are working. The final dashboard, schedule, progress, and roadmap will be added in their dedicated phases."
    >
      <div className="rounded-xl border border-teal/20 bg-teal/5 p-5 text-sm leading-6 text-navy">
        Phase 1 shell: student access confirmed.
      </div>
    </TemporaryRoleShell>
  )
}
