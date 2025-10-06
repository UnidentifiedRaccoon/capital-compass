const startedAt = Date.now();

export const metrics = {
  updates_total: 0,
  updates_ok: 0,
  updates_err: 0,
  llm_calls: 0,
  llm_failed: 0,
  llm_last_latency_ms: 0,
  last_update_ts: 0,
};

export const markUpdateStart = () => {
  metrics.updates_total += 1;
  metrics.last_update_ts = Date.now();
};

export const markUpdateOk = () => {
  metrics.updates_ok += 1;
};

export const markUpdateErr = () => {
  metrics.updates_err += 1;
};

export const markLlm = (ok, latencyMs = 0) => {
  metrics.llm_calls += 1;
  if (!ok) metrics.llm_failed += 1;
  metrics.llm_last_latency_ms = latencyMs;
};

export const metricsSnapshot = () => ({
  ...metrics,
  uptime_s: Math.floor((Date.now() - startedAt) / 1000),
});
