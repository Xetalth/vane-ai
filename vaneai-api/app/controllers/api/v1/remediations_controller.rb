module Api
  module V1
    class RemediationsController < ApplicationController
      def apply
        feature_flag = FeatureFlag.find(params[:feature_flag_id])
        github_token = request.headers["X-GitHub-Token"] || params[:github_token]

        if github_token.blank?
          return render json: { error: "GitHub access token missing. Please authenticate first." }, status: :unauthorized
        end

        file_path = params[:file_path].presence || "app/service.py"
        patched_code = params[:patched_code]

        service = GithubCommitService.new(
          token: github_token,
          repo_full_name: feature_flag.connected_repo
        )

        result = service.apply_hotfix(
          file_path: file_path,
          new_content: patched_code
        )

        if result[:success]
          render json: {
            message: "Autonomous hotfix committed and Pull Request opened successfully.",
            data: result
          }, status: :ok
        else
          render json: { error: result[:error] }, status: :unprocessable_entity
        end
      end
    end
  end
end