class AddDetailsToFeatureFlags < ActiveRecord::Migration[8.1]
  def change
    add_reference :feature_flags, :organization, null: false, foreign_key: true
    add_column :feature_flags, :connected_repo, :string
    add_column :feature_flags, :code_context, :text
  end
end
