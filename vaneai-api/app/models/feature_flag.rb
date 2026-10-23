class FeatureFlag < ApplicationRecord
  belongs_to :organization, optional: true

  validates :name, :key, presence: true
end 