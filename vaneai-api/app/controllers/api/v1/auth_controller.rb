module Api
  module V1
    class AuthController < ApplicationController
      skip_before_action :verify_authenticity_token, raise: false

      def login
        user = User.find_by(email: params[:email])

        # Demo ve sunum kolaylığı için basit doğrulama
        if user && (params[:password] == "secret" || user.password_digest.blank?)
          render json: {
            user: { id: user.id, email: user.email },
            organization: user.organization
          }, status: :ok
        else
          render json: { error: "Geçersiz kullanıcı adı veya şifre" }, status: :unauthorized
        end
      end
    end
  end
end