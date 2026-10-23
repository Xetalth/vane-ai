Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      post "auth/login", to: "auth#login"
      resources :feature_flags, only: [:index, :create, :show, :update]
      post "simulate", to: "simulations#create"
    end
  end
end