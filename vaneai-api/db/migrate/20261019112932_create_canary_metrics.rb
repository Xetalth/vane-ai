class CreateCanaryMetrics < ActiveRecord::Migration[8.1]
  def change
    create_table :canary_metrics do |t|
      t.references :feature_flag, null: false, foreign_key: true
      t.float :error_rate
      t.integer :latency_p99
      t.integer :crash_count
      t.integer :sample_size
      t.text :logs_payload

      t.timestamps
    end
  end
end
