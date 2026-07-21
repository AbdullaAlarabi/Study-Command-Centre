import {
  ArrowRight,
  BookOpenCheck,
  Check,
  GitCompareArrows,
  HelpCircle,
  Lightbulb,
  ListChecks,
  MessageSquareText,
  Route,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AcademicMarkdown } from '../components/AcademicMarkdown'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { PageContainer } from '../components/PageContainer'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../features/auth/AuthProvider'
import { useStudentOverview } from '../features/student/useStudentOverview'

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <section className="rounded-card border border-navy/10 bg-surface p-5 shadow-card sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-navy-50 text-navy">
          <Icon aria-hidden="true" size={20} />
        </span>
        <h2 className="text-lg font-bold text-navy">{title}</h2>
      </div>
      {children}
    </section>
  )
}

export function ChapterStudyPage() {
  const { unitId } = useParams()
  const { user, profile } = useAuth()
  const overview = useStudentOverview(user?.id)
  const unit = overview.units.find((candidate) => candidate.id === unitId)

  if (overview.loading) {
    return (
      <PageContainer eyebrow="Chapter study pack" title="Loading chapter content">
        <LoadingState />
      </PageContainer>
    )
  }

  if (overview.error) {
    return (
      <PageContainer eyebrow="Chapter study pack" title="Chapter unavailable">
        <ErrorState message={overview.error} onRetry={() => void overview.reload()} />
      </PageContainer>
    )
  }

  if (!unit || unit.unit_type !== 'chapter') {
    return (
      <PageContainer eyebrow="Chapter study pack" title="Chapter not found">
        <EmptyState
          title="This chapter does not exist"
          description="Return to the roadmap and select an available chapter."
          actionLabel="Open roadmap"
          actionTo="/student/roadmap"
        />
      </PageContainer>
    )
  }

  const content = unit.content_json
  const hasContent = Boolean(
    content.markdownSections?.length ||
      content.markdownBody ||
      content.overview ||
      content.keyDefinitions?.length ||
      content.mainIdeas?.length ||
      content.processesOrModels?.length ||
      content.comparisons?.length ||
      content.commonConfusions?.length ||
      content.likelyEssayThemes?.length ||
      content.canYouExplain?.length,
  )

  return (
    <PageContainer
      eyebrow={`Chapter ${unit.chapter_number ?? ''}`}
      title={unit.title}
      description={unit.description}
      actions={<StatusBadge status="on-track" label={profile?.role === 'coach' ? 'Coach preview' : 'Current unit'} />}
    >
      <div className="space-y-5">
        {!hasContent && (
          <EmptyState
            title="Study pack not populated yet"
            description="The chapter page is connected to learning_units.content_json. Verified notes will appear here during the academic content phases."
            icon={BookOpenCheck}
            actionLabel="Return to roadmap"
            actionTo="/student/roadmap"
          />
        )}

        {content.markdownSections?.map((section) => (
          <SectionCard key={section.id} title={section.title} icon={BookOpenCheck}>
            <AcademicMarkdown markdown={section.markdown} />
          </SectionCard>
        ))}

        {!content.markdownSections?.length && content.markdownBody && (
          <SectionCard title="Approved chapter pack" icon={BookOpenCheck}>
            <AcademicMarkdown markdown={content.markdownBody} />
          </SectionCard>
        )}

        {content.overview && (
          <SectionCard title="Chapter overview" icon={BookOpenCheck}>
            <p className="whitespace-pre-line leading-7 text-slate-700">{content.overview}</p>
          </SectionCard>
        )}

        {content.keyDefinitions && content.keyDefinitions.length > 0 && (
          <SectionCard title="Key definitions" icon={BookOpenCheck}>
            <dl className="grid gap-3 sm:grid-cols-2">
              {content.keyDefinitions.map((item) => (
                <div key={item.term} className="rounded-xl border border-navy/10 bg-navy-50/60 p-4">
                  <dt className="font-bold text-navy">{item.term}</dt>
                  <dd className="mt-2 text-sm leading-6 text-slate-600">{item.definition}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>
        )}

        {content.mainIdeas && content.mainIdeas.length > 0 && (
          <SectionCard title="Main ideas" icon={Lightbulb}>
            <ul className="space-y-3">
              {content.mainIdeas.map((idea) => (
                <li key={idea} className="flex gap-3 text-sm leading-6 text-slate-700">
                  <Check aria-hidden="true" className="mt-1 shrink-0 text-teal-700" size={17} />
                  {idea}
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        {content.processesOrModels && content.processesOrModels.length > 0 && (
          <SectionCard title="Processes and models" icon={Route}>
            <div className="grid gap-4 lg:grid-cols-2">
              {content.processesOrModels.map((model) => (
                <article key={model.title} className="rounded-xl border border-teal/15 bg-teal-50 p-4">
                  <h3 className="font-bold text-navy">{model.title}</h3>
                  <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                    {model.points.map((point, index) => (
                      <li key={point} className="flex gap-3">
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-teal-700">
                          {index + 1}
                        </span>
                        {point}
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          </SectionCard>
        )}

        {content.comparisons && content.comparisons.length > 0 && (
          <SectionCard title="Important comparisons" icon={GitCompareArrows}>
            <div className="space-y-5">
              {content.comparisons.map((comparison) => (
                <div key={comparison.title}>
                  <h3 className="mb-3 font-bold text-navy">{comparison.title}</h3>
                  <div className="overflow-x-auto rounded-xl border border-navy/10">
                    <table className="w-full min-w-96 border-collapse text-left text-sm">
                      <tbody>
                        {comparison.rows.map((row, rowIndex) => (
                          <tr key={`${comparison.title}-${rowIndex}`} className="border-b border-navy/10 last:border-0">
                            {row.map((cell, cellIndex) => (
                              <td
                                key={`${rowIndex}-${cellIndex}`}
                                className={`p-3 align-top leading-6 ${cellIndex === 0 ? 'font-semibold text-navy' : 'text-slate-600'}`}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {content.commonConfusions && content.commonConfusions.length > 0 && (
          <SectionCard title="Common confusions" icon={HelpCircle}>
            <ul className="space-y-3">
              {content.commonConfusions.map((confusion) => (
                <li key={confusion} className="rounded-xl border border-gold/20 bg-gold-50 p-4 text-sm leading-6 text-slate-700">
                  {confusion}
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        {content.likelyEssayThemes && content.likelyEssayThemes.length > 0 && (
          <SectionCard title="Likely essay themes" icon={MessageSquareText}>
            <ul className="grid gap-3 sm:grid-cols-2">
              {content.likelyEssayThemes.map((theme) => (
                <li key={theme} className="rounded-xl border border-navy/10 p-4 text-sm font-medium leading-6 text-navy">
                  {theme}
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        {content.canYouExplain && content.canYouExplain.length > 0 && (
          <SectionCard title="Can you explain these?" icon={ListChecks}>
            <ul className="space-y-3">
              {content.canYouExplain.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                  <span className="mt-1 size-4 shrink-0 rounded border-2 border-teal/40" />
                  {item}
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        <div className="sticky bottom-20 z-20 rounded-card border border-navy/10 bg-surface/95 p-3 shadow-lift backdrop-blur-xl lg:bottom-4">
          <Link
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy px-5 font-bold text-white hover:bg-navy-800"
            to={`/student/quiz/${unit.id}`}
          >
            {profile?.role === 'coach' ? 'Preview chapter quiz' : 'Start chapter quiz'}
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </div>
      </div>
    </PageContainer>
  )
}
