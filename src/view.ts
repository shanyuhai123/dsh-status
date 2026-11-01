import type { Disposable, ViewContext, ViewEnvironment } from './lexora'
import type { ContextData, MetricId, TaskData } from './metrics'
import { presentMetrics } from './metrics'
import { styles } from './styles'

const metricIds: MetricId[] = ['counts', 'speed', 'total', 'cache', 'context']

function createMetric(id: MetricId, separator: string) {
  const group = document.createElement('span')
  group.className = `task-status__metric task-status__metric--${id}`
  group.setAttribute('role', 'group')

  const divider = document.createElement('span')
  divider.className = 'task-status__separator'
  divider.setAttribute('aria-hidden', 'true')
  divider.textContent = separator

  const visual = document.createElement('span')
  visual.className = 'task-status__visual'
  visual.setAttribute('aria-hidden', 'true')

  const label = document.createElement('span')
  label.className = 'task-status__label task-status__label--full'
  const compactLabel = document.createElement('span')
  compactLabel.className = 'task-status__label task-status__label--compact'
  const value = document.createElement('span')
  value.className = 'task-status__value'
  visual.append(label, compactLabel, value)
  if (separator)
    group.append(divider)
  group.append(visual)
  return { group, visual, label, compactLabel, value }
}

function createRing() {
  const namespace = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(namespace, 'svg')
  svg.classList.add('task-status__ring')
  svg.setAttribute('viewBox', '0 0 16 16')
  svg.setAttribute('aria-hidden', 'true')
  const circles = ['task-status__ring-track', 'task-status__ring-fill'].map((name) => {
    const circle = document.createElementNS(namespace, 'circle')
    circle.classList.add(name)
    circle.setAttribute('cx', '8')
    circle.setAttribute('cy', '8')
    circle.setAttribute('r', '6')
    circle.setAttribute('fill', 'none')
    circle.setAttribute('stroke-width', '2')
    circle.setAttribute('pathLength', '100')
    circle.setAttribute('transform', 'rotate(-90 8 8)')
    svg.append(circle)
    return circle
  })
  return { svg, track: circles[0]!, fill: circles[1]! }
}

export async function render(context: ViewContext, container: HTMLElement): Promise<void> {
  if (context.signal.aborted)
    return

  const style = document.createElement('style')
  style.textContent = styles
  const root = document.createElement('div')
  root.className = 'task-status'
  root.setAttribute('role', 'group')
  const items = metricIds.map((id, index) => createMetric(id, ['', '·', '|', '·', '|'][index]!))
  const ring = createRing()
  items[4]!.visual.insertBefore(ring.svg, items[4]!.value)
  root.append(...items.map(item => item.group))
  container.append(style, root)

  let metrics: TaskData | null = null
  let usage: ContextData | null = null
  let environment = context.environment
  let requestedActive: boolean | undefined
  let activation: Promise<void> = Promise.resolve()
  const subscriptions: Disposable[] = []

  function setActive(active: boolean): Promise<void> {
    if (requestedActive === active)
      return activation
    requestedActive = active
    activation = activation.catch(() => {}).then(async () => {
      if (!context.signal.aborted)
        await context.setActive(active)
    })
    return activation
  }

  function applyEnvironment(next: ViewEnvironment) {
    environment = next
    const colors = next.colors
    root.style.setProperty('--status-fg', colors.fg || 'var(--lexora-text)')
    root.style.setProperty('--status-muted', colors.muted || 'var(--lexora-muted)')
    root.style.setProperty('--status-border', colors.border || 'var(--lexora-border)')
    root.style.setProperty('--status-accent', colors['accent-text'] || 'var(--lexora-accent)')
    root.style.colorScheme = next.colorScheme
  }

  function paint() {
    root.hidden = metrics === null
    if (!metrics)
      return
    const status = presentMetrics(metrics, usage, environment.language)
    root.lang = status.language
    root.setAttribute('aria-label', status.label)
    metricIds.forEach((id, index) => {
      const item = items[index]!
      const metric = status.metrics[id]
      item.group.setAttribute('aria-label', metric.description)
      item.label.textContent = metric.label
      item.compactLabel.textContent = metric.compactLabel
      item.value.textContent = metric.value
    })
    const percent = status.contextPercent
    ring.track.setAttribute('stroke-dasharray', percent === null ? '6 6' : '100 0')
    ring.fill.setAttribute('stroke-dasharray', `${percent === null ? 0 : Math.min(100, percent)} 100`)
  }

  function reportActivationError(error: unknown) {
    if (!context.signal.aborted)
      console.error('Task status visibility update failed', error)
  }

  function dispose() {
    for (const subscription of subscriptions)
      void subscription.dispose()
    style.remove()
    root.remove()
  }

  context.signal.addEventListener('abort', dispose, { once: true })
  subscriptions.push(
    context.data.observe({ source: 'task.metrics', scope: 'bound' }, (snapshot) => {
      if (context.signal.aborted)
        return
      metrics = snapshot.status === 'ready' ? snapshot.value : null
      if (!metrics || usage?.taskId !== metrics.taskId || usage.branchId !== metrics.branchId)
        usage = null
      paint()
      void setActive(metrics !== null).catch(reportActivationError)
    }),
    context.data.observe({ source: 'context.usage', scope: 'bound' }, (snapshot) => {
      if (context.signal.aborted)
        return
      usage = snapshot.status === 'ready' ? snapshot.value : null
      paint()
    }),
    context.onEnvironmentChange((next) => {
      if (context.signal.aborted)
        return
      applyEnvironment(next)
      paint()
    }),
  )

  applyEnvironment(context.environment)
  paint()
  await setActive(metrics !== null)
}
