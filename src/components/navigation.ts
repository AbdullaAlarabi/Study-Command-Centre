import {
  Activity,
  BookOpenCheck,
  ClipboardCheck,
  FileQuestion,
  Gauge,
  Map,
  NotebookTabs,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole } from '../types/auth'

export interface NavigationItem {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
}

export const roleNavigation: Record<UserRole, NavigationItem[]> = {
  student: [
    { label: 'Dashboard', to: '/student', icon: Gauge, end: true },
    { label: 'Roadmap', to: '/student/roadmap', icon: Map },
    { label: 'Revision', to: '/student/revision', icon: NotebookTabs },
    { label: 'Results', to: '/student/results', icon: TrendingUp },
  ],
  coach: [
    { label: 'Dashboard', to: '/coach', icon: Gauge, end: true },
    { label: 'Attempts', to: '/coach/attempts', icon: FileQuestion },
    { label: 'Essays', to: '/coach/essays', icon: ClipboardCheck },
    { label: 'Activity', to: '/coach/activity', icon: Activity },
  ],
}

export const roleMeta = {
  student: {
    label: 'Student workspace',
    icon: BookOpenCheck,
  },
  coach: {
    label: 'Coach workspace',
    icon: ClipboardCheck,
  },
} satisfies Record<UserRole, { label: string; icon: LucideIcon }>
