export const styles = `
.task-status {
  box-sizing: border-box;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  height: 28px;
  padding: 0 4px;
  overflow: hidden;
  color: var(--status-muted);
  font: 12px/1.2 system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
}
.task-status[hidden] { display: none; }
.task-status__metric,
.task-status__visual {
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}
.task-status__metric { flex: 0 1 auto; gap: 8px; }
.task-status__visual { gap: 4px; }
.task-status__separator { flex: none; color: var(--status-muted); }
.task-status__label { flex: none; }
.task-status__label:empty,
.task-status__label--compact { display: none; }
.task-status__value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--status-fg);
}
.task-status__ring { flex: none; width: 13px; height: 13px; }
.task-status__ring-track { stroke: var(--status-border); }
.task-status__ring-fill { stroke: var(--status-accent); }
@media (max-width: 740px) {
  .task-status__label--full { display: none; }
  .task-status__label--compact:not(:empty) { display: inline; }
  .task-status { gap: 4px; padding-inline: 2px; }
  .task-status__metric { gap: 4px; }
  .task-status__visual { gap: 3px; }
}
@media (max-width: 370px) {
  .task-status { gap: 3px; }
  .task-status__metric { gap: 2px; }
  .task-status__visual { gap: 2px; }
  .task-status__separator { display: none; }
}
@media (max-width: 299px) {
  .task-status__metric--counts { position: absolute; width: 1px; height: 1px; clip-path: inset(50%); }
}
@media (max-width: 239px) {
  .task-status__metric--speed { position: absolute; width: 1px; height: 1px; clip-path: inset(50%); }
}
@media (max-width: 179px) {
  .task-status__metric--cache { position: absolute; width: 1px; height: 1px; clip-path: inset(50%); }
}
`
