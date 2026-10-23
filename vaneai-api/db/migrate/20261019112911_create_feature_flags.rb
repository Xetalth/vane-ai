class CreateFeatureFlags < ActiveRecord::Migration[8.1]
  def change
    create_table :feature_flags do |t|
      t.string :name
      t.string :key
      t.text :description
      t.string :environment
      t.string :status
      t.integer :rollout_percentage

      t.timestamps
    end
  end
end
