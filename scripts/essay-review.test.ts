import assert from 'node:assert/strict'
import test from 'node:test'
import { getEssayFeedbackSummary } from '../src/lib/essay'

test('returns visible feedback when a coach has left review text', () => {
  const summary = getEssayFeedbackSummary({ feedback: 'Great structure and clear argument.', score: 82 })

  assert.deepStrictEqual(summary, {
    hasFeedback: true,
    feedback: 'Great structure and clear argument.',
    score: 82,
  })
})

test('treats blank feedback as unavailable', () => {
  const summary = getEssayFeedbackSummary({ feedback: '   ', score: 74 })

  assert.deepStrictEqual(summary, {
    hasFeedback: false,
    feedback: '',
    score: 74,
  })
})
