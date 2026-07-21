# Content Import Checklist for Codex

Use this checklist after the Phase 7 continuation prompt.

## Before import
- [ ] Confirm that all real academic tables are empty or contain only clearly labelled demo rows.
- [ ] Back up the current Supabase database.
- [ ] Preserve the existing UI and working functionality from Phases 1-6.

## Import order
1. `01_course_overview`
2. `02_chapter_packs`
3. `03_question_banks`
4. `04_revision_packs`
5. `05_mock_exams`
6. `06_mock_answer_keys`

## Required behavior
- [ ] One chapter page uses the matching chapter pack.
- [ ] Clicking complete starts a quiz instead of directly completing the chapter.
- [ ] Each chapter quiz selects 5 MCQs and 1 essay from that chapter bank.
- [ ] Objective score is calculated after submission.
- [ ] Essay is stored for coach review or displayed with a model/rubric only to the coach.
- [ ] Full revision unlocks after all three chapters in the assessment block are completed.
- [ ] Mock exams unlock in order: Mock 1, then 2, then 3.
- [ ] Student pages never expose answer-key fields before submission.
- [ ] Coach pages can view answers, model answers, marking points, attempts, and weak topics.

## Content integrity
- [ ] Do not shorten, rewrite, expand, or “improve” the supplied academic content.
- [ ] Do not add internet material or general textbook content.
- [ ] Preserve stable IDs from YAML frontmatter and question headings.
- [ ] Preserve source mappings for future auditing.
- [ ] Treat the documented MKT112 exam format as an assumption, not an official university claim.

## Final check
- [ ] 12 chapters visible
- [ ] 12 chapter banks imported
- [ ] 4 revision packs visible
- [ ] 12 mock papers imported
- [ ] 12 answer keys connected to the correct mocks
- [ ] Progress analytics update after quizzes, revision, and mocks
