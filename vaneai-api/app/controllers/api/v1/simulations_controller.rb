module Api
  module V1
    class SimulationsController < ApplicationController
      def create
        flag = FeatureFlag.find_by(id: params[:feature_flag_id]) || FeatureFlag.first
        error_rate = params[:error_rate].to_f
        latency_p99 = params[:latency_p99].to_i
        crash_count = params[:crash_count].to_i
        current_code = flag&.code_context.to_s

        # 1. KIRMIZI DURUM: Kritik Çöküş (Error Rate > 2% veya Crash Count > 0)
        if error_rate > 2.0 || crash_count > 0
          diff = generate_critical_crash_diff(current_code)

          render json: {
            tier: "red",
            risk_score: 96,
            root_cause: "Unhandled ZeroDivisionError in calculation pipeline (fx_rate == 0)",
            reasoning: "High-risk failure detected. Autonomous deployment halted by circuit breaker policy. Human sign-off required.",
            diff: diff
          }

        # 2. SARI DURUM: Gecikme / Bellek Şişmesi (Latency > 300ms veya Error Rate > 0.5%)
        elsif latency_p99 > 300 || error_rate > 0.5
          diff, patched_code = generate_latency_optimization_diff(current_code)

          # Sarı durumda otonom olarak flag'in canlı kodunu da hafızada güncelleyelim
          flag.update(code_context: patched_code) if flag && patched_code.present?

          render json: {
            tier: "yellow",
            risk_score: 42,
            root_cause: "High P99 Latency & Unbounded Memory Accumulation (_GLOBAL_AUDIT_LOG)",
            reasoning: "Autonomous patch applied: Converted blocking synchronous audit append to bounded LRU buffer. Canary progression resuming.",
            diff: diff,
            patched_code: patched_code
          }

        # 3. YEŞİL DURUM: Nominal Metrikler
        else
          render json: {
            tier: "nominal",
            risk_score: 5,
            root_cause: "Nominal operational baseline",
            reasoning: "All telemetries within bounds. Rollout progression safe to increment."
          }
        end
      end

      private

      # Kırmızı durum için: ZeroDivisionError yaması
      def generate_critical_crash_diff(code)
        if code.include?("adjusted_payout = total_amount / fx_rate")
          <<~DIFF
            @@ -11,4 +11,7 @@
            - adjusted_payout = total_amount / fx_rate
            + # Autonomous Guardrail Hotfix: ZeroDivision Protection
            + if fx_rate <= 0:
            +     raise ValueError("Invalid fx_rate: exchange rate must be strictly positive")
            + adjusted_payout = total_amount / fx_rate
          DIFF
        else
          <<~DIFF
            @@ -1,5 +1,7 @@
            + # Autonomous Guardrail Circuit Breaker Applied
            + if not validate_runtime_health():
            +     return {"status": "CIRCUIT_BREAKER_ACTIVE", "error": "Crash isolated"}
          DIFF
        end
      end

      # Sarı durum için: Bellek sızıntısı ve gecikme optimizasyon yaması
      def generate_latency_optimization_diff(code)
        if code.include?("_GLOBAL_AUDIT_LOG.append")
          diff = <<~DIFF
            @@ -4,6 +4,8 @@
            - _GLOBAL_AUDIT_LOG.append({"status": "SETTLED", "raw_payload": "X" * 1024 * 1024})
            + # Autonomous Patch: Evict unbounded memory leak & optimize latency
            + if len(_GLOBAL_AUDIT_LOG) > 1000:
            +     _GLOBAL_AUDIT_LOG.pop(0)
            + _GLOBAL_AUDIT_LOG.append({"batch_id": batch_id, "payout": adjusted_payout})
          DIFF

          patched = code.gsub(
            /_GLOBAL_AUDIT_LOG\.append\(\{[\s\S]*?\}\)/,
            "# Autonomous Patch: Bounded Ring Buffer\n    if len(_GLOBAL_AUDIT_LOG) > 1000:\n        _GLOBAL_AUDIT_LOG.pop(0)\n    _GLOBAL_AUDIT_LOG.append({\"batch_id\": batch_id, \"payout\": adjusted_payout})"
          )
          [diff, patched]
        else
          diff = <<~DIFF
            @@ -2,3 +2,4 @@
            + # Autonomous Patch: Async worker execution to lower P99 latency
          DIFF
          [diff, code]
        end
      end
    end
  end
end