module Api
  module V1
    class FeatureFlagsController < ApplicationController
      before_action :set_feature_flag, only: [:show, :update, :simulate_telemetry, :approve_rollback]

      # GET /api/v1/feature_flags
      def index
        @flags = FeatureFlag.all.order(created_at: :asc)
        render json: @flags.as_json(include: [:agent_audits, :canary_metrics])
      end

      # GET /api/v1/feature_flags/:id
      def show
        render json: @flag.as_json(include: [:agent_audits, :canary_metrics])
      end

      # PATCH/PUT /api/v1/feature_flags/:id
      def update
        if @flag.update(flag_params)
          render json: @flag
        else
          render json: { errors: @flag.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/feature_flags/:id/simulate_telemetry
      # Senaryo tetikleme: "critical_crash", "latency_spike", "healthy"
      def simulate_telemetry
        scenario = params[:scenario] || "critical_crash"

        metric = case scenario
        when "critical_crash"
          @flag.canary_metrics.create!(
            error_rate: 18.4,
            latency_p99: 420,
            crash_count: 312,
            sample_size: 10_000,
            logs_payload: "FATAL: SIGSEGV in libavcodec hardware decode pipeline. Memory buffer corruption at 0x7fff4a20. Active stream drops: 312."
          )
        when "latency_spike"
          @flag.canary_metrics.create!(
            error_rate: 1.2,
            latency_p99: 1850,
            crash_count: 0,
            sample_size: 15_000,
            logs_payload: "WARN: p99 latency elevated to 1850ms across US-East edge CDN nodes. Downstream origin database connection pool queue length: 82."
          )
        else # healthy
          @flag.canary_metrics.create!(
            error_rate: 0.04,
            latency_p99: 110,
            crash_count: 0,
            sample_size: 25_000,
            logs_payload: "INFO: Telemetry healthy. SLO adherence: 99.96%. Zero fatal crashes recorded."
          )
        end

        # Release Guardian Ajanını çalıştır
        agent = ReleaseGuardianAgent.new(@flag, metric)
        audit = agent.evaluate_and_execute!

        render json: {
          feature_flag: @flag.reload.as_json(include: [:agent_audits, :canary_metrics]),
          latest_metric: metric,
          agent_audit: audit
        }
      end

      # POST /api/v1/feature_flags/:id/approve_rollback
      # Guardrail devreye girdiğinde mühendisin verdiği Human-in-the-Loop onayı
      def approve_rollback
        @flag.update!(rollout_percentage: 0, status: "killed_by_human_approval")
        
        audit = @flag.agent_audits.create!(
          risk_score: 90,
          risk_tier: "HIGH",
          action_taken: "MANUAL_ROLLBACK_CONFIRMED",
          execution_status: "EXECUTED",
          reasoning: "Architect confirmed rollback after reviewing elevated CDN edge latency telemetry.",
          payload: "vanectl flag set #{@flag.key} --rollout 0 --approved-by SRE_OPERATOR"
        )

        render json: {
          feature_flag: @flag.reload.as_json(include: [:agent_audits, :canary_metrics]),
          agent_audit: audit
        }
      end

      private

      def set_feature_flag
        @flag = FeatureFlag.find(params[:id])
      end

      def flag_params
        params.require(:feature_flag).permit(:name, :key, :description, :environment, :status, :rollout_percentage)
      end
    end
  end
end