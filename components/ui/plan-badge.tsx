type Plan = 'starter' | 'pro' | 'max' | 'ultra' | 'one_time' | 'none' | string

const PLAN_STYLES: Record<string, { label: string; className: string }> = {
  starter:  { label: 'Starter',  className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  pro:      { label: 'Pro',      className: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  max:      { label: 'Max',      className: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  ultra:    { label: 'Ultra',    className: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
  one_time: { label: 'One-time', className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  none:     { label: 'No Plan',  className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
}

export function PlanBadge({ plan, border = true }: { plan: Plan; border?: boolean }) {
  const cfg = PLAN_STYLES[plan] ?? PLAN_STYLES['none']
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${border ? 'border ' : ''}${cfg.className}`}>
      {cfg.label}
    </span>
  )
}
