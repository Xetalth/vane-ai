CanaryMetric.destroy_all if defined?(CanaryMetric)
AgentAudit.destroy_all if defined?(AgentAudit)
FeatureFlag.destroy_all
User.destroy_all
Organization.destroy_all

# Demo Şirket
org = Organization.create!(
  name: "Acme Cloud",
  cluster_region: "US-East (Virginia)"
)

# Demo Kullanıcı
User.create!(
  email: "demo@acme.com",
  password_digest: "secret",
  organization: org
)

# Demo Flagler (Kendi Kod Bloklarıyla)
FeatureFlag.create!([
  {
    organization: org,
    name: "Video Transcoder Engine v2",
    key: "video-transcoder-v2",
    description: "Next-gen low-latency transcoding pipeline for living room 4K clients.",
    environment: "production",
    status: "canary",
    rollout_percentage: 15,
    connected_repo: "github.com/acme/transcoder-service",
    code_context: "fn process_frame(buffer: &mut FrameBuffer) {\n    // Potential memory leak on living room 4K\n    let raw = buffer.as_ptr();\n    unsafe { libc::memcpy(raw, ...); }\n}"
  },
  {
    organization: org,
    name: "Realtime Bid Auction Gateway",
    key: "rt-bid-auction-gw",
    description: "Real-time programmatic ad targeting and auction engine.",
    environment: "production",
    status: "canary",
    rollout_percentage: 5,
    connected_repo: "github.com/acme/ad-gateway",
    code_context: "func HandleAuction(w http.ResponseWriter, r *http.Request) {\n    mu.Lock()\n    defer mu.Unlock()\n    // High latency lock contention under spike\n    time.Sleep(300 * time.Millisecond)\n}"
  },
  {
    organization: org,
    name: "AI Recommendation Ranker",
    key: "ai-rec-ranker-v1",
    description: "ML-driven personalized content carousel for logged-in users.",
    environment: "production",
    status: "canary",
    rollout_percentage: 50,
    connected_repo: "github.com/acme/ml-feed-ranker",
    code_context: "def rank_candidates(user_id, item_pool):\n    # Heavy vector dot-product without batching\n    scores = [compute_embedding(item) for item in item_pool]\n    return sorted(scores, reverse=True)"
  }
])

puts "Veritabani basariyla hazirlandi ve tohumlandi!"