"use client";

import React, { useCallback, useEffect, useState } from "react";
import type {
  AlertComparator,
  AlertEventDetail,
  AlertEventSummary,
  AlertMetricType,
  AlertRotaRecord,
  AlertRuleRecord,
  AlertSeverity,
  AlertVolumeStats,
} from "@wonflow/contracts";

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { label: string; badge: string; border: string; bg: string; dot: string }
> = {
  CRITICAL: {
    label: "CRITICAL",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800",
    border: "border-rose-300 dark:border-rose-800/80",
    bg: "bg-rose-50/50 dark:bg-rose-950/20",
    dot: "bg-rose-500 animate-pulse",
  },
  WARNING: {
    label: "WARNING",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800",
    border: "border-amber-300 dark:border-amber-800/80",
    bg: "bg-amber-50/50 dark:bg-amber-950/20",
    dot: "bg-amber-500",
  },
  INFO: {
    label: "INFO",
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-300 dark:border-sky-800",
    border: "border-sky-300 dark:border-sky-800/80",
    bg: "bg-sky-50/50 dark:bg-sky-950/20",
    dot: "bg-sky-500",
  },
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function ClinicalAlertConsole() {
  const [activeTab, setActiveTab] = useState<"alerts" | "rules" | "rota" | "analytics">("alerts");
  const [alerts, setAlerts] = useState<AlertEventSummary[]>([]);
  const [stats, setStats] = useState<AlertVolumeStats | null>(null);
  const [rules, setRules] = useState<AlertRuleRecord[]>([]);
  const [rotas, setRotas] = useState<AlertRotaRecord[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertEventDetail | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ACTIVE");
  const [isLoading, setIsLoading] = useState(true);

  // Modals & Action States
  const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Override / New Rule Form
  const [showNewRuleModal, setShowNewRuleModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleMetricType, setNewRuleMetricType] = useState<AlertMetricType>("OBSERVATION");
  const [newRuleMetricCode, setNewRuleMetricCode] = useState("temperature");
  const [newRuleComparator, setNewRuleComparator] = useState<AlertComparator>("GT");
  const [newRuleThreshold, setNewRuleThreshold] = useState("38.0");
  const [newRuleSeverity, setNewRuleSeverity] = useState<AlertSeverity>("CRITICAL");

  // Load Data Handlers
  const loadAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const statusParam = selectedStatus === "ALL" ? "" : `&status=${selectedStatus}`;
      const severityParam = selectedSeverity === "ALL" ? "" : `&severity=${selectedSeverity}`;
      const res = await fetch(`/api/v1/clinical/alerts?limit=100${statusParam}${severityParam}`);
      const data = await res.json();
      if (res.ok && data.alerts) {
        setAlerts(data.alerts);
      }
    } catch (e) {
      console.error("Failed to load alerts", e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus, selectedSeverity]);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/clinical/alerts/stats");
      const data = await res.json();
      if (res.ok && data.stats) {
        setStats(data.stats);
      }
    } catch (e) {
      console.error("Failed to load alert stats", e);
    }
  }, []);

  const loadRules = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/clinical/alerts/rules");
      const data = await res.json();
      if (res.ok && data.rules) {
        setRules(data.rules);
      }
    } catch (e) {
      console.error("Failed to load alert rules", e);
    }
  }, []);

  const loadRotas = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/clinical/alerts/rota");
      const data = await res.json();
      if (res.ok && data.rotas) {
        setRotas(data.rotas);
      }
    } catch (e) {
      console.error("Failed to load alert rotas", e);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [resAlerts, resStats] = await Promise.all([
          fetch(`/api/v1/clinical/alerts?limit=100&status=${selectedStatus}`),
          fetch("/api/v1/clinical/alerts/stats"),
        ]);
        const dataAlerts = await resAlerts.json();
        const dataStats = await resStats.json();
        if (active) {
          if (dataAlerts.alerts) setAlerts(dataAlerts.alerts);
          if (dataStats.stats) setStats(dataStats.stats);
          setIsLoading(false);
        }
      } catch (e) {
        console.error("Initial load failed", e);
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedStatus]);

  async function openAlertDetail(alertId: string) {
    try {
      const res = await fetch(`/api/v1/clinical/alerts/${alertId}`);
      const data = await res.json();
      if (res.ok && data.alert) {
        setSelectedAlert(data.alert);
      }
    } catch (e) {
      console.error("Failed to load alert detail", e);
    }
  }

  async function handleAcknowledge(alertId: string) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/clinical/alerts/${alertId}/acknowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Acknowledged by clinician in console" }),
      });
      if (res.ok) {
        setFeedback({ type: "success", message: "Alert acknowledged. Escalation stopped." });
        void loadAlerts();
        void loadStats();
        if (selectedAlert?.id === alertId) {
          void openAlertDetail(alertId);
        }
      } else {
        const data = await res.json();
        throw new Error(data.error?.message || "Failed to acknowledge alert");
      }
    } catch (err: unknown) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to acknowledge" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResolve(e: React.FormEvent) {
    e.preventDefault();
    if (!resolvingAlertId || !resolutionNotes.trim()) {
      setFeedback({ type: "error", message: "Clinical resolution notes are mandatory." });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/clinical/alerts/${resolvingAlertId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolutionNotes: resolutionNotes.trim() }),
      });
      if (res.ok) {
        setFeedback({ type: "success", message: "Alert resolved and archived to patient clinical timeline." });
        setResolvingAlertId(null);
        setResolutionNotes("");
        void loadAlerts();
        void loadStats();
        if (selectedAlert?.id === resolvingAlertId) {
          setSelectedAlert(null);
        }
      } else {
        const data = await res.json();
        throw new Error(data.error?.message || "Failed to resolve alert");
      }
    } catch (err: unknown) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to resolve alert" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateRule(e: React.FormEvent) {
    e.preventDefault();
    if (!newRuleName.trim() || !newRuleThreshold.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/clinical/alerts/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRuleName.trim(),
          metricType: newRuleMetricType,
          metricCode: newRuleMetricCode.trim(),
          comparator: newRuleComparator,
          thresholdValue: newRuleThreshold.trim(),
          severity: newRuleSeverity,
          isActive: true,
        }),
      });
      if (res.ok) {
        setFeedback({ type: "success", message: "Clinical alert rule created successfully." });
        setShowNewRuleModal(false);
        setNewRuleName("");
        void loadRules();
      } else {
        const data = await res.json();
        throw new Error(data.error?.message || "Failed to create rule");
      }
    } catch (err: unknown) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to create rule" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-400 animate-ping" />
              Surgical Safety & Escalation
            </span>
            <span className="text-xs text-slate-400">Post-Op Remote Telemetry</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Clinical Alert Console</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Real-time multi-channel escalation engine evaluating pancreatic resection drain outputs, vital signs, and symptom thresholds.
          </p>
        </div>

        {/* Quick KPI Cards */}
        {stats && (
          <div className="flex items-center gap-3">
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-3.5 py-2 text-center min-w-[70px]">
              <div className="text-xl font-black text-rose-400">{stats.criticalCount}</div>
              <div className="text-[10px] uppercase font-semibold text-rose-300/80">Critical</div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-3.5 py-2 text-center min-w-[70px]">
              <div className="text-xl font-black text-amber-400">{stats.warningCount}</div>
              <div className="text-[10px] uppercase font-semibold text-amber-300/80">Warning</div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3.5 py-2 text-center min-w-[70px]">
              <div className="text-xl font-black text-emerald-400">{stats.resolvedLast24h}</div>
              <div className="text-[10px] uppercase font-semibold text-emerald-300/80">Resolved (24h)</div>
            </div>
          </div>
        )}
      </div>

      {/* Action Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium border flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300"
              : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300"
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => {
            setActiveTab("alerts");
            void loadAlerts();
          }}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "alerts"
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          Active Alert Board ({alerts.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("rules");
            void loadRules();
          }}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "rules"
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          Threshold Rules & Overrides
        </button>
        <button
          onClick={() => {
            setActiveTab("rota");
            void loadRotas();
          }}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "rota"
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          On-Call Rota Schedule
        </button>
        <button
          onClick={() => {
            setActiveTab("analytics");
            void loadStats();
          }}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "analytics"
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          Signal-to-Noise Analytics
        </button>
      </div>

      {/* TAB 1: ACTIVE ALERTS BOARD */}
      {activeTab === "alerts" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Status:</span>
              {(["ACTIVE", "OPEN", "ACKNOWLEDGED", "RESOLVED", "ALL"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                    selectedStatus === st
                      ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Severity:</span>
              {(["ALL", "CRITICAL", "WARNING", "INFO"] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSelectedSeverity(sev)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                    selectedSeverity === sev
                      ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {/* Alerts List */}
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading live clinical alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
              No alerts matching the selected filters. Clinical telemetry nominal.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {alerts.map((alert) => {
                const sevConfig = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.WARNING;
                const isResolved = alert.status === "RESOLVED";
                const isAcknowledged = alert.status === "ACKNOWLEDGED";

                return (
                  <div
                    key={alert.id}
                    className={`rounded-2xl border p-4 transition-all shadow-sm ${sevConfig.border} ${sevConfig.bg} ${
                      isResolved ? "opacity-60 bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800" : ""
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2.5 py-0.5 text-[10px] font-bold tracking-wider rounded-full border flex items-center gap-1 ${sevConfig.badge}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${sevConfig.dot}`} />
                            {alert.severity}
                          </span>

                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {alert.patientName} ({alert.patientNumber})
                          </span>

                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            • Triggered {new Date(alert.triggeredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>


                          {alert.status === "ACKNOWLEDGED" && (
                            <span className="px-2 py-0.5 text-[10px] bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 rounded font-semibold">
                              Acknowledged by {alert.acknowledgedByName || "Clinician"}
                            </span>
                          )}

                          {alert.status === "RESOLVED" && (
                            <span className="px-2 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded font-semibold">
                              Resolved
                            </span>
                          )}
                        </div>

                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {alert.title}
                        </div>

                        {alert.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {alert.description}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => openAlertDetail(alert.id)}
                          className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                        >
                          View Context
                        </button>

                        {!isResolved && !isAcknowledged && (
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            disabled={isSubmitting}
                            className="px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition disabled:opacity-50"
                          >
                            Acknowledge
                          </button>
                        )}

                        {!isResolved && (
                          <button
                            onClick={() => {
                              setResolvingAlertId(alert.id);
                              setResolutionNotes("");
                            }}
                            className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
                          >
                            Resolve...
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: THRESHOLD RULES */}
      {activeTab === "rules" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Alert Rules</h3>
              <p className="text-xs text-slate-500">Practice-wide threshold criteria evaluated upon patient submission</p>
            </div>
            <button
              onClick={() => setShowNewRuleModal(true)}
              className="px-3 py-2 text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:opacity-90 transition"
            >
              + Create Custom Rule
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {rule.metricType} • {rule.metricCode}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{rule.name}</h4>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                      SEVERITY_CONFIG[rule.severity]?.badge || ""
                    }`}
                  >
                    {rule.severity}
                  </span>
                </div>

                {rule.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{rule.description}</p>
                )}

                <div className="pt-2 flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800">
                  <span>
                    Condition: <strong className="font-mono">{rule.comparator} {rule.thresholdValue}</strong>
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Deduplication: {rule.windowHours ? `${rule.windowHours}h` : "Standard"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ON-CALL ROTA SCHEDULE */}
      {activeTab === "rota" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Escalation On-Call Rota</h3>
              <p className="text-xs text-slate-500">Defines primary and escalation clinicians by day and hour</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            {rotas.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No custom rota defined. System defaults to active consultant surgeon and senior registrar on-call.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {rotas.map((rota) => (
                  <div key={rota.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {DAY_NAMES[rota.dayOfWeek]}
                      </span>
                      <span className="text-slate-500 ml-2">
                        {Math.floor(rota.startMinute / 60)}:00 - {Math.floor(rota.endMinute / 60)}:00
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-slate-400">Primary:</span>{" "}
                        <strong className="text-slate-800 dark:text-slate-200">{rota.primaryName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Escalates To:</span>{" "}
                        <strong className="text-slate-800 dark:text-slate-200">{rota.escalationName}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SIGNAL-TO-NOISE ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <div className="text-xs font-semibold text-slate-500">Average Resolution Time</div>
              <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                {stats?.averageResolutionMinutes ?? 0} <span className="text-sm font-normal text-slate-400">mins</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Time from alert trigger to clinical sign-off</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <div className="text-xs font-semibold text-slate-500">Critical vs Warning Ratio</div>
              <div className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {stats ? `${stats.criticalCount} : ${stats.warningCount}` : "0 : 0"}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">High-acuity alerts requiring immediate intervention</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <div className="text-xs font-semibold text-slate-500">24-Hour Resolution Rate</div>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {stats?.resolvedLast24h ?? 0}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Successfully closed clinical episodes in last 24h</p>
            </div>
          </div>
        </div>
      )}

      {/* RESOLUTION MODAL */}
      {resolvingAlertId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Clinical Alert Resolution Sign-Off
            </h3>
            <p className="text-xs text-slate-500">
              Provide clinical notes documenting the assessment, medical intervention, and resolution plan for the medical record.
            </p>

            <form onSubmit={handleResolve} className="space-y-4">
              <textarea
                required
                rows={4}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="e.g. Reviewed drain amylase (340 U/L). Ordered abdominal ultrasound confirming no collection. Started prophylactic octreotide and continued low-fat oral intake."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResolvingAlertId(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !resolutionNotes.trim()}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition disabled:opacity-50"
                >
                  {isSubmitting ? "Resolving..." : "Sign Off & Resolve Alert"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ALERT DETAIL MODAL */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span
                  className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                    SEVERITY_CONFIG[selectedAlert.severity]?.badge || ""
                  }`}
                >
                  {selectedAlert.severity}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {selectedAlert.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Patient: {selectedAlert.patientName} ({selectedAlert.patientNumber})
                </p>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Context Details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-xs">
              <div>
                <div className="text-slate-400">Triggered At</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {new Date(selectedAlert.triggeredAt).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Metric Value</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                  {selectedAlert.metricValue}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Status</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedAlert.status}
                </div>
              </div>
              {selectedAlert.activeCarePlanTitle && (
                <div className="col-span-2 sm:col-span-3">
                  <div className="text-slate-400">Active Care Plan</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedAlert.activeCarePlanTitle}
                  </div>
                </div>
              )}
            </div>

            {/* Recent Trends */}
            {selectedAlert.recentTrends && selectedAlert.recentTrends.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Recent Telemetry Trend ({selectedAlert.metricCode})
                </h4>
                <div className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-3 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {selectedAlert.recentTrends.map((t, idx) => (
                    <div key={idx} className="py-1.5 flex items-center justify-between">
                      <span className="text-slate-500">{new Date(t.observedAt).toLocaleString()}</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {t.value} {t.unit || ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Escalation Trail */}
            {selectedAlert.escalations && selectedAlert.escalations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Escalation Dispatch Trail
                </h4>
                <div className="space-y-1.5">
                  {selectedAlert.escalations.map((esc) => (
                    <div
                      key={esc.id}
                      className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold">Step {esc.step}: {esc.channel}</span>
                        <span className="text-slate-500 ml-2">
                          Scheduled {new Date(esc.scheduledFor).toLocaleTimeString()}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          esc.deliveredAt
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : esc.failedAt
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {esc.deliveredAt ? "Delivered" : esc.failedAt ? "Discontinued" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedAlert(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE RULE MODAL */}
      {showNewRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Create Clinical Alert Rule
            </h3>

            <form onSubmit={handleCreateRule} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Rule Name
                </label>
                <input
                  required
                  type="text"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  placeholder="e.g. Critical Hypoxemia on Room Air"
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Metric Type
                  </label>
                  <select
                    value={newRuleMetricType}
                    onChange={(e) => setNewRuleMetricType(e.target.value as AlertMetricType)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="OBSERVATION">Vital Observation</option>
                    <option value="DRAIN">Surgical Drain</option>
                    <option value="SYMPTOM">Symptom Log</option>
                    <option value="TASK_ADHERENCE">Task Adherence</option>
                    <option value="WEIGHT_CHANGE">Weight Change</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Metric Code
                  </label>
                  <input
                    required
                    type="text"
                    value={newRuleMetricCode}
                    onChange={(e) => setNewRuleMetricCode(e.target.value)}
                    placeholder="e.g. oxygen_saturation"
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Comparator
                  </label>
                  <select
                    value={newRuleComparator}
                    onChange={(e) => setNewRuleComparator(e.target.value as AlertComparator)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="GT">Greater Than (&gt;)</option>
                    <option value="GTE">Greater Than or Equal (&ge;)</option>
                    <option value="LT">Less Than (&lt;)</option>
                    <option value="LTE">Less Than or Equal (&le;)</option>
                    <option value="EQ">Exact Match (=)</option>
                    <option value="CHANGE_TO">Change To (Category)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Threshold Value
                  </label>
                  <input
                    required
                    type="text"
                    value={newRuleThreshold}
                    onChange={(e) => setNewRuleThreshold(e.target.value)}
                    placeholder="e.g. 92"
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Alert Severity
                </label>
                <select
                  value={newRuleSeverity}
                  onChange={(e) => setNewRuleSeverity(e.target.value as AlertSeverity)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                >
                  <option value="CRITICAL">CRITICAL (Immediate Push & SMS)</option>
                  <option value="WARNING">WARNING (Priority Push & Escalation)</option>
                  <option value="INFO">INFO (Dashboard Notice)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewRuleModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg transition disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Create Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
