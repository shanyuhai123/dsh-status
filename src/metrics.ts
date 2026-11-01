import type { EventSnapshot, ExtensionDataValues } from './lexora'

export type TaskData = EventSnapshot<ExtensionDataValues['task.metrics']>
export type ContextData = EventSnapshot<ExtensionDataValues['context.usage']>

export type MetricId = 'counts' | 'speed' | 'total' | 'cache' | 'context'

export interface Metric {
  label: string
  compactLabel: string
  value: string
  description: string
}

export interface Status {
  language: 'zh-CN' | 'en-US'
  label: string
  metrics: Record<MetricId, Metric>
  contextPercent: number | null
}

function nonnegative(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

function sum(values: readonly (number | null)[]): number | null {
  return values.every(value => value !== null)
    ? nonnegative(values.reduce<number>((total, value) => total + (value ?? 0), 0))
    : null
}

export function presentMetrics(snapshot: TaskData, context: ContextData | null, language: string): Status {
  const zh = language.toLowerCase().startsWith('zh')
  const locale = zh ? 'zh-CN' : 'en-US'
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
  const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
  const exact = (value: number | null) => value === null ? '—' : number.format(value)
  const short = (value: number | null) => value === null ? '—' : compact.format(value)
  const percent = (value: number | null) => value === null ? '—' : value > 0 && value < 0.1 ? '<0.1%' : `${number.format(value)}%`
  const turns = nonnegative(snapshot.turns)
  const steps = nonnegative(snapshot.steps)
  const input = nonnegative(snapshot.tokens.inputTokens)
  const output = nonnegative(snapshot.tokens.outputTokens)
  const cacheRead = nonnegative(snapshot.tokens.cacheReadTokens)
  const cacheWrite = nonnegative(snapshot.tokens.cacheWriteTokens)
  const total = sum([input, output, cacheRead, cacheWrite])
  const cacheBase = sum([input, cacheRead, cacheWrite])
  const cacheRate = cacheRead !== null && cacheBase !== null && cacheBase > 0 ? cacheRead / cacheBase * 100 : null
  const speed = nonnegative(snapshot.throughput.tokensPerSecond)
  const samples = nonnegative(snapshot.throughput.samples)
  const usage = context?.taskId === snapshot.taskId && context.branchId === snapshot.branchId ? context : null
  const contextTokens = nonnegative(usage?.tokens)
  const contextWindow = nonnegative(usage?.window)
  const contextPercent = contextTokens !== null && contextWindow !== null && contextWindow > 0
    ? nonnegative(usage?.percent)
    : null

  return {
    language: locale,
    label: zh ? '任务状态；当前任务与分支' : 'Task status; current task and branch',
    contextPercent,
    metrics: {
      counts: {
        label: '',
        compactLabel: '',
        value: zh
          ? `${short(turns)}轮/${short(steps)}步`
          : `${short(turns)} ${turns === 1 ? 'turn' : 'turns'}/${short(steps)} ${steps === 1 ? 'step' : 'steps'}`,
        description: zh
          ? `轮数 ${exact(turns)}，模型步数 ${exact(steps)}。轮数为当前分支可见用户输入；模型步数为已开始的 assistant 请求，含失败与取消。`
          : `Turns ${exact(turns)}; model steps ${exact(steps)}. Turns count visible user inputs on this branch; steps count started assistant requests, including failures and cancellations.`,
      },
      speed: {
        label: zh ? '均速' : 'Avg speed',
        compactLabel: zh ? '均速' : 'Avg',
        value: `${short(speed)} tok/s`,
        description: zh
          ? `累计平均输出速度 ${exact(speed)} Token/秒；不是瞬时速度。有效采样 ${exact(samples)} 次，与宿主统计面板使用同一统计来源，缺失时为未知。`
          : `Cumulative average output speed: ${exact(speed)} tokens per second, not an instantaneous rate. ${exact(samples)} valid samples from the same statistics source as the host panel; missing samples are unknown.`,
      },
      total: {
        label: zh ? '总 Token' : 'Total tok',
        compactLabel: 'tok',
        value: short(total),
        description: zh
          ? `总 Token ${exact(total)}：输入 ${exact(input)}、输出 ${exact(output)}、缓存读取 ${exact(cacheRead)}、缓存写入 ${exact(cacheWrite)} 四项之和。`
          : `Total tokens ${exact(total)}: sum of input ${exact(input)}, output ${exact(output)}, cache read ${exact(cacheRead)}, and cache write ${exact(cacheWrite)}.`,
      },
      cache: {
        label: zh ? '缓存命中' : 'Cache hit',
        compactLabel: zh ? '命中' : 'Hit',
        value: percent(cacheRate),
        description: zh
          ? `缓存命中率 ${percent(cacheRate)}。缓存读取除以输入、缓存读取与缓存写入之和；分母为零或缺失时未知。`
          : `Cache hit rate ${percent(cacheRate)}. Cache read divided by input plus cache read plus cache write; a zero or missing denominator is unknown.`,
      },
      context: {
        label: zh ? '上下文' : 'Context',
        compactLabel: '',
        value: contextPercent === null ? '—' : `≈${percent(contextPercent)}`,
        description: zh
          ? `上下文估算 ${exact(contextTokens)} / ${exact(contextWindow)} Token，占比 ${percent(contextPercent)}。圆环为上下文窗口占用估算，不是任务完成进度；未知时不填充。`
          : `Estimated context: ${exact(contextTokens)} of ${exact(contextWindow)} tokens, ${percent(contextPercent)}. The ring estimates context-window usage, not task completion; no fill is shown when unknown.`,
      },
    },
  }
}
