# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_10_23_114454) do
  create_table "agent_audits", force: :cascade do |t|
    t.integer "feature_flag_id", null: false
    t.integer "risk_score"
    t.string "risk_tier"
    t.string "action_taken"
    t.string "execution_status"
    t.text "reasoning"
    t.text "payload"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["feature_flag_id"], name: "index_agent_audits_on_feature_flag_id"
  end

  create_table "canary_metrics", force: :cascade do |t|
    t.integer "feature_flag_id", null: false
    t.float "error_rate"
    t.integer "latency_p99"
    t.integer "crash_count"
    t.integer "sample_size"
    t.text "logs_payload"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["feature_flag_id"], name: "index_canary_metrics_on_feature_flag_id"
  end

  create_table "feature_flags", force: :cascade do |t|
    t.string "name"
    t.string "key"
    t.text "description"
    t.string "environment"
    t.string "status"
    t.integer "rollout_percentage"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "organization_id", null: false
    t.string "connected_repo"
    t.text "code_context"
    t.index ["organization_id"], name: "index_feature_flags_on_organization_id"
  end

  create_table "organizations", force: :cascade do |t|
    t.string "name"
    t.string "cluster_region"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "users", force: :cascade do |t|
    t.string "email"
    t.string "password_digest"
    t.integer "organization_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["organization_id"], name: "index_users_on_organization_id"
  end

  add_foreign_key "agent_audits", "feature_flags"
  add_foreign_key "canary_metrics", "feature_flags"
  add_foreign_key "feature_flags", "organizations"
  add_foreign_key "users", "organizations"
end
