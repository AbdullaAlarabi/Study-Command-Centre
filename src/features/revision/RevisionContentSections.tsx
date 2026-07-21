import {
  AlertTriangle,
  BookOpenCheck,
  Brain,
  ChevronDown,
  GitCompareArrows,
  ListChecks,
  MessageSquareText,
  NotebookTabs,
  Route,
  FileText,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { AcademicMarkdown } from '../../components/AcademicMarkdown'
import type { StudyPackContent } from '../../types/database'

export interface RevisionSectionDefinition {
  id: string
  title: string
}

export function getPresentRevisionSectionIds(content: StudyPackContent) {
  if (content.markdownSections?.length) {
    return content.markdownSections.map((section) => section.id)
  }
  return [
    content.assessmentOverview && 'assessmentOverview',
    content.chapterSummaries?.length && 'chapterSummaries',
    content.essentialDefinitions?.length && 'essentialDefinitions',
    content.mustRememberLists?.length && 'mustRememberLists',
    content.comparisonTables?.length && 'comparisonTables',
    content.likelyEssayQuestions?.length && 'likelyEssayQuestions',
    content.answerPlans?.length && 'answerPlans',
    content.commonMistakes?.length && 'commonMistakes',
  ].filter((id): id is string => Boolean(id))
}

function RevisionSection({
  id,
  title,
  icon: Icon,
  opened,
  onOpen,
  children,
}: {
  id: string
  title: string
  icon: LucideIcon
  opened: boolean
  onOpen: (id: string) => void
  children: ReactNode
}) {
  return (
    <details
      className="group rounded-card border border-navy/10 bg-surface shadow-card"
      onToggle={(event) => {
        if (event.currentTarget.open) onOpen(id)
      }}
    >
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 p-5 marker:content-none sm:p-6">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy">
          <Icon aria-hidden="true" size={20} />
        </span>
        <h2 className="min-w-0 flex-1 font-bold text-navy sm:text-lg">{title}</h2>
        {opened && <span className="hidden text-xs font-semibold text-teal-700 sm:block">Opened</span>}
        <ChevronDown className="shrink-0 text-muted transition group-open:rotate-180" aria-hidden="true" size={20} />
      </summary>
      <div className="border-t border-navy/10 px-5 py-5 sm:px-6 sm:py-6">{children}</div>
    </details>
  )
}

export function RevisionContentSections({
  content,
  openedSectionIds,
  onOpen,
}: {
  content: StudyPackContent
  openedSectionIds: ReadonlySet<string>
  onOpen: (id: string) => void
}) {
  if (content.markdownSections?.length) {
    return (
      <div className="space-y-4">
        {content.markdownSections.map((section) => (
          <RevisionSection
            key={section.id}
            id={section.id}
            title={section.title}
            icon={FileText}
            opened={openedSectionIds.has(section.id)}
            onOpen={onOpen}
          >
            <AcademicMarkdown markdown={section.markdown} />
          </RevisionSection>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {content.assessmentOverview && (
        <RevisionSection id="assessmentOverview" title="Assessment overview" icon={BookOpenCheck} opened={openedSectionIds.has('assessmentOverview')} onOpen={onOpen}>
          <p className="whitespace-pre-line text-sm leading-7 text-slate-700 sm:text-base">{content.assessmentOverview}</p>
        </RevisionSection>
      )}

      {content.chapterSummaries && content.chapterSummaries.length > 0 && (
        <RevisionSection id="chapterSummaries" title="Chapter summaries" icon={NotebookTabs} opened={openedSectionIds.has('chapterSummaries')} onOpen={onOpen}>
          <div className="grid gap-4 lg:grid-cols-3">
            {content.chapterSummaries.map((item) => (
              <article key={item.title} className="rounded-xl border border-navy/10 bg-navy-50/60 p-4">
                <h3 className="font-bold text-navy">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.summary}</p>
              </article>
            ))}
          </div>
        </RevisionSection>
      )}

      {content.essentialDefinitions && content.essentialDefinitions.length > 0 && (
        <RevisionSection id="essentialDefinitions" title="Essential definitions" icon={Brain} opened={openedSectionIds.has('essentialDefinitions')} onOpen={onOpen}>
          <dl className="grid gap-3 sm:grid-cols-2">
            {content.essentialDefinitions.map((item) => (
              <div key={item.term} className="rounded-xl border border-teal/15 bg-teal-50 p-4">
                <dt className="font-bold text-navy">{item.term}</dt>
                <dd className="mt-2 text-sm leading-6 text-slate-600">{item.definition}</dd>
              </div>
            ))}
          </dl>
        </RevisionSection>
      )}

      {content.mustRememberLists && content.mustRememberLists.length > 0 && (
        <RevisionSection id="mustRememberLists" title="Must-remember lists" icon={ListChecks} opened={openedSectionIds.has('mustRememberLists')} onOpen={onOpen}>
          <div className="grid gap-4 lg:grid-cols-2">
            {content.mustRememberLists.map((list) => (
              <article key={list.title} className="rounded-xl border border-gold/20 bg-gold-50 p-4">
                <h3 className="font-bold text-navy">{list.title}</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                  {list.items.map((item) => <li key={item} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-gold" />{item}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </RevisionSection>
      )}

      {content.comparisonTables && content.comparisonTables.length > 0 && (
        <RevisionSection id="comparisonTables" title="Comparison tables" icon={GitCompareArrows} opened={openedSectionIds.has('comparisonTables')} onOpen={onOpen}>
          <div className="space-y-5">
            {content.comparisonTables.map((table) => (
              <div key={table.title}>
                <h3 className="mb-3 font-bold text-navy">{table.title}</h3>
                <div className="overflow-x-auto rounded-xl border border-navy/10">
                  <table className="w-full min-w-96 border-collapse text-left text-sm">
                    <tbody>
                      {table.rows.map((row, rowIndex) => (
                        <tr key={`${table.title}-${rowIndex}`} className="border-b border-navy/10 last:border-0">
                          {row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} className={`p-3 align-top leading-6 ${cellIndex === 0 ? 'font-semibold text-navy' : 'text-slate-600'}`}>{cell}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </RevisionSection>
      )}

      {content.likelyEssayQuestions && content.likelyEssayQuestions.length > 0 && (
        <RevisionSection id="likelyEssayQuestions" title="Likely essay questions" icon={MessageSquareText} opened={openedSectionIds.has('likelyEssayQuestions')} onOpen={onOpen}>
          <ol className="space-y-3">
            {content.likelyEssayQuestions.map((question, index) => <li key={question} className="flex gap-3 rounded-xl border border-navy/10 p-4 text-sm font-medium leading-6 text-navy"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-navy text-xs font-bold text-white">{index + 1}</span>{question}</li>)}
          </ol>
        </RevisionSection>
      )}

      {content.answerPlans && content.answerPlans.length > 0 && (
        <RevisionSection id="answerPlans" title="Essay answer plans" icon={Route} opened={openedSectionIds.has('answerPlans')} onOpen={onOpen}>
          <div className="space-y-4">
            {content.answerPlans.map((plan) => (
              <article key={plan.question} className="rounded-xl border border-teal/15 bg-teal-50 p-4">
                <h3 className="font-bold leading-6 text-navy">{plan.question}</h3>
                <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                  {plan.points.map((point, index) => <li key={point} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-teal-700">{index + 1}</span>{point}</li>)}
                </ol>
              </article>
            ))}
          </div>
        </RevisionSection>
      )}

      {content.commonMistakes && content.commonMistakes.length > 0 && (
        <RevisionSection id="commonMistakes" title="Common mistakes" icon={AlertTriangle} opened={openedSectionIds.has('commonMistakes')} onOpen={onOpen}>
          <ul className="space-y-3">
            {content.commonMistakes.map((mistake) => <li key={mistake} className="flex gap-3 rounded-xl border border-risk/15 bg-risk-50 p-4 text-sm leading-6 text-risk-700"><AlertTriangle className="mt-0.5 shrink-0" aria-hidden="true" size={17} />{mistake}</li>)}
          </ul>
        </RevisionSection>
      )}
    </div>
  )
}
