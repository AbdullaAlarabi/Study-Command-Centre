import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  completeManualStudyTask,
  getActivity,
  getAllLearningUnits,
  getAssessmentBlocks,
  getAttempts,
  getCourses,
  getStudyTasks,
} from '../../lib/data'
import { getCompletedUnitIds } from '../../lib/progress'
import type {
  ActivityLog,
  AssessmentBlock,
  Attempt,
  Course,
  LearningUnit,
  StudyTask,
} from '../../types/database'

interface StudentOverviewData {
  courses: Course[]
  assessments: AssessmentBlock[]
  units: LearningUnit[]
  tasks: StudyTask[]
  attempts: Attempt[]
  activity: ActivityLog[]
}

const initialData: StudentOverviewData = {
  courses: [],
  assessments: [],
  units: [],
  tasks: [],
  attempts: [],
  activity: [],
}

export function useStudentOverview(userId?: string) {
  const [data, setData] = useState<StudentOverviewData>(initialData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError('')

    try {
      const [courses, assessments, units, tasks, attempts, activity] = await Promise.all([
        getCourses(),
        getAssessmentBlocks(),
        getAllLearningUnits(),
        getStudyTasks(),
        getAttempts(userId),
        getActivity(userId, 500),
      ])
      setData({ courses, assessments, units, tasks, attempts, activity })
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Could not load the student overview.',
      )
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  const manualTaskIds = useMemo(
    () =>
      new Set(
        data.activity
          .filter(
            (entry) =>
              entry.action_type === 'manual_task_completed' &&
              entry.entity_type === 'study_task' &&
              entry.entity_id,
          )
          .map((entry) => entry.entity_id as string),
      ),
    [data.activity],
  )

  const manuallyCompletedUnitIds = useMemo(() => {
    const revisionUnitIds = new Set(
      data.units.filter((unit) => unit.unit_type === 'revision').map((unit) => unit.id),
    )
    return new Set(
      data.activity.flatMap((entry) => {
        if (entry.action_type !== 'manual_task_completed') return []
        const unitId = entry.metadata_json.learning_unit_id
        return typeof unitId === 'string' && revisionUnitIds.has(unitId) ? [unitId] : []
      }),
    )
  }, [data.activity, data.units])

  const manuallyUnlockedUnitIds = useMemo(
    () => new Set(
      data.activity.flatMap((entry) =>
        entry.action_type === 'coach_unit_unlocked' &&
        entry.entity_type === 'learning_unit' &&
        entry.entity_id
          ? [entry.entity_id]
          : [],
      ),
    ),
    [data.activity],
  )

  const completedUnitIds = useMemo(
    () => getCompletedUnitIds(data.units, data.attempts, manuallyCompletedUnitIds),
    [data.attempts, data.units, manuallyCompletedUnitIds],
  )

  const completedTaskIds = useMemo(() => {
    const completed = new Set(manualTaskIds)
    data.tasks.forEach((task) => {
      if (
        task.completion_mode === 'unit' &&
        task.learning_unit_id &&
        completedUnitIds.has(task.learning_unit_id)
      ) {
        completed.add(task.id)
      }
    })
    return completed
  }, [completedUnitIds, data.tasks, manualTaskIds])

  const completeTask = useCallback(
    async (task: StudyTask) => {
      if (!userId || task.completion_mode !== 'manual') return
      setCompletingTaskId(task.id)
      setError('')
      try {
        await completeManualStudyTask(userId, task)
        await load()
      } catch (caughtError) {
        setError(
          caughtError instanceof Error ? caughtError.message : 'Could not complete the task.',
        )
      } finally {
        setCompletingTaskId(null)
      }
    },
    [load, userId],
  )

  return {
    ...data,
    loading,
    error,
    reload: load,
    completeTask,
    completingTaskId,
    completedTaskIds,
    completedUnitIds,
    manuallyCompletedUnitIds,
    manuallyUnlockedUnitIds,
  }
}
