$ErrorActionPreference = 'Stop'

$envPath = 'frontend/.env'
if (!(Test-Path $envPath)) {
    throw 'frontend/.env not found'
}

$pairs = @{}
Get-Content $envPath | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
    $idx = $_.IndexOf('=')
    if ($idx -gt 0) {
        $k = $_.Substring(0, $idx).Trim()
        $v = $_.Substring($idx + 1).Trim().Trim('"')
        $pairs[$k] = $v
    }
}

$url = $pairs['REACT_APP_SUPABASE_URL']
$key = $pairs['REACT_APP_SUPABASE_SEC_KEY']
if (-not $url -or -not $key) {
    throw 'Supabase URL/key missing in frontend/.env'
}

$storageBase = ($url.TrimEnd('/') + '/storage/v1')
$headers = @{
    apikey = $key
    Authorization = ('Bearer ' + $key)
    'Content-Type' = 'application/json'
}

$buckets = Invoke-RestMethod -Method Get -Uri ($storageBase + '/bucket') -Headers $headers
if ($buckets -isnot [array]) { $buckets = @($buckets) }

$imgExt = 'jpg|jpeg|png|gif|webp|bmp|tiff|svg|heic|heif|avif'
$allImages = @()

foreach ($b in $buckets) {
    $bucketId = $b.id
    $queue = New-Object System.Collections.Generic.Queue[string]
    $visited = New-Object System.Collections.Generic.HashSet[string]
    $queue.Enqueue('')

    while ($queue.Count -gt 0) {
        $prefix = $queue.Dequeue()
        if (-not $visited.Add($prefix)) { continue }

        $offset = 0
        $limit = 1000
        while ($true) {
            $body = @{
                prefix = $prefix
                limit = $limit
                offset = $offset
                sortBy = @{ column = 'name'; order = 'asc' }
            } | ConvertTo-Json -Depth 5

            $endpoint = ('{0}/object/list/{1}' -f $storageBase, $bucketId)
            $rows = Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers -Body $body

            if ($null -eq $rows) { break }
            if ($rows -isnot [array]) { $rows = @($rows) }
            if ($rows.Count -eq 0) { break }

            foreach ($r in $rows) {
                if ($null -eq $r.id) {
                    $childPrefix = if ($prefix) { $prefix + $r.name + '/' } else { $r.name + '/' }
                    if (-not $visited.Contains($childPrefix)) { $queue.Enqueue($childPrefix) }
                }
                else {
                    $fullName = if ($prefix) { $prefix + $r.name } else { $r.name }
                    $mime = ($r.metadata.mimetype -as [string])
                    $size = 0L
                    if ($r.metadata -and $null -ne $r.metadata.size) {
                        [void][long]::TryParse(($r.metadata.size).ToString(), [ref]$size)
                    }

                    if (($fullName -match "(?i)\.($imgExt)$") -or ($mime -match '^image/')) {
                        $allImages += [pscustomobject]@{
                            bucket_id  = $bucketId
                            name       = $fullName
                            created_at = $r.created_at
                            size_bytes = [long]$size
                        }
                    }
                }
            }

            if ($rows.Count -lt $limit) { break }
            $offset += $limit
        }
    }
}

$cutoff = (Get-Date).AddMonths(-2)
$older = $allImages | Where-Object { try { (Get-Date $_.created_at) -lt $cutoff } catch { $false } }

$olderBytes = ($older | Measure-Object -Property size_bytes -Sum).Sum
if ($null -eq $olderBytes) { $olderBytes = 0 }

Write-Output ('DRY_RUN=TRUE')
Write-Output ('CUTOFF=' + $cutoff.ToString('yyyy-MM-dd'))
Write-Output ('OLDER_TOTAL_COUNT=' + $older.Count)
Write-Output ('OLDER_TOTAL_BYTES=' + [long]$olderBytes)
Write-Output ('OLDER_TOTAL_KB=' + [math]::Round(($olderBytes / 1KB), 2))
Write-Output ('OLDER_TOTAL_MB=' + [math]::Round(($olderBytes / 1MB), 2))

Write-Output 'OLDER_BY_MONTH_START'
$byMonth = $older |
    Group-Object { try { (Get-Date $_.created_at).ToString('yyyy-MM') } catch { 'unknown' } } |
    Sort-Object Name
foreach ($g in $byMonth) {
    $bytes = ($g.Group | Measure-Object -Property size_bytes -Sum).Sum
    if ($null -eq $bytes) { $bytes = 0 }
    Write-Output ("$($g.Name),count=$($g.Count),bytes=$([long]$bytes),kb=$([math]::Round(($bytes/1KB),2)),mb=$([math]::Round(($bytes/1MB),2))")
}
Write-Output 'OLDER_BY_MONTH_END'

Write-Output 'OLDER_BY_BUCKET_START'
$byBucket = $older | Group-Object bucket_id | Sort-Object Name
foreach ($g in $byBucket) {
    $bytes = ($g.Group | Measure-Object -Property size_bytes -Sum).Sum
    if ($null -eq $bytes) { $bytes = 0 }
    Write-Output ("$($g.Name),count=$($g.Count),bytes=$([long]$bytes),kb=$([math]::Round(($bytes/1KB),2)),mb=$([math]::Round(($bytes/1MB),2))")
}
Write-Output 'OLDER_BY_BUCKET_END'
