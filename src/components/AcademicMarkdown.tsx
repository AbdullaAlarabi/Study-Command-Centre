import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function AcademicMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="academic-markdown text-slate-700">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="mb-4 mt-8 text-2xl font-bold text-navy first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-3 mt-7 text-xl font-bold text-navy first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 mt-5 text-base font-bold text-navy">{children}</h3>,
          p: ({ children }) => <p className="my-3 text-sm leading-7 sm:text-base">{children}</p>,
          ul: ({ children }) => <ul className="my-3 list-disc space-y-2 pl-6 text-sm leading-7 sm:text-base">{children}</ul>,
          ol: ({ children }) => <ol className="my-3 list-decimal space-y-2 pl-6 text-sm leading-7 sm:text-base">{children}</ol>,
          li: ({ children }) => <li className="pl-1 marker:font-semibold marker:text-teal-700">{children}</li>,
          strong: ({ children }) => <strong className="font-bold text-navy">{children}</strong>,
          blockquote: ({ children }) => <blockquote className="my-4 border-l-4 border-teal/40 bg-teal-50 px-4 py-2 text-slate-600">{children}</blockquote>,
          hr: () => <hr className="my-6 border-navy/10" />,
          table: ({ children }) => <div className="my-5 overflow-x-auto rounded-xl border border-navy/10"><table className="w-full min-w-96 border-collapse text-left text-sm">{children}</table></div>,
          thead: ({ children }) => <thead className="bg-navy-50 text-navy">{children}</thead>,
          th: ({ children }) => <th className="border-b border-navy/10 p-3 font-bold">{children}</th>,
          td: ({ children }) => <td className="border-b border-navy/10 p-3 align-top leading-6 last:border-b-0">{children}</td>,
          a: ({ children, href }) => <a className="font-semibold text-teal-700 underline decoration-teal/30 underline-offset-2" href={href} target="_blank" rel="noreferrer">{children}</a>,
          input: (props) => <input {...props} className="mr-2 accent-teal" disabled />,
        }}
      >
        {markdown}
      </Markdown>
    </div>
  )
}
