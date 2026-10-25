module Api
  module V1
    class FeatureFlagsController < ApplicationController
      def index
        @flags = FeatureFlag.all.order(created_at: :desc)
        render json: @flags
      end

      def show
        @flag = FeatureFlag.find(params[:id])
        render json: @flag
      end

      def create
        # Organization yoksa oluşturur veya ilkini bağlar
        org = Organization.find_by(id: feature_flag_params[:organization_id]) || 
              Organization.first_or_create!(name: "Acme Cloud", slug: "acme-cloud")

        # traffic_allocation veya rollout_percentage uyuşmazlığını önlemek için temiz parametreler
        safe_params = feature_flag_params.except(:organization_id)
        @flag = FeatureFlag.new(safe_params)
        @flag.organization = org

        if @flag.save
          render json: @flag, status: :created
        else
          render json: { errors: @flag.errors.full_messages }, status: :unprocessable_entity
        end
      rescue => e
        render json: { error: e.message }, status: :internal_server_error
      end

      def update
        @flag = FeatureFlag.find(params[:id])
        if @flag.update(feature_flag_params)
          render json: @flag
        else
          render json: { errors: @flag.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def feature_flag_params
        params.require(:feature_flag).permit(
          :organization_id,
          :name,
          :key,
          :connected_repo,
          :code_context,
          :rollout_percentage,
          :status
        )
      end
    end
  end
end