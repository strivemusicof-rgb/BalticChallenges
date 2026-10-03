<#
.SYNOPSIS
  Runs the core loop against a live API: register -> home -> start -> fail far away -> complete on site -> delete account.
#>
param([string]$BaseUrl = "https://vps-1a18ee51.vps.ovh.net")

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Call([string]$Method, [string]$Path, $Body = $null, [string]$Token = $null) {
  $headers = @{}
  if ($Token) { $headers.Authorization = "Bearer $Token" }
  $params = @{ Method = $Method; Uri = "$BaseUrl$Path"; Headers = $headers }
  if ($null -ne $Body) {
    $params.ContentType = "application/json; charset=utf-8"
    $params.Body = [Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 5))
  }
  Invoke-RestMethod @params
}

function Check([bool]$Condition, [string]$Label) {
  if (-not $Condition) { throw "FAILED: $Label" }
  Write-Host "  ok  $Label" -ForegroundColor Green
}

$health = Call GET "/health"
Check ($health.status -eq "ok") "health"

$email = "smoke-$([guid]::NewGuid().ToString('N').Substring(0, 8))@example.com"
$session = Call POST "/v1/auth/register" @{ email = $email; password = "smoke-test-password"; displayName = "Smoke Test" }
$token = $session.tokens.accessToken
Check ($session.user.level.level -eq 1) "register returns a level-1 user"

try {
  $me = Call PATCH "/v1/me" @{ interests = @("history", "nature"); difficulty = "explorer"; countries = @("LV"); completeOnboarding = $true } $token
  Check ($me.user.onboarded) "onboarding saved"

  # Standing in Riga, about 75 km from Cēsis.
  $feed = Call GET "/v1/home?lat=56.9496&lng=24.1052" $null $token
  Check ($null -ne $feed.todaysChallenge) "home has a challenge of the day"
  Check ($feed.nearby.count -ge 1) "home lists nearby challenges ($($feed.nearby.count))"

  $cesis = (Call GET "/v1/challenges/visit-cesis-castle").challenge
  Check ($cesis.place.name -like "C*sis*") "challenge detail by slug"
  Check ($null -ne $cesis.safety) "challenge detail includes safety metadata"

  $null = Call POST "/v1/challenges/$($cesis.id)/start" @{} $token
  $now = (Get-Date).ToUniversalTime().ToString("o")

  $far = Call POST "/v1/challenges/$($cesis.id)/complete" @{ lat = 56.9496; lng = 24.1052; accuracyM = 8; isMocked = $false; recordedAt = $now } $token
  Check ($far.status -eq "rejected" -and $far.reason -eq "too_far") "completion from Riga is rejected: $($far.message)"

  $mock = Call POST "/v1/challenges/$($cesis.id)/complete" @{ lat = $cesis.place.lat; lng = $cesis.place.lng; accuracyM = 5; isMocked = $true; recordedAt = $now } $token
  Check ($mock.status -eq "rejected" -and $mock.reason -eq "mock_location") "mock location is rejected"

  $done = Call POST "/v1/challenges/$($cesis.id)/complete" @{ lat = $cesis.place.lat; lng = $cesis.place.lng; accuracyM = 12; isMocked = $false; recordedAt = $now } $token
  Check ($done.status -eq "completed") "completion on site succeeds"
  Check ($done.xpEarned -ge $cesis.xpReward) "earned $($done.xpEarned) XP (challenge $($done.challengeXp))"
  Check (@($done.unlocked | Where-Object id -eq "first-step").Count -eq 1) "First Step achievement unlocked"

  $mine = Call GET "/v1/me" $null $token
  Check ($mine.stats.challengesCompleted -eq 1) "profile stats count the completion"
  Check ($mine.user.level.xp -eq $done.level.xp) "XP ledger matches profile ($($mine.user.level.xp) XP, level $($mine.user.level.level))"

  $achievements = (Call GET "/v1/me/achievements" $null $token).achievements
  $castleHunter = $achievements | Where-Object id -eq "castle-hunter"
  Check ($castleHunter.progress.current -eq 1 -and $castleHunter.progress.target -eq 5) "Castle Hunter progress is 1/5"

  $collection = (Call GET "/v1/collections/discover-latvia" $null $token).collection
  Check ($collection.completed -eq 1) "Discover Latvia progress is 1/$($collection.total)"

  # --- Phase 2: streaks and goals ---
  Check ($mine.user.streak.current -eq 1) "streak started (1 day)"
  $goals = (Call GET "/v1/me/goals" $null $token).goals
  $weekly = $goals | Where-Object slug -eq "weekly-new-places"
  Check ($weekly.current -eq 1 -and $weekly.target -eq 3) "weekly goal 'Visit 3 new places' is 1/3"
  $feed = Call GET "/v1/home" $null $token
  Check (@($feed.goals).Count -ge 1 -and $feed.me.streak.current -eq 1) "home includes goals and streak"

  # --- Phase 3: social ---
  $legal = Invoke-WebRequest -UseBasicParsing "$BaseUrl/legal/privacy"
  Check ($legal.StatusCode -eq 200 -and $legal.Content -match "Privacy Policy") "privacy policy page"

  $otherEmail = "smoke-$([guid]::NewGuid().ToString('N').Substring(0, 8))@example.com"
  $other = Call POST "/v1/auth/register" @{ email = $otherEmail; password = "smoke-test-password"; displayName = "Smoke Friend" }
  $otherToken = $other.tokens.accessToken

  Add-Type -AssemblyName System.Drawing
  $bitmap = New-Object System.Drawing.Bitmap 320, 200
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::FromArgb(11, 92, 122))
  $graphics.Dispose()
  $photoPath = Join-Path ([IO.Path]::GetTempPath()) "baltic-smoke.png"
  $bitmap.Save($photoPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
  $upload = curl.exe -s -X POST -H "Authorization: Bearer $token" -F "file=@$photoPath;type=image/png" "$BaseUrl/v1/photos" | ConvertFrom-Json
  Remove-Item $photoPath
  Check ($upload.photo.url -like "*.jpg") "photo upload is re-encoded to JPEG"

  $post = (Call POST "/v1/posts" @{ body = "Smoke test at the castle"; photoIds = @($upload.photo.id); challengeId = $cesis.id } $token).post
  Check ($post.locationLabel -like "C*sis*" -and @($post.photos).Count -eq 1) "post created with photo and location label"

  try {
    $null = Call POST "/v1/posts" @{ body = "you are a f4ggot" } $token
    Check $false "text filter blocks slurs"
  } catch {
    Check ($_.Exception.Response.StatusCode.value__ -eq 400) "text filter blocks slurs"
  }

  $null = Call POST "/v1/users/$($session.user.id)/follow" @{} $otherToken
  $following = (Call GET "/v1/feed?scope=following" $null $otherToken).posts
  Check (@($following | Where-Object id -eq $post.id).Count -eq 1) "follower sees the post in the following feed"
  $liked = (Call POST "/v1/posts/$($post.id)/like" @{} $otherToken).post
  Check ($liked.likeCount -eq 1 -and $liked.likedByMe) "like counted"
  $null = Call POST "/v1/posts/$($post.id)/comments" @{ body = "Looks great!" } $otherToken
  $postNow = (Call GET "/v1/posts/$($post.id)" $null $token).post
  Check ($postNow.commentCount -eq 1) "comment counted"
  $profile = Call GET "/v1/users/$($session.user.id)" $null $otherToken
  Check ($profile.canView -and $profile.relationship.following -and $profile.stats.followers -eq 1) "public profile shows follow state"

  $board = Call GET "/v1/leaderboards?scope=global&period=week" $null $token
  Check ($board.me.score -ge $done.xpEarned) "weekly leaderboard ranks me (#$($board.me.rank), $($board.me.score) XP)"

  $null = Call POST "/v1/reports" @{ targetType = "post"; targetId = $post.id; reason = "spam" } $otherToken
  Check $true "report accepted"
  $null = Call POST "/v1/users/$($session.user.id)/block" @{} $otherToken
  try {
    $null = Call GET "/v1/posts/$($post.id)" $null $otherToken
    Check $false "blocked author's post is hidden"
  } catch {
    Check ($_.Exception.Response.StatusCode.value__ -eq 404) "blocked author's post is hidden"
  }

  try {
    $null = Call GET "/v1/admin/stats" $null $token
    Check $false "admin API is staff-only"
  } catch {
    Check ($_.Exception.Response.StatusCode.value__ -eq 403) "admin API is staff-only"
  }

  $refreshed = Call POST "/v1/auth/refresh" @{ refreshToken = $session.tokens.refreshToken }
  Check ($refreshed.tokens.refreshToken -ne $session.tokens.refreshToken) "refresh token rotates"
  try {
    $null = Call POST "/v1/auth/refresh" @{ refreshToken = $session.tokens.refreshToken }
    Check $false "reused refresh token is rejected"
  } catch {
    Check ($_.Exception.Response.StatusCode.value__ -eq 401) "reused refresh token is rejected"
  }
} finally {
  $null = Call DELETE "/v1/me" $null $token
  if ($otherToken) { $null = Call DELETE "/v1/me" $null $otherToken }
  Write-Host "  ok  test accounts deleted" -ForegroundColor Green
}

Write-Host "Smoke test passed against $BaseUrl" -ForegroundColor Green
