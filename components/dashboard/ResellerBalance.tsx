'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Wallet, BarChart3, Users, Zap, RefreshCw, AlertCircle, TrendingUp, PlusCircle, X } from 'lucide-react'
import type { EzaiStats } from '@/types'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function ResellerBalance() {
  const { data, error, isLoading, mutate } = useSWR<EzaiStats>(
    '/api/admin/reseller',
    fetcher,
    { refreshInterval: 60_000 }
  )

  const [showTopup, setShowTopup] = useState(false)
  const [topupAmount, setTopupAmount] = useState('')
  const [topupLoading, setTopupLoading] = useState(false)

  const stats: EzaiStats | null = data && !('error' in data) ? {
    reseller_balance: data.reseller_balance ?? 0,
    reseller_quota: data.reseller_quota ?? 0,
    bonus_multiplier: data.bonus_multiplier ?? 1,
    total_users: data.total_users ?? 0,
    total_transactions: data.total_transactions ?? 0,
    total_topups: data.total_topups ?? 0,
    total_plan_activations: data.total_plan_activations ?? 0,
  } : null

  async function handleTopup(e: React.FormEvent) {
    e.preventDefault()
    const amount = Number(topupAmount)
    if (!amount || amount <= 0) {
      toast.error('Số tiền không hợp lệ')
      return
    }
    setTopupLoading(true)
    try {
      const res = await fetch('/api/admin/reseller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Lỗi nạp tiền')
      toast.success(`Nạp thành công! Số dư mới: $${fmt(result.new_balance ?? 0)}`)
      setShowTopup(false)
      setTopupAmount('')
      mutate()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi nạp tiền reseller')
    } finally {
      setTopupLoading(false)
    }
  }

  return (
    <Card className="bg-white/5 border-white/10 mb-8">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Wallet size={20} className="text-emerald-400" />
          Tài khoản Reseller (Cổng AI)
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowTopup(!showTopup)}
            className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 text-xs h-8 px-3"
          >
            <PlusCircle size={13} className="mr-1" />
            Nạp tiền reseller
          </Button>
          <button
            onClick={() => mutate()}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded"
            title="Làm mới"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Topup form */}
        {showTopup && (
          <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium text-sm">Nạp tiền vào tài khoản reseller</h3>
              <button
                onClick={() => { setShowTopup(false); setTopupAmount('') }}
                className="text-slate-400 hover:text-white"
              >
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleTopup} className="flex items-end gap-3">
              <div className="flex-1">
                <Label className="text-slate-300 text-xs mb-1 block">Số tiền (USD)</Label>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  value={topupAmount}
                  onChange={e => setTopupAmount(e.target.value)}
                  placeholder="Ví dụ: 50"
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 h-9"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={topupLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4"
              >
                {topupLoading ? 'Đang nạp...' : 'Xác nhận nạp'}
              </Button>
            </form>
            <p className="text-slate-500 text-xs mt-2">
              Tiền sẽ được nạp trực tiếp vào tài khoản reseller tại cổng AI gateway.
            </p>
          </div>
        )}

        {error || (data && 'error' in data) ? (
          <div className="flex items-center gap-2 text-red-400 text-sm py-2">
            <AlertCircle size={16} />
            Không thể tải dữ liệu reseller. Kiểm tra EZAI_RESELLER_KEY.
          </div>
        ) : isLoading || !stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white/5 rounded-lg p-4 animate-pulse h-20" />
            ))}
          </div>
        ) : (
          <>
            {/* Balance bar */}
            <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-300 text-sm">Số dư hiện tại</span>
                <span className="text-emerald-400 font-bold text-xl">${fmt(stats.reseller_balance)}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-xs">Hạn mức tổng (quota)</span>
                <span className="text-slate-300 text-sm">${fmt(stats.reseller_quota)}</span>
              </div>
              {stats.reseller_quota > 0 && (
                <>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (stats.reseller_balance / stats.reseller_quota) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {((stats.reseller_balance / stats.reseller_quota) * 100).toFixed(1)}% còn lại
                  </p>
                </>
              )}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 size={14} className="text-blue-400" />
                  <span className="text-slate-400 text-xs">Tổng nạp vào cổng</span>
                </div>
                <p className="text-white font-semibold text-lg">{stats.total_topups.toLocaleString()}</p>
                <p className="text-slate-500 text-xs">lần nạp</p>
              </div>

              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={14} className="text-purple-400" />
                  <span className="text-slate-400 text-xs">Kích hoạt gói</span>
                </div>
                <p className="text-white font-semibold text-lg">{stats.total_plan_activations.toLocaleString()}</p>
                <p className="text-slate-500 text-xs">lần kích hoạt</p>
              </div>

              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users size={14} className="text-cyan-400" />
                  <span className="text-slate-400 text-xs">Users tại cổng</span>
                </div>
                <p className="text-white font-semibold text-lg">{stats.total_users.toLocaleString()}</p>
                <p className="text-slate-500 text-xs">end-users</p>
              </div>

              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={14} className="text-orange-400" />
                  <span className="text-slate-400 text-xs">Nhân thưởng</span>
                </div>
                <p className="text-white font-semibold text-lg">x{stats.bonus_multiplier}</p>
                <p className="text-slate-500 text-xs">bonus multiplier</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
