export interface EssayFeedbackSummary {
  hasFeedback: boolean
  feedback: string
  score: number | null
}

export function getEssayFeedbackSummary(input: { feedback?: string | null; score?: number | null }): EssayFeedbackSummary {
  const feedback = input.feedback?.trim() ?? ''
  return {
    hasFeedback: feedback.length > 0,
    feedback,
    score: input.score ?? null,
  }
}
