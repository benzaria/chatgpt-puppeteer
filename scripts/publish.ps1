param(
    [switch]$force,
    [switch]$amend,

    [Parameter(ValueFromRemainingArguments = $true)]
    [string]$message
)

# Config
$remote = "https://benzaria@github.com/benzaria/ai-agent"

$rem_spl = $remote.Split('/')
$repo = $rem_spl.Get($rem_spl.Length - 1)

# Ensure we're in a git repo
git rev-parse --is-inside-work-tree 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Not inside a git repository"
    exit 1
}

# Detect current branch
$branch = git branch --show-current 2>$null
if (-not $branch) {
    Write-Error "Detached HEAD: cannot determine current branch"
    exit 1
}

$date = Get-Date -Format 'ddd dd/MM/yy - hh:mm tt'

$_force = $force ? '--force' : $null
$_message = $message ? "$message" : "push ``$repo`` **$date**"

git add .

if ($amend) { git commit --amend }
else { git commit -m $_message }

# Ensure origin exists
git remote get-url origin 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    git remote add origin $remote
}

# Pull & push on detected branch
if (-not $amend) { git pull origin $branch $_force }
git push origin $branch $_force
