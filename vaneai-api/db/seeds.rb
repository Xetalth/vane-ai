puts "Seeding VaneAI feature flags for Hulu..."

AgentAudit.destroy_all
CanaryMetric.destroy_all
FeatureFlag.destroy_all

flag1 = FeatureFlag.create!(
  name: "HEVC UltraHD Video Codec v2",
  key: "hulu-hevc-streaming-v2",
  description: "Next-gen low-bandwidth high-efficiency video encoder for living room 4K clients.",
  environment: "production",
  status: "active",
  rollout_percentage: 15
)

flag2 = FeatureFlag.create!(
  name: "Dynamic Ad Insertion Pipeline",
  key: "hulu-ad-insertion-v3",
  description: "Real-time programmatic ad targeting engine during live stream transitions.",
  environment: "production",
  status: "active",
  rollout_percentage: 5
)

flag3 = FeatureFlag.create!(
  name: "Personalized Homepage Hero Carousel",
  key: "hulu-personalization-hero",
  description: "ML-driven personalized content carousel for logged-in US users.",
  environment: "production",
  status: "active",
  rollout_percentage: 50
)

puts "Seeded #{FeatureFlag.count} flags successfully."