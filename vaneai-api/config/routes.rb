Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :feature_flags do
        member do
          post :simulate_telemetry
          post :approve_rollback
        end
      end
    end
  end
end