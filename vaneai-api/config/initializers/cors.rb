Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allowed_origins = ENV.fetch("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173").split(",").map(&:strip)

  allow do
    origins(*allowed_origins)

    resource "*",
      headers: :any,
      methods: %i[get post put patch delete options head],
      expose: ["Authorization"],
      credentials: true
  end
end