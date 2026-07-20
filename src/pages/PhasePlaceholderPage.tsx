import type { LucideIcon } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import { PageContainer } from '../components/PageContainer'

export function PhasePlaceholderPage({
  eyebrow,
  title,
  description,
  emptyTitle,
  emptyDescription,
  icon,
  homeTo,
}: {
  eyebrow: string
  title: string
  description: string
  emptyTitle: string
  emptyDescription: string
  icon: LucideIcon
  homeTo: string
}) {
  return (
    <PageContainer eyebrow={eyebrow} title={title} description={description}>
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={icon}
        actionLabel="Return to dashboard"
        actionTo={homeTo}
      />
    </PageContainer>
  )
}
