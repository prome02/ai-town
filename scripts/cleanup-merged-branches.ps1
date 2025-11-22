# PowerShell script to clean up merged branches
# Usage: .\cleanup-merged-branches.ps1 [-DryRun] [-Force] [-BranchPattern <pattern>]

param(
    [switch]$DryRun,
    [switch]$Force,
    [string]$BranchPattern = "",
    [int]$MaxBranches = 1000
)

# Check if we are in a git repository
if (-not (git rev-parse --git-dir 2>$null)) {
    Write-Error "Error: Not in a git repository"
    exit 1
}

Write-Host "Fetching latest branch information..." -ForegroundColor Yellow
git fetch --all

# Get all remote branches matching the pattern
Write-Host "Finding branches matching pattern '$BranchPattern' (max $MaxBranches branches)..." -ForegroundColor Yellow

# Get merged branches directly using git's native command with pattern matching
if ($BranchPattern) {
    $mergedBranches = @()
    $allBranches = @()
    
    # Use git for-each-ref for more reliable branch listing
    git for-each-ref --format='%(refname:short)' refs/remotes/origin/$BranchPattern* | ForEach-Object {
        $branch = $_.Trim()
        if ($branch -match "^origin/(.+)$") {
            $allBranches += $matches[1]
        }
    }
    
    git for-each-ref --format='%(refname:short)' --merged=origin/main refs/remotes/origin/$BranchPattern* | ForEach-Object {
        $branch = $_.Trim()
        if ($branch -match "^origin/(.+)$") {
            $mergedBranches += $matches[1]
        }
    }
}
else {
    # If no pattern specified, get all branches
    $mergedBranches = @()
    $allBranches = @()
    
    git for-each-ref --format='%(refname:short)' refs/remotes/origin | ForEach-Object {
        $branch = $_.Trim()
        if ($branch -match "^origin/(.+)$") {
            $allBranches += $matches[1]
        }
    }
    
    git for-each-ref --format='%(refname:short)' --merged=origin/main refs/remotes/origin | ForEach-Object {
        $branch = $_.Trim()
        if ($branch -match "^origin/(.+)$") {
            $mergedBranches += $matches[1]
        }
    }
}

# Remove duplicates
$mergedBranches = $mergedBranches | Select-Object -Unique
$allBranches = $allBranches | Select-Object -Unique

# Limit to max branches
if ($allBranches.Count -gt $MaxBranches) {
    $allBranches = $allBranches | Select-Object -First $MaxBranches
    $mergedBranches = $mergedBranches | Where-Object { $allBranches -contains $_ }
}

$branchCount = $allBranches.Count
$mergedCount = $mergedBranches.Count
$notMergedCount = $branchCount - $mergedCount

if ($branchCount -eq 0) {
    Write-Host "No branches found matching pattern '$BranchPattern'" -ForegroundColor Green
    exit 0
}

Write-Host "Found $branchCount branches matching pattern '$BranchPattern'" -ForegroundColor Yellow

# Identify merged branches
Write-Host "Checking which branches are merged to main..." -ForegroundColor Yellow

foreach ($branch in $allBranches) {
    if ($mergedBranches -contains $branch) {
        Write-Host "    $branch (merged)" -ForegroundColor Green
    }
    else {
        Write-Host "    $branch (not merged)" -ForegroundColor Red
    }
}

Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "  Total branches checked: $branchCount" -ForegroundColor White
Write-Host "  Merged branches: $mergedCount" -ForegroundColor Green
Write-Host "  Not merged branches: $notMergedCount" -ForegroundColor Red

if ($mergedCount -eq 0) {
    Write-Host "No merged branches found" -ForegroundColor Green
    exit 0
}

Write-Host "`nFound $mergedCount merged branches:" -ForegroundColor Yellow
$mergedBranches | ForEach-Object { Write-Host "  - $_" }

if ($DryRun) {
    Write-Host "`n[Dry Run] Complete - No actual deletion performed" -ForegroundColor Cyan
    exit 0
}

# Confirm deletion
if (-not $Force) {
    Write-Host "`nDo you want to delete these merged branches?" -ForegroundColor Yellow
    Write-Host "This will delete $($mergedBranches.Count) branches from the remote repository." -ForegroundColor Yellow
    $confirmation = Read-Host "Type 'yes' to confirm deletion, or press Enter to cancel"
    
    if ($confirmation -ne 'yes') {
        Write-Host "Operation cancelled" -ForegroundColor Yellow
        exit 0
    }
}

# Perform deletion
Write-Host "`nDeleting merged branches..." -ForegroundColor Yellow
$deletedCount = 0

foreach ($branch in $mergedBranches) {
    try {
        # Delete remote branch
        Write-Host "  Deleting remote branch: $branch" -ForegroundColor Gray
        git push origin --delete $branch 2>$null
        
        # Delete local tracking branch if it exists
        $localBranch = $branch -replace "origin/", ""
        if (git branch --list $localBranch) {
            Write-Host "  Deleting local branch: $localBranch" -ForegroundColor Gray
            git branch -d $localBranch 2>$null
        }
        
        $deletedCount++
        Write-Host "    $branch deleted" -ForegroundColor Green
    }
    catch {
        Write-Host "    $branch deletion failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nComplete! Deleted $deletedCount/$($mergedBranches.Count) branches" -ForegroundColor Green

# Clean up tracking branches
Write-Host "Cleaning up tracking branches..." -ForegroundColor Yellow
git remote prune origin

Write-Host "Cleanup complete!" -ForegroundColor Green