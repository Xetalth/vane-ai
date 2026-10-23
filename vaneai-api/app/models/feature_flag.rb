class FeatureFlag < ApplicationRecord
  has_many :canary_metrics, dependent: :destroy
  has_many :agent_audits, dependent: :destroy

  validates :key, presence: true, uniqueness: true
  validates :name, presence: true
end