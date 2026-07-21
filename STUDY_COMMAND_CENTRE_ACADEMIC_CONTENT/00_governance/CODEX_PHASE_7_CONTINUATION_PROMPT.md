# Codex Continuation Prompt — Use After Phase 6

You have completed Phase 6 of the Study Command Centre build. An approved folder named `STUDY_COMMAND_CENTRE_ACADEMIC_CONTENT` has now been placed in the repository root.

Your next responsibility is to integrate this supplied academic content into the existing application. Do not generate course content yourself.

## Mandatory instructions

1. Read `STUDY_COMMAND_CENTRE_ACADEMIC_CONTENT/README.md` and all files under `00_governance/` first.
2. Import the chapter packs, question banks, revision packs, mock papers, and answer keys into the existing content/database model.
3. Preserve every supplied stable ID exactly.
4. Do not paraphrase, shorten, enrich, or replace supplied academic content.
5. Do not use internet sources, general model knowledge, placeholder questions, or invented examples.
6. Store MCQ answers, explanations, essay model answers, and marking guides in fields that are not rendered to the student before submission.
7. The student-facing chapter completion flow must generate 5 random MCQs plus 1 random essay from the correct chapter bank.
8. Pass rule: at least 4/5 MCQs plus a submitted essay. Record the selected question IDs and the attempt score.
9. When all three chapters in an assessment block are provisionally completed, unlock its revision pack, then Mock 1, Mock 2, and Mock 3 sequentially.
10. Use the files in `05_mock_exams/` as student papers and the matching files in `06_mock_answer_keys/` for grading and post-submission review.
11. Add a content-import report showing counts by course, chapter, question type, revision pack, and mock.
12. Add a coach-facing content audit page or developer-only report that identifies any missing IDs, duplicate IDs, invalid MCQ answer letters, or mocks without matching answer keys.
13. Do not redesign functioning phases unless integration requires a small adjustment.
14. Do not add RLS or complex security. Use the project's existing simple Supabase approach.
15. At the end, report exactly what was imported, any schema changes, and any content that could not be mapped.

## Expected content totals

- 12 chapter packs.
- 12 chapter question banks.
- 144 chapter-bank MCQs.
- 48 chapter-bank essays.
- 4 full revision packs.
- 12 mock examinations.
- 12 matching mock answer keys.

Stop and report rather than silently inventing content if an import field or relationship is unclear.
