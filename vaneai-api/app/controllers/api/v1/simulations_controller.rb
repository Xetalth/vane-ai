module Api
  module V1
    class SimulationsController < ApplicationController
      def create
        flag = FeatureFlag.find_by(id: params[:feature_flag_id]) || FeatureFlag.first
        error_rate = params[:error_rate].to_f
        latency_p99 = params[:latency_p99].to_i
        crash_count = params[:crash_count].to_i
        sample_size = params[:sample_size].presence || 25_000

        # Simülasyon telemetrisini oluştur
        metric = CanaryMetric.new(
          feature_flag: flag,
          error_rate: error_rate,
          latency_p99: latency_p99,
          crash_count: crash_count,
          sample_size: sample_size,
          logs_payload: crash_count > 0 ? "FATAL ZeroDivisionError / SIGSEGV detected under high canary load" : "WARN: Elevated loop latency p99 > #{latency_p99}ms"
        )

        # Groq gpt-oss-120b ajanını çalıştır
        agent = ReleaseGuardianAgent.new(flag, metric)
        decision = agent.evaluate_and_execute!

        action = decision["action_taken"]

        # 1. KIRMIZI DURUM: Devre kesici aktif, diff hazır, insan mühendis onayı bekliyor
        if action == "CIRCUIT_BREAKER_HALT" || action == "AUTONOMOUS_ROLLBACK"
          render json: {
            tier: "red",
            risk_score: decision["risk_score"] || 95,
            root_cause: decision["reasoning"] || "Unhandled critical crash in execution pipeline",
            reasoning: "High-risk failure detected. Autonomous deployment halted by circuit breaker policy. Human sign-off required.",
            diff: decision["payload"]
          }

        # 2. SARI DURUM: Otonom yama uygulandı, canary kesintisiz devam ediyor
        elsif action == "SELF_HEALING_OPTIMIZE"
          render json: {
            tier: "yellow",
            risk_score: decision["risk_score"] || 45,
            root_cause: decision["reasoning"] || "P99 latency elevated under load",
            reasoning: "Autonomous patch generated and committed silently. Canary progression continuing.",
            diff: decision["payload"],
            patched_code: flag.code_context
          }

        # 3. YEŞİL DURUM: Nominal akış
        else
          render json: {
            tier: "nominal",
            risk_score: decision["risk_score"] || 5,
            root_cause: "Nominal operational baseline",
            reasoning: decision["reasoning"] || "All telemetries within bounds. Rollout progression safe."
          }
        end
      end
    end
  end
end