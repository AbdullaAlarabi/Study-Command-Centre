# Suggested Simple Content Mapping

The application may adapt these names to its existing schema.

## Chapter pack

- `id`
- `course_id`
- `chapter_number`
- `assessment_block`
- `title`
- `markdown_body`
- `source_file`
- `source_slides`
- `display_order`

## Question bank item

- `id`
- `course_id`
- `chapter_number`
- `assessment_block`
- `type` (`mcq` or `essay`)
- `topic`
- `question_text`
- `option_a` … `option_d` for MCQs
- `correct_answer` for MCQs
- `explanation`
- `model_answer` for essays
- `marking_points` for essays
- `source_slides`
- `active`

## Revision pack

- `id`
- `course_id`
- `assessment_block`
- `title`
- `markdown_body`
- `unlock_rule`

## Mock exam

- `id`
- `course_id`
- `assessment_block`
- `mock_number`
- `time_minutes`
- `student_paper_markdown`
- `answer_key_markdown`
- `unlock_order`

## Attempt records

Record the exact IDs shown to the student, answers, score, start time, submit time, and attempt number. This supports analytics without adding complex security.
