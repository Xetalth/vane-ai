class Organization < ApplicationRecord
  has_many :users, dependent: :destroy
  has_many :feature_flags, dependent: :destroy

  validates :name, presence: true
end