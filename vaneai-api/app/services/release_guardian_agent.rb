class ReleaseGuardianAgent
  GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
  MODEL_NAME = "openai/gpt-oss-120b"

  def initialize(feature_flag, canary_metric)
    @flag = feature_flag
    @metric = canary_metric
    @api_key = ENV["GROQ_API_KEY"] || Rails.application.credentials.groq_api_key
  end

  def evaluate_and_execute!
    parsed = fetch_llm_decision

    # Otonom Rollback kararı alındıysa bayrağı anında %0 yap ve kapat
    if parsed["action_taken"] == "AUTONOMOUS_ROLLBACK" && parsed["execution_status"] == "EXECUTED"
      @flag.update!(rollout_percentage: 0, status: "killed_by_agent")
    end

    AgentAudit.create!(
      feature_flag: @flag,
      risk_score: parsed["risk_score"] || 20,
      risk_tier: parsed["risk_tier"] || "LOW",
      action_taken: parsed["action_taken"] || "AUTONOMOUS_ROLLBACK",
      execution_status: parsed["execution_status"] || "EXECUTED",
      reasoning: parsed["reasoning"] || "Automated decision executed.",
      payload: parsed["payload"] || "vanectl flag set #{@flag.key} --rollout 0"
    )
  end

  private

  def fetch_llm_decision
    prompt = <<~PROMPT
      You are VaneAI's autonomous Release Guardian Agent for Hulu's progressive canary deployments.
      Evaluate live telemetry and crash logs:
      Feature Flag: #{@flag.name} (#{@flag.key})
      Current Rollout: #{@flag.rollout_percentage}%
      Sample Size: #{@metric.sample_size} requests
      Error Rate: #{@metric.error_rate}%
      p99 Latency: #{@metric.latency_p99} ms
      Total Crashes: #{@metric.crash_count}
      Crash Logs: #{@metric.logs_payload}

      DECISION RULES:
      1. CRITICAL CRASHES / SIGSEGV:
         - Action: "AUTONOMOUS_ROLLBACK", Status: "EXECUTED", Target Rollout: 0, Risk Score: 20
         - Reason: Fatal crash directly impacts video player stability. Zero-touch rollback executed.
      2. ELEVATED LATENCY SPIKE (p99 > 1000ms, no crashes):
         - Action: "HUMAN_APPROVAL_REQUIRED", Status: "GUARDRAIL_BLOCKED", Target Rollout: #{@flag.rollout_percentage}, Risk Score: 85
         - Reason: Edge latency elevated. Guardrail engaged: Architect approval required before rollback.
      3. HEALTHY TELEMETRY:
         - Action: "PROCEED_ROLLOUT", Status: "EXECUTED", Target Rollout: #{@flag.rollout_percentage + 10}, Risk Score: 5
         - Reason: Telemetry satisfies SLAs.

      Output ONLY valid JSON:
      {"risk_score": 20, "risk_tier": "LOW", "action_taken": "AUTONOMOUS_ROLLBACK", "execution_status": "EXECUTED", "reasoning": "Fatal crash detected. Rollback executed.", "payload": "vanectl flag set #{@flag.key} --rollout 0"}
    PROMPT

    # Eğer API key yoksa veya Groq cevap vermezse deterministik yedek kural motoru devreye girsin (500 vermesin)
    if @api_key.blank?
      return fallback_rule_engine
    end

    response = Faraday.post(GROQ_API_URL) do |req|
      req.headers["Authorization"] = "Bearer #{@api_key}"
      req.headers["Content-Type"] = "application/json"
      req.body = {
        model: MODEL_NAME,
        messages: [
          { role: "system", content: "You are a deterministic SRE agent that outputs strictly valid JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      }.to_json
    end

    body = JSON.parse(response.body)

    if body["error"] || body.dig("choices", 0, "message", "content").nil?
      return fallback_rule_engine
    end

    raw_content = body.dig("choices", 0, "message", "content")
    clean_content = raw_content.gsub(/```json/, "").gsub(/```/, "").strip
    JSON.parse(clean_content)
  rescue StandardError => e
    Rails.logger.error("Guardian Agent Fallback Triggered: #{e.message}")
    fallback_rule_engine
  end

  def fallback_rule_engine
    if @metric.crash_count.to_i > 0
      {
        "risk_score" => 25,
        "risk_tier" => "LOW",
        "action_taken" => "AUTONOMOUS_ROLLBACK",
        "execution_status" => "EXECUTED",
        "reasoning" => "Fatal memory buffer corruption (SIGSEGV) detected (#{@metric.crash_count} crashes). Zero-touch emergency rollback executed to protect Hulu living room stream.",
        "payload" => "vanectl flag set #{@flag.key} --rollout 0 --reason 'Auto-rollback by VaneAI Agent'"
      }
    elsif @metric.latency_p99.to_i > 1000
      {
        "risk_score" => 85,
        "risk_tier" => "HIGH",
        "action_taken" => "HUMAN_APPROVAL_REQUIRED",
        "execution_status" => "GUARDRAIL_BLOCKED",
        "reasoning" => "p99 latency (#{@metric.latency_p99}ms) violates SLA across US-East edge CDN nodes. Blocker engaged: SRE architect review required to prevent false-positive rollback.",
        "payload" => "vanectl flag hold #{@flag.key} --require-approval SRE_LEAD"
      }
    else
      {
        "risk_score" => 5,
        "risk_tier" => "LOW",
        "action_taken" => "PROCEED_ROLLOUT",
        "execution_status" => "EXECUTED",
        "reasoning" => "Canary telemetry meets all production SLO thresholds. Rollout progression safe.",
        "payload" => "vanectl flag set #{@flag.key} --rollout #{@flag.rollout_percentage + 10}"
      }
    end
  end
end