const appTimeZone = 'Asia/Bahrain'

export function getTodayString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: appTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00Z`))
}

export function formatRelativeDays(days: number) {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days > 1) return `${days} days remaining`
  if (days === -1) return 'Yesterday'
  return `${Math.abs(days)} days ago`
}
