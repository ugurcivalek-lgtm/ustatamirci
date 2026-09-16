# PowerShell script to parse raw_ocr.txt into clean JSON
$lines = Get-Content -Path "C:\Users\Pc\Desktop\Kombi-Klima-Servis\raw_ocr.txt" -Encoding UTF8

$customers = @()
$devices = @()
$services = @()

$idCounter = 1

$districtKeywords = @(
    "Bayrampaşa", "Eyüp", "Eyüpsultan", "Gaziosmanpaşa", "Fatih", "Sultangazi", 
    "Kağıthane", "Esenler", "Şişli", "Beyoğlu", "Beşiktaş", "Bağcılar", 
    "Güngören", "Zeytinburnu", "Küçükçekmece", "Bahçelievler", "okmeydanı", 
    "küçükköy", "kumkapı", "yeşilpınar", "kemerburgaz", "güneşli", "edirnekapı"
)

function NormalizeDistrict($raw) {
    if (!$raw) { return "Eyüpsultan" }
    $low = $raw.ToLower()
    if ($low -match "bayrampa") { return "Bayrampaşa" }
    if ($low -match "eyüp" -or $low -match "eyup" -or $low -match "yeşilpınar" -or $low -match "kemerburgaz") { return "Eyüpsultan" }
    if ($low -match "gaziosman" -or $low -match "küçükköy") { return "Gaziosmanpaşa" }
    if ($low -match "fatih" -or $low -match "kumkapı" -or $low -match "edirnekapı") { return "Fatih" }
    if ($low -match "sultangazi") { return "Sultangazi" }
    if ($low -match "kağıt" -or $low -match "kagit" -or $low -match "okmeydanı") { return "Kağıthane" }
    if ($low -match "esenler") { return "Esenler" }
    if ($low -match "şişli" -or $low -match "sisli") { return "Şişli" }
    if ($low -match "beyoğlu" -or $low -match "beyoglu") { return "Beyoğlu" }
    if ($low -match "beşiktaş" -or $low -match "besiktas") { return "Beşiktaş" }
    if ($low -match "bağcılar" -or $low -match "bagcilar" -or $low -match "güneşli") { return "Bağcılar" }
    if ($low -match "güngören" -or $low -match "gungoren") { return "Güngören" }
    if ($low -match "zeytinburnu") { return "Zeytinburnu" }
    if ($low -match "küçükçekmece" -or $low -match "kucukcekmece") { return "Küçükçekmece" }
    if ($low -match "bahçelievler" -or $low -match "bahcelievler") { return "Bahçelievler" }
    return "Eyüpsultan"
}

function ExtractNeighborhood($address) {
    if ($address -match "([A-Za-zÇĞİÖŞÜçğıöşü\s0-9\.]+)\s+(MAH|MH|MAHALLE)") {
        $m = $matches[1].Trim()
        # Clean leading words
        $words = $m -split "\s+"
        if ($words.Count -gt 2) {
            return ($words[-2..-1] -join " ").Trim()
        }
        return $m.Trim()
    }
    return ""
}

foreach ($line in $lines) {
    $trimmed = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed)) { continue }

    # Find phone: 0[25]\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2} or 0\d{9,10} or 0
    if ($trimmed -match "^(.+?)\s+(0[1-9]\d{1,2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}|0[1-9]\d{8,9}|0)\s+(.+)$") {
        $name = $matches[1].Trim()
        $phone = $matches[2].Trim()
        $rest = $matches[3].Trim()

        # Format phone nicely
        $cleanPhone = $phone -replace "\D", ""
        if ($cleanPhone.Length -eq 11 -and $cleanPhone.StartsWith("0")) {
            $formattedPhone = "{0} {1} {2} {3}" -f $cleanPhone.Substring(0,4), $cleanPhone.Substring(4,3), $cleanPhone.Substring(7,2), $cleanPhone.Substring(9,2)
        } elseif ($cleanPhone.Length -eq 10) {
            $formattedPhone = "0{0} {1} {2} {3}" -f $cleanPhone.Substring(0,3), $cleanPhone.Substring(3,3), $cleanPhone.Substring(6,2), $cleanPhone.Substring(8,2)
        } else {
            $formattedPhone = $phone
        }

        # Find device type
        $devType = "kombi"
        if ($rest -match "(?i)klima") {
            $devType = "klima"
        } elseif ($rest -match "(?i)soba|dgs") {
            $devType = "soba"
        } elseif ($rest -match "(?i)hidrofor") {
            $devType = "hidrofor"
        } elseif ($rest -match "(?i)petek") {
            $devType = "kombi"
        }

        # Find district
        $foundDistrict = "Eyüpsultan"
        $address = $rest
        $fault = "Arıza Bildirimi"

        foreach ($dk in $districtKeywords) {
            if ($rest -match "(?i)\b$dk\b") {
                $foundDistrict = NormalizeDistrict($dk)
                # Split fault and address
                $idx = $rest.IndexOf($dk, [System.StringComparison]::OrdinalIgnoreCase)
                if ($idx -gt 0) {
                    $faultPart = $rest.Substring(0, $idx).Trim()
                    $addrPart = $rest.Substring($idx + $dk.Length).Trim()
                    
                    # Clean fault
                    $faultClean = $faultPart -replace "(?i)^(kombi|petek \+ kombi|petek|girilmemis|doğalgaz sobası|hidrofor|klima|dgs)\s*", ""
                    if (![string]::IsNullOrWhiteSpace($faultClean)) {
                        $fault = $faultClean
                    }
                    $address = $addrPart
                }
                break
            }
        }

        $neighborhood = ExtractNeighborhood($address)
        if ([string]::IsNullOrWhiteSpace($address)) {
            $address = "$foundDistrict Merkez"
        }

        $custId = "cust-$idCounter"
        $devId = "dev-$idCounter"
        $srvId = "srv-$idCounter"
        $slipNo = "SRV-2026-" + $idCounter.ToString("000")

        $customers += [PSCustomObject]@{
            id = $custId
            name = $name
            phone = $formattedPhone
            city = "İstanbul"
            district = $foundDistrict
            neighborhood = $neighborhood
            address = $address
            notes = ""
            createdAt = "2026-09-01"
        }

        $devices += [PSCustomObject]@{
            id = $devId
            customerId = $custId
            type = if ($devType -eq "klima") { "klima" } else { "kombi" }
            brand = "DemirDöküm"
            model = if ($devType -eq "klima") { "Inverter" } else { "Premix" }
        }

        $services += [PSCustomObject]@{
            id = $srvId
            slipNo = $slipNo
            customerId = $custId
            deviceId = $devId
            date = "2026-09-15"
            appointmentTime = "14:00"
            status = "pending"
            faultDescription = $fault
            actionTaken = ""
            parts = @()
            partsTotal = 0
            laborCost = 0
            totalAmount = 0
            paidAmount = 0
            remainingAmount = 0
            paymentMethod = "Nakit"
            isMaintenance = $fault.ToLower().Contains("bakım")
            completedAt = $null
        }

        $idCounter++
    }
}

Write-Host "Toplam ayrıştırılan müşteri sayısı: $($customers.Count)"

$fullData = [PSCustomObject]@{
    settings = [PSCustomObject]@{
        businessName = "ustatamirci"
        ownerName = "Usta Tamirci Teknik Servis"
        phone = "0532 000 00 00"
        email = "destek@ustatamirci.com"
        address = "İstanbul"
        taxInfo = ""
        warrantyMonths = 12
        serviceTerms = "Değiştirilen orijinal yedek parçalar 1 yıl ustatamirci garantisi altındadır."
    }
    customers = $customers
    devices = $devices
    services = $services
}

$json = $fullData | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText("C:\Users\Pc\Desktop\Kombi-Klima-Servis\imported_data.json", $json, [System.Text.Encoding]::UTF8)
Write-Host "imported_data.json başarıyla oluşturuldu!"
