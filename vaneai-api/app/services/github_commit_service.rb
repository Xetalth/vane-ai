require "octokit"

class GithubCommitService
  def initialize(token:, repo_full_name:)
    # "github.com/org/repo" veya "org/repo" formatını temizle
    @repo = repo_full_name.to_s.sub(%r{\Ahttps?://github\.com/}, "").sub(%r{\Agithub\.com/}, "")
    @client = Octokit::Client.new(access_token: token)
  end

  def apply_hotfix(file_path:, new_content:, commit_message: "fix(guardrail): autonomous AI remediation hotfix")
    # 1. Deponun varsayılan dalını (default branch) bul
    repo_info = @client.repository(@repo)
    default_branch = repo_info.default_branch

    # 2. Varsayılan dalın son commit SHA'sını al
    base_ref = @client.ref(@repo, "heads/#{default_branch}")
    base_sha = base_ref.object.sha

    # 3. Hotfix için yeni bir dal (branch) türet
    branch_name = "vaneai-hotfix-#{Time.now.to_i}"
    @client.create_ref(@repo, "heads/#{branch_name}", base_sha)

    # 4. Dosya zaten varsa SHA'sını al (update için gerekir), yoksa yeni oluştur
    file_sha = nil
    begin
      existing_file = @client.contents(@repo, path: file_path, ref: branch_name)
      file_sha = existing_file.sha
    rescue Octokit::NotFound
      file_sha = nil
    end

    # 5. Dosyayı yeni dala commit'le
    commit_result = if file_sha
      @client.update_contents(@repo, file_path, commit_message, file_sha, new_content, branch: branch_name)
    else
      @client.create_contents(@repo, file_path, commit_message, new_content, branch: branch_name)
    end

    # 6. Otomatik bir Pull Request aç
    pr = @client.create_pull_request(
      @repo,
      default_branch,
      branch_name,
      "🤖 [VaneAI Hotfix] Autonomous Guardrail Patch",
      "### Autonomous Remediation\n\nVaneAI APM guardrail detected an anomaly and generated this automated patch.\n\n- **Target File:** `#{file_path}`\n- **Source Branch:** `#{branch_name}`\n- **Base Branch:** `#{default_branch}`"
    )

    {
      success: true,
      commit_sha: commit_result.commit.sha,
      branch: branch_name,
      pr_url: pr.html_url,
      pr_number: pr.number
    }
  rescue Octokit::Error => e
    { success: false, error: e.message }
  end
end