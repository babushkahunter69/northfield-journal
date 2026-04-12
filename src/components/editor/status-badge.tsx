type Props = {
  status: string
}

const statusMap: Record<string, string> = {
  draft: 'bg-neutral-100 text-neutral-700',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-amber-100 text-amber-700',
  needs_revision: 'bg-orange-100 text-orange-700',
  scheduled: 'bg-purple-100 text-purple-700',
  published: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export function StatusBadge({ status }: Props) {
  const className = statusMap[status] || 'bg-neutral-100 text-neutral-700'

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${className}`}
    >
      {status.replaceAll('_', ' ')}
    </span>
  )
}