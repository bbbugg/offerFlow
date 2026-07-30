'use client'
import { useMemo, useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { useApp, isAppliedJob, isRepliedJob, hasOaExperience, hasInterviewExperience, getInterviewRoundCount, isOfferJob } from '../store/AppContext'
import ModalHeader from '../components/ModalHeader'
import GlowCard from '../components/GlowCard'
import JobDetailModal from '../components/JobDetailModal'
import JobModal from '../components/JobModal'
import ConfirmDialog from '../components/ConfirmDialog'
import { parseLocalDate } from '../lib/dateUtils'
import { JOB_STATUS_BADGE, NEUTRAL_BADGE } from '../lib/badgeStyles'

const TIME_RANGES = ['全部', '最近 7 天', '最近 30 天', '最近 90 天']

function makeTimeFilter(range) {
  if (range === '全部') return () => true
  const now = new Date()
  const days = { '最近 7 天': 7, '最近 30 天': 30, '最近 90 天': 90 }[range]
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  cutoff.setDate(cutoff.getDate() - days)
  return (j) => {
    const date = j.appliedDate || j.createdAt
    const parsed = parseLocalDate(date)
    return parsed ? parsed >= cutoff : true
  }
}

function getJobCity(job) {
  return job.city || job.location || job.workCity || '未知城市'
}

function getCityDistribution(jobs) {
  const appliedJobs = jobs.filter(isAppliedJob)
  const cityMap = {}
  appliedJobs.forEach((job) => {
    const city = getJobCity(job).trim() || '未知城市'
    cityMap[city] = (cityMap[city] || 0) + 1
  })

  return Object.entries(cityMap)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
}

const CustomChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null

  const getTooltipName = (item) => {
    if (item.dataKey === 'value') return '数量'
    if (item.name === 'value') return '数量'
    if (item.dataKey === 'count') return '数量'
    if (item.name === 'count') return '数量'
    return item.name || item.dataKey || '数量'
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--c-bg-card)',
        border: '1px solid var(--c-border)',
        borderRadius: '12px',
        padding: '10px 12px',
        boxShadow: '0 4px 16px var(--c-shadow)',
        color: 'var(--c-text)',
        zIndex: 9999,
      }}
    >
      {label && (
        <div
          style={{
            color: 'var(--c-text)',
            fontWeight: 700,
            marginBottom: '6px',
          }}
        >
          {label}
        </div>
      )}

      {payload.map((item, index) => (
        <div
          key={`${item.dataKey || item.name}-${index}`}
          style={{
            color: 'var(--c-text-secondary)',
            fontSize: '13px',
            lineHeight: '20px',
          }}
        >
          <span style={{ color: 'var(--color-offer-accent, #9575DE)', fontWeight: 600 }}>
            {getTooltipName(item)}
          </span>
          <span style={{ color: 'var(--c-text)' }}>
            ：{item.value}
          </span>
        </div>
      ))}
    </div>
  )
}

const CustomXAxisTick = ({ x, y, payload, isMobile }) => {
  if (!payload) return null
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dx={isMobile ? -4 : 0}
        dy={isMobile ? 15 : 10}
        fill="#AAAAAA"
        fontSize={isMobile ? 10 : 11}
        textAnchor="middle"
        transform={isMobile ? 'rotate(-30)' : undefined}
      >
        {payload.value}
      </text>
    </g>
  )
}



export default function Insights({ jobs: propJobs, isReadOnly = false }) {
  const appContext = useApp()
  const jobs = isReadOnly ? (propJobs || []) : appContext.jobs
  const [timeRange, setTimeRange] = useState('全部')
  const [detailOpen, setDetailOpen] = useState(false)
  const [replyDetailOpen, setReplyDetailOpen] = useState(false)
  const [detailJobId, setDetailJobId] = useState(null)
  const [editingJob, setEditingJob] = useState(null)
  const [jobModalOpen, setJobModalOpen] = useState(false)
  const [deletingJob, setDeletingJob] = useState(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!detailOpen && !replyDetailOpen && !detailJobId) return
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (detailJobId) {
          setDetailJobId(null)
        } else {
          setDetailOpen(false)
          setReplyDetailOpen(false)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [detailOpen, replyDetailOpen, detailJobId])

  const handleEditFromDetail = (job) => {
    setDetailJobId(null)
    setEditingJob(job)
    setJobModalOpen(true)
  }

  const handleDeleteFromDetail = (job) => {
    setDetailJobId(null)
    setDeletingJob(job)
  }

  const confirmDeleteJob = async () => {
    if (!deletingJob) return
    await appContext.deleteJob(deletingJob.id)
    appContext.addToast('已删除岗位记录', 'success')
    setDeletingJob(null)
  }

  const timeFilter = useMemo(() => makeTimeFilter(timeRange), [timeRange])

  const data = useMemo(() => {
    const filteredJobs = jobs.filter(timeFilter)
    const total = filteredJobs.length
    const applied = filteredJobs.filter(isAppliedJob)
    const appliedCount = applied.length
    const active = filteredJobs.filter((j) => ['已投递', 'OA / 笔试', '一面中', '二面中', '三面中', '终面中'].includes(j.status))
    const replied = filteredJobs.filter(isRepliedJob)
    const oaJobs = filteredJobs.filter(hasOaExperience)
    const interviewed = filteredJobs.filter(hasInterviewExperience)
    const totalRoundCount = filteredJobs.reduce((sum, j) => sum + getInterviewRoundCount(j), 0)
    const offers = filteredJobs.filter(isOfferJob)
    const ended = filteredJobs.filter((j) => j.status === '已结束')

    // Conversion rates
    const replyRate = appliedCount > 0 ? Math.round((replied.length / appliedCount) * 100) : 0
    const interviewRate = appliedCount > 0 ? Math.round((interviewed.length / appliedCount) * 100) : 0
    const offerRate = appliedCount > 0 ? Math.round((offers.length / appliedCount) * 100) : 0

    // Reply detail stats
    const isInterviewingOrInterviewed = (j) => hasInterviewExperience(j) || ['一面中', '二面中', '三面中', '终面中'].includes(j.status)
    const repliedToOfferCount = replied.filter(isOfferJob).length
    const repliedToInterviewCount = replied.filter(isInterviewingOrInterviewed).length
    const repliedToOaCount = replied.filter(hasOaExperience).length
    const repliedEndedCount = replied.filter((j) => j.status === '已结束').length
    const repliedActiveCount = replied.length - repliedToOfferCount - repliedToInterviewCount - repliedToOaCount - repliedEndedCount

    // Funnel
    const funnel = [
      { name: '总投递', value: appliedCount, fill: '#7E57C2' },
      { name: '收到回复', value: replied.length, fill: '#9575DE' },
      { name: 'OA / 笔试', value: oaJobs.length, fill: '#4FC3F7' },
      { name: '面试', value: interviewed.length, fill: '#2196F3' },
      { name: 'Offer', value: offers.length, fill: '#4CAF50' },
    ]

    // Channel analysis
    const channelMap = {}
    filteredJobs.forEach((j) => {
      if (!isAppliedJob(j)) return
      const ch = j.channel || '其他'
      if (!channelMap[ch]) channelMap[ch] = { name: ch, sent: 0, replied: 0, interviewedPeople: 0, interviewRounds: 0, offered: 0 }
      channelMap[ch].sent++
      if (isRepliedJob(j)) channelMap[ch].replied++
      if (hasInterviewExperience(j)) {
        channelMap[ch].interviewedPeople++
        channelMap[ch].interviewRounds += getInterviewRoundCount(j)
      }
      if (isOfferJob(j)) channelMap[ch].offered++
    })
    const channels = Object.values(channelMap).map((c) => ({
      ...c,
      replyRate: c.sent > 0 ? Math.round((c.replied / c.sent) * 100) : 0,
      interviewRate: c.sent > 0 ? Math.round((c.interviewedPeople / c.sent) * 100) : 0,
    }))

    const repliedChannels = channels.filter((c) => c.replied > 0).sort((a, b) => b.replied - a.replied)

    // Per-round stats for detail modal
    const roundCounts = { '一面': 0, '二面': 0, '三面': 0, '终面': 0 }
    const roundPassedCounts = { '一面': 0, '二面': 0, '三面': 0, '终面': 0 }
    filteredJobs.forEach((j) => {
      const rounds = Array.isArray(j.interviewRounds)
        ? j.interviewRounds.filter((r) => r.round in roundCounts)
        : []
      if (rounds.length === 0) return

      rounds.forEach((r) => {
        roundCounts[r.round]++
        if (r.status === '已通过') {
          roundPassedCounts[r.round]++
        }
      })
    })
    const roundPassRates = [
      { round: '一面', count: roundCounts['一面'], passedCount: roundPassedCounts['一面'],
        passRate: roundCounts['一面'] > 0 ? roundPassedCounts['一面'] / roundCounts['一面'] : 0 },
      { round: '二面', count: roundCounts['二面'], passedCount: roundPassedCounts['二面'],
        passRate: roundCounts['二面'] > 0 ? roundPassedCounts['二面'] / roundCounts['二面'] : 0 },
      { round: '三面', count: roundCounts['三面'], passedCount: roundPassedCounts['三面'],
        passRate: roundCounts['三面'] > 0 ? roundPassedCounts['三面'] / roundCounts['三面'] : 0 },
      { round: '终面', count: roundCounts['终面'], passedCount: roundPassedCounts['终面'],
        passRate: roundCounts['终面'] > 0 ? roundPassedCounts['终面'] / roundCounts['终面'] : 0 },
    ]
    const offerConversionRate = interviewed.length > 0 ? offers.length / interviewed.length : 0

    // City distribution
    const cityDistribution = getCityDistribution(filteredJobs)

    return {
      total, appliedCount, activeCount: active.length, repliedCount: replied.length,
      interviewedCount: totalRoundCount, interviewedPeopleCount: interviewed.length,
      offerCount: offers.length, endedCount: ended.length,
      replyRate, interviewRate, offerRate,
      funnel, channels,
      roundCounts, roundPassRates, offerConversionRate,
      interviewedJobs: interviewed,
      cityDistribution,
      repliedJobs: replied,
      repliedToOfferCount,
      repliedToInterviewCount,
      repliedToOaCount,
      repliedEndedCount,
      repliedActiveCount,
      repliedChannels,
    }
  }, [jobs, timeFilter])



  return (
    <div className="min-w-0 px-0 py-2 md:px-6 md:py-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white md:text-3xl">数据洞察</h1>
          <p className="text-sm text-slate-600 dark:text-white/45 mt-1">用数据驱动你的求职策略</p>
        </div>
        {/* Time Range Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {TIME_RANGES.map((r) => (
            <button key={r} onClick={() => setTimeRange(r)}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer focus:outline-none focus:ring-0 select-none ${timeRange === r ? 'border-purple-400/60 bg-purple-600/25 text-white font-semibold shadow-sm shadow-purple-950/20' : 'border-white/10 bg-white/[0.03] text-gray-300 dark:text-white/65 hover:bg-white/[0.07] hover:text-white'}`}>{r}</button>
          ))}
        </div>
      </div>

      {/* ===== Core Metrics ===== */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:mb-8 md:grid-cols-3 md:gap-5">
        <MetricCard label="总投递数" value={data.appliedCount} sub={`共 ${data.total} 个记录`} />
        <MetricCard label="活跃流程" value={data.activeCount} sub="进行中" />
        <MetricCard label="收到回复" value={data.repliedCount} sub={`${data.replyRate}% 回复率`} onClick={() => setReplyDetailOpen(true)} />
        <MetricCard label="总面试次数" value={data.interviewedCount} sub={`${data.interviewedPeopleCount} 岗位参与 · ${data.interviewRate}% 面试率`} onClick={() => setDetailOpen(true)} />
        <MetricCard label="总 Offer" value={data.offerCount} sub={`${data.offerRate}% Offer 率`} accent />
        <MetricCard label="已结束" value={data.endedCount} sub="无结果" danger />
      </div>

      {/* ===== Conversion Rates ===== */}
      <div className="card-modern mb-6 p-4 md:mb-8 md:p-6">
        <h2 className="text-lg font-semibold text-white mb-5">基础转化率</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <RateBar label="回复率" value={data.replyRate} color="from-cyan-500 to-blue-500" />
          <RateBar label="面试率" value={data.interviewRate} color="from-offer-primary to-offer-accent" />
          <RateBar label="Offer 率" value={data.offerRate} color="from-emerald-500 to-teal-500" />
        </div>
      </div>

      {/* ===== Funnel + Channel ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6 mb-8">
        {/* Funnel */}
        <div className="card-modern min-h-[340px] p-4 md:min-h-[380px] md:p-6">
          <h2 className="text-lg font-semibold text-white mb-5">求职漏斗</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data.funnel}
              margin={{ top: 5, right: 10, left: -20, bottom: isMobile ? 25 : 5 }}
              barSize={36}
              maxBarSize={50}
            >
              <CartesianGrid stroke="rgba(148,163,184,0.2)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={(props) => <CustomXAxisTick {...props} isMobile={isMobile} />}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis tick={{ fill: '#AAAAAA', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                content={<CustomChartTooltip />}
                cursor={{ fill: 'rgba(168, 85, 247, 0.08)' }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {data.funnel.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Channel */}
        <div className="card-modern min-h-[340px] p-4 md:min-h-[380px] md:p-6">
          <h2 className="text-lg font-semibold text-white mb-5">渠道效果</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-offer-muted border-b border-white/[0.06]">
                  <th className="text-left py-3 pr-2 text-xs font-semibold uppercase tracking-wider text-offer-muted/80">渠道</th>
                  <th className="text-right px-2 py-3 text-xs font-semibold uppercase tracking-wider text-offer-muted/80">投递</th>
                  <th className="text-right px-2 py-3 text-xs font-semibold uppercase tracking-wider text-offer-muted/80">回复</th>
                  <th className="text-right px-2 py-3 text-xs font-semibold uppercase tracking-wider text-offer-muted/80">面试岗位</th>
                  <th className="text-right px-2 py-3 text-xs font-semibold uppercase tracking-wider text-offer-muted/80">面试轮次</th>
                  <th className="text-right px-2 py-3 text-xs font-semibold uppercase tracking-wider text-offer-muted/80">Offer</th>
                  <th className="text-right pl-2 py-3 text-xs font-semibold uppercase tracking-wider text-offer-muted/80">回复率</th>
                </tr>
              </thead>
              <tbody>
                {data.channels.map((ch) => (
                  <tr key={ch.name} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 pr-2 text-white font-medium">{ch.name}</td>
                    <td className="text-right px-2 py-3 text-offer-muted">{ch.sent}</td>
                    <td className="text-right px-2 py-3 text-offer-muted">{ch.replied}</td>
                    <td className="text-right px-2 py-3 text-offer-muted">{ch.interviewedPeople}</td>
                    <td className="text-right px-2 py-3 text-offer-muted">{ch.interviewRounds}</td>
                    <td className="text-right px-2 py-3 text-offer-accent font-medium">{ch.offered}</td>
                    <td className="text-right pl-2 py-3 text-offer-muted">{ch.replyRate}%</td>
                  </tr>
                ))}
                {data.channels.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-6 text-offer-muted">暂无数据</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ===== City Distribution ===== */}
      <div className="card-modern mb-6 min-h-[340px] p-4 md:mb-8 md:min-h-[380px] md:p-6">
        <h2 className="text-lg font-semibold text-white mb-5">投递城市分布</h2>
        {data.cityDistribution.length > 0 ? (
          <div className="flex items-start">
            {/* 左侧城市名称文本栏，由 CSS whitespace-nowrap 自动根据文字实际长度撑开 */}
            <div className="flex flex-col shrink-0 pt-[8px] pb-[32px] select-none">
              {data.cityDistribution.map((item) => (
                <div key={item.city} className="flex items-center h-[44px] whitespace-nowrap pr-3 text-[#AAAAAA] text-[11px] max-md:text-[10px] font-normal" title={item.city}>
                  {item.city}
                </div>
              ))}
            </div>

            {/* 右侧 BarChart 柱状图 */}
            <div className="flex-1 min-w-0">
              <ResponsiveContainer width="100%" height={Math.max(200, data.cityDistribution.length * 44 + 32)}>
                <BarChart
                  data={data.cityDistribution}
                  layout="vertical"
                  margin={{ top: 5, right: isMobile ? 15 : 40, left: 0, bottom: 5 }}
                  barSize={24}
                >
                  <CartesianGrid stroke="rgba(148,163,184,0.2)" horizontal={false} />
                  <XAxis type="number" domain={[0, 'dataMax']} allowDecimals={false} tick={{ fill: '#AAAAAA', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="city" type="category" hide />
                  <Tooltip
                    content={<CustomChartTooltip />}
                    cursor={{ fill: 'rgba(168, 85, 247, 0.08)' }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {data.cityDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.city === '其他' ? '#666666' : `hsl(${265 - i * 18}, 55%, ${58 - i * 2.5}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-offer-muted text-sm">
            暂无投递城市数据
          </div>
        )}
      </div>

      {/* ===== Interview Detail Modal ===== */}
      <InterviewDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onSelectJob={(id) => setDetailJobId(id)}
        stats={{
          totalRounds: data.interviewedCount,
          interviewedPeople: data.interviewedPeopleCount,
          roundCounts: data.roundCounts,
          roundPassRates: data.roundPassRates,
          offerConversionRate: data.offerConversionRate,
        }}
        jobs={data.interviewedJobs}
        offerCount={data.offerCount}
      />

      {/* ===== Reply Detail Modal ===== */}
      <ReplyDetailModal
        open={replyDetailOpen}
        onClose={() => setReplyDetailOpen(false)}
        onSelectJob={(id) => setDetailJobId(id)}
        stats={{
          totalReplied: data.repliedCount,
          appliedCount: data.appliedCount,
          replyRate: data.replyRate,
          toOaCount: data.repliedToOaCount,
          toInterviewCount: data.repliedToInterviewCount,
          toOfferCount: data.repliedToOfferCount,
          endedCount: data.repliedEndedCount,
          activeCount: data.repliedActiveCount,
          channels: data.repliedChannels,
        }}
        jobs={data.repliedJobs}
      />

      {/* ===== Job Detail Modal ===== */}
      <JobDetailModal
        open={!!detailJobId}
        jobId={detailJobId}
        onClose={() => setDetailJobId(null)}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteFromDetail}
        jobs={jobs}
        isReadOnly={isReadOnly}
      />

      {!isReadOnly && (
        <>
          <JobModal open={jobModalOpen} job={editingJob} onClose={() => { setJobModalOpen(false); setEditingJob(null) }} />
          <ConfirmDialog
            open={!!deletingJob}
            title="确认删除"
            message={`确定要删除「${deletingJob?.companyName || ''} - ${deletingJob?.jobTitle || ''}」这条岗位记录吗？此操作不可恢复。`}
            onConfirm={confirmDeleteJob}
            onCancel={() => setDeletingJob(null)}
          />
        </>
      )}
    </div>
  )
}

/* ===== Sub-components ===== */

function MetricCard({ label, value, sub, accent, danger, onClick }) {
  return (
    <div onClick={onClick} className={`card-modern relative flex min-h-[128px] flex-col justify-between overflow-visible p-4 md:min-h-[148px] md:p-6 focus:outline-none focus:ring-0 select-none ${onClick ? 'cursor-pointer card-hover' : ''}`}>
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-white/[0.02] to-transparent rounded-bl-full" />
      <div className="space-y-2">
        <p className="text-offer-muted text-sm font-medium leading-6 tracking-wide">{label}</p>
        <p className={`text-3xl font-semibold leading-tight tracking-tight ${accent ? 'text-emerald-400' : danger ? 'text-red-400' : 'text-white'}`}>{value}</p>
      </div>
      <p className="text-sm leading-6 mt-2 text-gray-400 dark:text-white/45">{sub}</p>
    </div>
  )
}

function RateBar({ label, value, color }) {
  return (
    <div className="bg-theme-hover rounded-xl p-5 border border-theme-border">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-theme-secondary">{label}</span>
        <span className="text-lg font-bold text-theme-text">{value}%</span>
      </div>
      <div className="h-2.5 bg-theme-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700 ease-out`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  )
}

function formatPct(v) {
  if (typeof v !== 'number' || !isFinite(v)) return '0.0%'
  return (v * 100).toFixed(1) + '%'
}

const ROUND_ORDER_LABEL = ['一面', '二面', '三面', '终面']

function getHighestRound(job) {
  const rounds = job.interviewRounds
  if (Array.isArray(rounds) && rounds.length > 0) {
    for (let i = ROUND_ORDER_LABEL.length - 1; i >= 0; i--) {
      if (rounds.some((r) => r.round === ROUND_ORDER_LABEL[i])) return ROUND_ORDER_LABEL[i]
    }
  }
  const s = job.status
  if (s === '终面中') return '终面'
  if (s === '三面中') return '三面'
  if (s === '二面中') return '二面'
  if (s === '一面中' || s === 'Offer') return '一面'
  return '-'
}

function getRoundList(job) {
  const rounds = job.interviewRounds
  if (Array.isArray(rounds) && rounds.length > 0) {
    return rounds.map((r) => r.round).join('、')
  }
  return getHighestRound(job)
}

function getHighestRoundBadge(job) {
  const round = getHighestRound(job)
  if (!round || round === '-') {
    return <span className="text-slate-400 dark:text-white/45">-</span>
  }
  const badgeClassKey = `${round}中`
  const badgeClass = JOB_STATUS_BADGE[badgeClassKey] || NEUTRAL_BADGE
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${badgeClass}`}>
      {round}
    </span>
  )
}

function InterviewDetailModal({ open, onClose, onSelectJob, stats, jobs, offerCount }) {
  if (!open) return null

  const roundInfo = [
    { round: '一面', count: stats.roundCounts['一面'], passedCount: stats.roundPassRates[0].passedCount, passRate: stats.roundPassRates[0].passRate },
    { round: '二面', count: stats.roundCounts['二面'], passedCount: stats.roundPassRates[1].passedCount, passRate: stats.roundPassRates[1].passRate },
    { round: '三面', count: stats.roundCounts['三面'], passedCount: stats.roundPassRates[2].passedCount, passRate: stats.roundPassRates[2].passRate },
    { round: '终面', count: stats.roundCounts['终面'], passedCount: stats.roundPassRates[3].passedCount, passRate: stats.roundPassRates[3].passRate },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm modal-overlay" onClick={onClose}>
      <div className="modal-panel border w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col shadow-2xl shadow-black/40" onClick={(e) => e.stopPropagation()}>
        <GlowCard style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, '--glow-color': 'rgba(255,255,255,0.03)' }} className="rounded-[22px] w-full max-w-full min-w-0 flex flex-col flex-1">
          <div className="bg-white/90 backdrop-blur-xl dark:bg-transparent dark:backdrop-filter-none rounded-[22px] w-full max-w-full min-w-0 flex flex-col flex-1 min-h-0">
            {/* Header */}
            <ModalHeader title="面试统计详情" onClose={onClose} />

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Summary row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bento-block">
                  <p className="text-xs text-slate-500 dark:text-white/45 mb-1">总面试次数</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalRounds}</p>
                </div>
                <div className="bento-block">
                  <p className="text-xs text-slate-500 dark:text-white/45 mb-1">参与面试岗位数</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.interviewedPeople}</p>
                </div>
              </div>

              {/* Per-round cards */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-white/45 uppercase tracking-wider mb-3">各轮次统计</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {roundInfo.map((r) => (
                    <div key={r.round} className="card-glow bg-slate-50 border border-slate-200 rounded-xl p-4 dark:bg-white/[0.02] dark:border-white/[0.06]">
                      <p className="text-sm text-slate-900 dark:text-white font-medium mb-2">{r.round}</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{r.count} <span className="text-xs text-slate-500 dark:text-white/45 font-normal">次</span></p>
                      <p className="text-xs text-slate-500 dark:text-white/45 mt-1">已通过: {r.passedCount}</p>
                      <div className="mt-2 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-offer-primary to-offer-accent transition-all" style={{ width: `${Math.min(r.passRate * 100, 100)}%` }} />
                      </div>
                      <p className="text-xs text-offer-accent mt-1">通过率 {formatPct(r.passRate)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Offer conversion */}
              <div className="card-glow bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 dark:bg-white/[0.02] dark:border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-white/65">面试转 Offer 率</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatPct(stats.offerConversionRate)}</span>
                </div>
              </div>

              {/* Detail table */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-white/45 uppercase tracking-wider mb-3">面试岗位明细（{jobs.length}）</h3>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto rounded-xl border border-slate-200 dark:border-white/[0.06]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-gray-950 z-10">
                      <tr className="text-slate-500 dark:text-white/45 border-b border-slate-200 dark:border-white/[0.06]">
                        <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider">公司</th>
                        <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider">岗位</th>
                        <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">当前状态</th>
                        <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider">最高轮次</th>
                        <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider">结束原因</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((j) => (
                        <tr
                          key={j.id}
                          onClick={() => onSelectJob?.(j.id)}
                          className="border-b border-slate-200 dark:border-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                          title="点击查看岗位详情"
                        >
                          <td className="py-2.5 px-3 text-slate-900 dark:text-white font-medium whitespace-nowrap">{j.companyName}</td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-white/65 whitespace-nowrap">{j.jobTitle}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`inline-flex items-center shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${JOB_STATUS_BADGE[j.status] || NEUTRAL_BADGE}`}>{j.status}</span>
                          </td>
                          <td className="py-2.5 px-3">{getHighestRoundBadge(j)}</td>
                          <td className="py-2.5 px-3 text-slate-500 dark:text-white/55 max-w-[140px] truncate" title={j.endReason || '-'}>{j.endReason || '-'}</td>
                        </tr>
                      ))}
                      {jobs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-slate-500 dark:text-white/45">
                            暂无面试岗位记录
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </GlowCard>
      </div>
    </div>
  )
}

function getReplyStageBadge(job) {
  let badgeClassKey = '已投递'
  let badgeText = '已投递'

  if (isOfferJob(job)) {
    badgeClassKey = 'Offer'
    badgeText = 'Offer'
  } else if (['一面中', '二面中', '三面中', '终面中'].includes(job.status)) {
    badgeClassKey = job.status
    badgeText = job.status.replace(/中$/, '')
  } else if (hasInterviewExperience(job)) {
    const highest = getHighestRound(job)
    const cleanRound = highest && highest !== '-' ? highest : '一面'
    badgeClassKey = `${cleanRound}中`
    badgeText = cleanRound
  } else if (hasOaExperience(job)) {
    badgeClassKey = 'OA / 笔试'
    badgeText = 'OA / 笔试'
  } else if (job.status === '已结束') {
    badgeClassKey = '已结束'
    badgeText = '已结束'
  } else {
    badgeClassKey = '已投递'
    badgeText = '已投递'
  }

  const badgeClass = JOB_STATUS_BADGE[badgeClassKey] || NEUTRAL_BADGE

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${badgeClass}`}>
      {badgeText}
    </span>
  )
}

function ReplyDetailModal({ open, onClose, onSelectJob, stats, jobs }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm modal-overlay" onClick={onClose}>
      <div className="modal-panel border w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col shadow-2xl shadow-black/40" onClick={(e) => e.stopPropagation()}>
        <GlowCard style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, '--glow-color': 'rgba(255,255,255,0.03)' }} className="rounded-[22px] w-full max-w-full min-w-0 flex flex-col flex-1">
          <div className="bg-white/90 backdrop-blur-xl dark:bg-transparent dark:backdrop-filter-none rounded-[22px] w-full max-w-full min-w-0 flex flex-col flex-1 min-h-0">
            {/* Header */}
            <ModalHeader title="收到回复统计详情" onClose={onClose} />

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Summary row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bento-block">
                  <p className="text-xs text-slate-500 dark:text-white/45 mb-1">收到回复岗位</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalReplied} <span className="text-xs text-slate-500 dark:text-white/45 font-normal">个</span></p>
                  <p className="text-xs text-slate-500 dark:text-white/45 mt-1">回复率: {stats.replyRate}%</p>
                </div>
                <div className="bento-block">
                  <p className="text-xs text-slate-500 dark:text-white/45 mb-1">收到笔试 / OA</p>
                  <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">{stats.toOaCount} <span className="text-xs text-slate-500 dark:text-white/45 font-normal">个</span></p>
                </div>
                <div className="bento-block">
                  <p className="text-xs text-slate-500 dark:text-white/45 mb-1">收到面试</p>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.toInterviewCount} <span className="text-xs text-slate-500 dark:text-white/45 font-normal">个</span></p>
                </div>
                <div className="bento-block">
                  <p className="text-xs text-slate-500 dark:text-white/45 mb-1">收到 Offer</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.toOfferCount} <span className="text-xs text-slate-500 dark:text-white/45 font-normal">个</span></p>
                </div>
              </div>

              {/* Reply outcomes progression breakdown */}
              <div className="card-glow bg-slate-50 border border-slate-200 rounded-xl p-4 dark:bg-white/[0.02] dark:border-white/[0.06]">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-white/45 uppercase tracking-wider mb-3">回复后推进阶段分布</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-700 dark:text-white/80 font-medium">收到笔试 / OA</span>
                      <span className="text-sky-600 dark:text-sky-400 font-semibold">{stats.toOaCount} 个 ({stats.totalReplied > 0 ? Math.round((stats.toOaCount / stats.totalReplied) * 100) : 0}%)</span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full transition-all" style={{ width: `${stats.totalReplied > 0 ? (stats.toOaCount / stats.totalReplied) * 100 : 0}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-700 dark:text-white/80 font-medium">收到面试</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{stats.toInterviewCount} 个 ({stats.totalReplied > 0 ? Math.round((stats.toInterviewCount / stats.totalReplied) * 100) : 0}%)</span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-400 rounded-full transition-all" style={{ width: `${stats.totalReplied > 0 ? (stats.toInterviewCount / stats.totalReplied) * 100 : 0}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-700 dark:text-white/80 font-medium">收到 Offer</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{stats.toOfferCount} 个 ({stats.totalReplied > 0 ? Math.round((stats.toOfferCount / stats.totalReplied) * 100) : 0}%)</span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all" style={{ width: `${stats.totalReplied > 0 ? (stats.toOfferCount / stats.totalReplied) * 100 : 0}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-700 dark:text-white/80 font-medium">已无后续 / 流程结束</span>
                      <span className="text-slate-500 dark:text-white/45 font-semibold">{stats.endedCount} 个 ({stats.totalReplied > 0 ? Math.round((stats.endedCount / stats.totalReplied) * 100) : 0}%)</span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full bg-slate-400 dark:bg-white/30 rounded-full transition-all" style={{ width: `${stats.totalReplied > 0 ? (stats.endedCount / stats.totalReplied) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Detail table */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-white/45 uppercase tracking-wider mb-3">收到回复岗位明细（{jobs.length}）</h3>

                <div className="overflow-x-auto max-h-[300px] overflow-y-auto rounded-xl border border-slate-200 dark:border-white/[0.06]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-gray-950 z-10">
                      <tr className="text-slate-500 dark:text-white/45 border-b border-slate-200 dark:border-white/[0.06]">
                        <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider">公司</th>
                        <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider">岗位</th>
                        <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">当前状态</th>
                        <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider">最高阶段</th>
                        <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider">结束原因</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((j) => (
                        <tr
                          key={j.id}
                          onClick={() => onSelectJob?.(j.id)}
                          className="border-b border-slate-200 dark:border-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                          title="点击查看岗位详情"
                        >
                          <td className="py-2.5 px-3 text-slate-900 dark:text-white font-medium whitespace-nowrap">{j.companyName}</td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-white/65 whitespace-nowrap">{j.jobTitle}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`inline-flex items-center shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${JOB_STATUS_BADGE[j.status] || NEUTRAL_BADGE}`}>{j.status}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            {getReplyStageBadge(j)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 dark:text-white/55 max-w-[140px] truncate" title={j.endReason || '-'}>{j.endReason || '-'}</td>
                        </tr>
                      ))}
                      {jobs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-slate-500 dark:text-white/45">
                            暂无收到回复的岗位记录
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </GlowCard>
      </div>
    </div>
  )
}
