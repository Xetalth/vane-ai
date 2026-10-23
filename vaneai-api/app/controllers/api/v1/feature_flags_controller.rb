module Api
  module V1
    class FeatureFlagsController < ApplicationController
      skip_before_action :verify_authenticity_token, raise: false

      def index
        if params[:organization_id].present?
          @flags = FeatureFlag.where(organization_id: params[:organization_id]).order(created_at: :desc)
        else
          @flags = FeatureFlag.all.order(created_at: :desc)
        end
        render json: @flags
      end

      def create
        @flag = FeatureFlag.new(feature_flag_params)
        @flag.status ||= "canary"
        @flag.traffic_allocation ||= 5

        if @flag.save
          render json: @flag, status: :created
        else
          render json: { errors: @flag.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def feature_flag_params
        params.require(:feature_flag).permit(
          :name, :key, :description, :environment, 
          :rollout_percentage, :status, :organization_id, 
          :connected_repo, :code_context
        )
      end
    end
  end
end