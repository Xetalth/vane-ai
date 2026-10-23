class CreateAgentAudits < ActiveRecord::Migration[8.1]
  def change
    create_table :agent_audits do |t|
      t.references :feature_flag, null: false, foreign_key: true
      t.integer :risk_score
      t.string :risk_tier
      t.string :action_taken
      t.string :execution_status
      t.text :reasoning
      t.text :payload

      t.timestamps
    end
  end
end
