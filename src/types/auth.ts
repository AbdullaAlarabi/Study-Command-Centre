export type UserRole = 'student' | 'coach'

export interface Profile {
  id: string
  display_name: string | null
  role: UserRole
  created_at?: string
}
