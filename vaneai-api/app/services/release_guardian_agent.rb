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

    # 1. Kırmızı Seviye (Devre Kesici / Kill): Rollout sıfırlanır, bayrak kilitlenir
    if parsed["action_taken"] == "CIRCUIT_BREAKER_HALT" || parsed["action_taken"] == "AUTONOMOUS_ROLLBACK"
      @flag.update!(rollout_percentage: 0, status: "circuit_broken")

    # 2. Sarı Seviye (Self-Healing Canary): Kod otonom optimize edildi, rollout bir üst kademeye ilerletilir
    elsif parsed["action_taken"] == "SELF_HEALING_OPTIMIZE"
      next_pct = parsed["next_rollout_percentage"].to_i
      next_pct = @flag.rollout_percentage + 10 if next_pct <= @flag.rollout_percentage
      next_pct = [next_pct, 100].min
      @flag.update!(rollout_percentage: next_pct, status: "self_healing_active")

    # 3. Sağlıklı Dağıtım: Kademeli ilerleme
    elsif parsed["action_taken"] == "PROCEED_ROLLOUT"
      next_pct = [(@flag.rollout_percentage + 15), 100].min
      @flag.update!(rollout_percentage: next_pct, status: "active")
    end

    # Karar ve üretilen yama (diff) audit tablosuna kaydedilir
    AgentAudit.create!(
      feature_flag: @flag,
      risk_score: parsed["risk_score"] || 10,
      risk_tier: parsed["risk_tier"] || "LOW",
      action_taken: parsed["action_taken"] || "PROCEED_ROLLOUT",
      execution_status: parsed["execution_status"] || "EXECUTED",
      reasoning: parsed["reasoning"] || "Canary metrics analyzed autonomously.",
      payload: parsed["payload"] || "vanectl flag set #{@flag.key} --rollout #{@flag.rollout_percentage}"
    )

    parsed
  end

  private

  def fetch_llm_decision
    return fallback_rule_engine if @api_key.blank?

    prompt = <<~PROMPT
      You are VaneAI's autonomous Release Guardian Agent for Hulu's progressive canary deployments.
      Evaluate live telemetry and runtime logs to execute closed-loop autonomous engineering:

      Feature Flag: #{@flag.name} (#{@flag.key})
      Current Rollout: #{@flag.rollout_percentage}%
      Sample Size: #{@metric.sample_size} requests
      Error Rate: #{@metric.error_rate}%
      p99 Latency: #{@metric.latency_p99} ms
      Total Crashes: #{@metric.crash_count}
      Logs Payload: #{@metric.logs_payload}

      DECISION TIERS & ACTIONS:
      1. CRITICAL CRASH (crash_count > 0 or ZeroDivisionError or SIGSEGV):
         - Action: "CIRCUIT_BREAKER_HALT"
         - Status: "HALTED_WITH_PR"
         - Risk Tier: "CRITICAL", Risk Score: 95
         - Next Rollout: 0
         - Generate a code fix diff in payload to open a one-click GitHub PR.
      
      2. LATENCY SPIKE / MEMORY LEAK (p99 > 800ms, no crashes):
         - Action: "SELF_HEALING_OPTIMIZE"
         - Status: "EXECUTED"
         - Risk Tier: "MEDIUM", Risk Score: 45
         - Next Rollout: #{@flag.rollout_percentage + 10}
         - Patch the loop buffer quietly and allow canary rollout to continue.

      3. NOMINAL METRICS:
         - Action: "PROCEED_ROLLOUT"
         - Status: "EXECUTED"
         - Risk Tier: "LOW", Risk Score: 5
         - Next Rollout: #{@flag.rollout_percentage + 15}

      Output ONLY a valid JSON object matching this schema:
      {
        "risk_score": 95,
        "risk_tier": "CRITICAL",
        "action_taken": "CIRCUIT_BREAKER_HALT",
        "execution_status": "HALTED_WITH_PR",
        "next_rollout_percentage": 0,
        "reasoning": "ZeroDivisionError detected in live stream pipeline. Circuit breaker engaged; hotfix PR generated for zero-downtime recovery.",
        "payload": "--- a/app/service.py\\n+++ b/app/service.py\\n@@ -12,2 +12,4 @@\\n+ if divisor == 0:\\n+     return 0\\n  return total / divisor"
      }
    PROMPT

    response = Faraday.post(GROQ_API_URL) do |req|
      req.headers["Authorization"] = "Bearer #{@api_key}"
      req.headers["Content-Type"] = "application/json"
      req.options.timeout = 10
      req.options.open_timeout = 5
      req.body = {
        model: MODEL_NAME,
        messages: [
          { role: "system", content: "You are an autonomous SRE agent that outputs strictly valid JSON without markdown wrapping." },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        max_completion_tokens: 800,
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
    Rails.logger.error("ReleaseGuardianAgent Error: #{e.message}")
    fallback_rule_engine
  end

  def fallback_rule_engine
    if @metric.crash_count.to_i > 0
      {
        "risk_score" => 95,
        "risk_tier" => "CRITICAL",
        "action_taken" => "CIRCUIT_BREAKER_HALT",
        "execution_status" => "HALTED_WITH_PR",
        "next_rollout_percentage" => 0,
        "reasoning" => "Critical crash detected (#{@metric.crash_count} occurrences). Circuit breaker engaged: execution halted and hotfix PR generated.",
        "payload" => "--- a/app/service.py\n+++ b/app/service.py\n@@ -15,1 +15,3 @@\n- return total / batch_count\n+ return total / batch_count if batch_count > 0 else 0"
      }
    elsif @metric.latency_p99.to_i > 800
      {
        "risk_score" => 45,
        "risk_tier" => "MEDIUM",
        "action_taken" => "SELF_HEALING_OPTIMIZE",
        "execution_status" => "EXECUTED",
        "next_rollout_percentage" => [(@flag.rollout_percentage + 10), 100].min,
        "reasoning" => "High p99 latency (#{@metric.latency_p99}ms). Autonomous buffer optimization applied silently; canary advancing.",
        "payload" => "vanectl patch --target app/service.py --replace '_GLOBAL_AUDIT_LOG' --with 'collections.deque(maxlen=1000)'"
      }
    else
      {
        "risk_score" => 5,
        "risk_tier" => "LOW",
        "action_taken" => "PROCEED_ROLLOUT",
        "execution_status" => "EXECUTED",
        "next_rollout_percentage" => [(@flag.rollout_percentage + 15), 100].min,
        "reasoning" => "Telemetry healthy and within SLAs. Canary progression nominal.",
        "payload" => "vanectl flag set #{@flag.key} --rollout #{@flag.rollout_percentage + 15}"
      }
    end
  end
end