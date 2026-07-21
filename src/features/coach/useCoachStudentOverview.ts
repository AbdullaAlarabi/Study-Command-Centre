import { useEffect, useState } from 'react'
import { getProfiles } from '../../lib/data'
import type { ProfileRow } from '../../types/database'
import { useStudentOverview } from '../student/useStudentOverview'

export function useCoachStudentOverview() {
  const [student, setStudent] = useState<ProfileRow | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState('')
  const overview = useStudentOverview(student?.id)

  useEffect(() => {
    let active = true
    async function loadStudent() {
      setProfileLoading(true)
      setProfileError('')
      try {
        const profiles = await getProfiles()
        if (active) setStudent(profiles.find((profile) => profile.role === 'student') ?? null)
      } catch (error) {
        if (active) {
          setProfileError(error instanceof Error ? error.message : 'Could not load the student profile.')
        }
      } finally {
        if (active) setProfileLoading(false)
      }
    }
    void loadStudent()
    return () => { active = false }
  }, [])

  return {
    student,
    overview,
    loading: profileLoading || (Boolean(student) && overview.loading),
    error: profileError || overview.error,
  }
}
