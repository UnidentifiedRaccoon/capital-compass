const startedAt = Date.now();

export const metrics = {
  updates_total: 0,
  updates_ok: 0,
  updates_err: 0,
  llm_calls: 0,
  llm_failed: 0,
};

export const markUpdateStart = () => {
  metrics.updates_total += 1;
};

export const markUpdateOk = () => {
  metrics.updates_ok += 1;
};

export const markUpdateErr = () => {
  metrics.updates_err += 1;
};

export const markLlm = (ok) => {
  metrics.llm_calls += 1;
  if (!ok) metrics.llm_failed += 1;
};

export const metricsSnapshot = async () => {
  const { getContextStats } = await import('./storage/chatContext.js');
  const contextStats = getContextStats();

  return {
    ...metrics,
    uptime_s: Math.floor((Date.now() - startedAt) / 1000),
    context: contextStats,
  };
};
