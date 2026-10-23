class User < ApplicationRecord
  belongs_to :organization

  validates :email, presence: true, uniqueness: true
end