<#
Retries provisioning an Always Free VM.Standard.A1.Flex instance on OCI until it succeeds.
Cycles through AD-1/AD-2/AD-3 each attempt and retries every 5 minutes on "Out of capacity" errors.
#>

$ErrorActionPreference = "Continue"

# --- Fixed config (confirmed via OCI CLI) ---
$CompartmentId = "ocid1.tenancy.oc1..aaaaaaaavgkw2svepw6wbypxssf7wnb3fwquccg3xeycgvnivwmim5dcgv7q"
$SubnetId      = "ocid1.subnet.oc1.phx.aaaaaaaagsvfpytcgxob65rpksltnhq3j6gnp4kxbpuzpweti6kufd2ae5yq"
$ImageId       = "ocid1.image.oc1.phx.aaaaaaaa7vbizz7iuzdhqg2hq3pl2m7afy6pnwn5vjb575gatzxpm3trpjsa"
$SshPublicKeyPath = "$env:USERPROFILE\.ssh\oci_main_server.pub"
$DisplayName   = "main-server"
$Shape         = "VM.Standard.A1.Flex"
$Ocpus         = 2
$MemoryInGBs   = 12
$RetryDelaySeconds = 60

$AvailabilityDomains = @(
    "XjUq:PHX-AD-1",
    "XjUq:PHX-AD-2",
    "XjUq:PHX-AD-3"
)

$OciExe = "C:\Users\hp\bin\oci.exe"
if (-not (Test-Path $OciExe)) { $OciExe = "oci" }

$LogFile = Join-Path $PSScriptRoot "oci-provision-retry.log"

# Written once; passed to --shape-config via file:// to avoid native-arg quoting issues with embedded JSON quotes.
$ShapeConfigFile = Join-Path $PSScriptRoot "oci-shape-config.json"
@{ ocpus = $Ocpus; memoryInGBs = $MemoryInGBs } | ConvertTo-Json -Compress | Set-Content -Path $ShapeConfigFile -Encoding ascii
$ShapeConfigArg = "file://$ShapeConfigFile"

function Write-Log {
    param([string]$Message)
    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Write-Output $line
    for ($i = 0; $i -lt 5; $i++) {
        try {
            Add-Content -Path $LogFile -Value $line -ErrorAction Stop
            return
        } catch {
            Start-Sleep -Milliseconds 200
        }
    }
}

if (-not (Test-Path $SshPublicKeyPath)) {
    Write-Log "ERROR: SSH public key not found at $SshPublicKeyPath"
    exit 1
}

Write-Log "Starting provisioning retry loop for '$DisplayName' ($Shape, $Ocpus OCPUs, ${MemoryInGBs}GB)."
Write-Log "Will cycle through: $($AvailabilityDomains -join ', ')"

$attempt = 0
$success = $false

while (-not $success) {
    $ad = $AvailabilityDomains[$attempt % $AvailabilityDomains.Count]
    $attempt++

    Write-Log "Attempt #$attempt - trying $ad ..."

    try {
        $output = & $OciExe compute instance launch `
            --compartment-id $CompartmentId `
            --availability-domain $ad `
            --shape $Shape `
            --shape-config $ShapeConfigArg `
            --subnet-id $SubnetId `
            --image-id $ImageId `
            --display-name $DisplayName `
            --ssh-authorized-keys-file $SshPublicKeyPath `
            --assign-public-ip true `
            --wait-for-state RUNNING `
            --output json 2>&1

        $exitCode = $LASTEXITCODE

        if ($exitCode -eq 0) {
            Write-Log "SUCCESS: Instance created and RUNNING in $ad on attempt #$attempt."
            $success = $true

            $instanceJson = $output | Out-String | ConvertFrom-Json
            $instanceId = $instanceJson.data.id
            Write-Log "Instance OCID: $instanceId"

            Write-Log "Fetching public IP address..."
            $vnicAttachments = & $OciExe compute vnic-attachment list --compartment-id $CompartmentId --instance-id $instanceId --output json | ConvertFrom-Json
            $vnicId = $vnicAttachments.data[0].'vnic-id'
            $vnic = & $OciExe network vnic get --vnic-id $vnicId --output json | ConvertFrom-Json
            $publicIp = $vnic.data.'public-ip'

            Write-Log "=============================================="
            Write-Log " INSTANCE READY"
            Write-Log " Display name: $DisplayName"
            Write-Log " Availability domain: $ad"
            Write-Log " Public IP: $publicIp"
            Write-Log " SSH: ssh -i `"$env:USERPROFILE\.ssh\oci_main_server`" ubuntu@$publicIp"
            Write-Log "=============================================="

            break
        }

        $outputText = $output | Out-String

        if ($outputText -match "OutOfCapacity|Out of host capacity|LimitExceeded") {
            Write-Log "Attempt #$attempt failed: Out of capacity in $ad. Will retry in $($RetryDelaySeconds / 60) minutes."
        } elseif ($outputText -match "timed out|RequestException|ServiceError|ConnectionError") {
            $firstLine = ($outputText -split "`r?`n")[0]
            Write-Log "Attempt #$attempt failed: transient network/service error in $ad ($firstLine). Will retry in $($RetryDelaySeconds / 60) minutes."
        } else {
            Write-Log "Attempt #$attempt failed with unexpected error:"
            Write-Log $outputText
            Write-Log "Will retry in $($RetryDelaySeconds / 60) minutes anyway (transient errors are common)."
        }
    } catch {
        Write-Log "Attempt #$attempt threw an exception: $($_.Exception.Message)"
        Write-Log "Will retry in $($RetryDelaySeconds / 60) minutes anyway."
    }

    Start-Sleep -Seconds $RetryDelaySeconds
}

Write-Log "Retry loop finished."
