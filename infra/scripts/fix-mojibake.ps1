# Fix mojibake (corrupted unicode glyphs) in source files.
#
# Strategy: byte-level search and replace. Each rule maps a corrupted
# byte sequence to the correct UTF-8 of the original character. Other
# bytes in the file are untouched, so files with isolated mojibake
# stay byte-for-byte identical except for the bad sequences.
#
# Rule names use ASCII identifiers (no unicode in the source) to
# stay parser-safe in Windows PowerShell 5.1, which can choke on
# inline non-BMP chars in single-quoted strings.

[CmdletBinding()]
param(
    [string[]] $Paths = @(
        'src\frontend\ulp-web\src',
        'src\backend',
        'docs',
        'README.md',
        'CONTRIBUTING.md',
        'DEVELOPER_SETUP.md',
        'CLAUDE.md'
    ),
    [string[]] $Extensions = @('.ts', '.html', '.scss', '.css', '.cs', '.md', '.json', '.sql'),
    [switch] $WhatIf
)

$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

# Each rule = a corrupted byte sequence (Bad) and what it should be (Good).
# Notes are ASCII-only labels.
$rules = @(
    @{ Bad = @(0xC3, 0x82, 0xC2, 0xB7);                         Good = @(0xC2, 0xB7);         Note = 'A-circumflex middle-dot to middle-dot' },
    @{ Bad = @(0xC3, 0xA2, 0xE2, 0x80, 0x94);                   Good = @(0xE2, 0x80, 0x94);   Note = 'em-dash' },
    @{ Bad = @(0xC3, 0xA2, 0xE2, 0x80, 0x93);                   Good = @(0xE2, 0x80, 0x93);   Note = 'en-dash' },
    @{ Bad = @(0xC3, 0xA2, 0xE2, 0x80, 0x99);                   Good = @(0xE2, 0x80, 0x99);   Note = 'right single quote' },
    @{ Bad = @(0xC3, 0xA2, 0xE2, 0x80, 0x98);                   Good = @(0xE2, 0x80, 0x98);   Note = 'left single quote' },
    @{ Bad = @(0xC3, 0xA2, 0xE2, 0x80, 0x9C);                   Good = @(0xE2, 0x80, 0x9C);   Note = 'left double quote' },
    @{ Bad = @(0xC3, 0xA2, 0xE2, 0x80, 0x9D);                   Good = @(0xE2, 0x80, 0x9D);   Note = 'right double quote' },
    @{ Bad = @(0xC3, 0xA2, 0xE2, 0x80, 0xA6);                   Good = @(0xE2, 0x80, 0xA6);   Note = 'ellipsis' },
    @{ Bad = @(0xC3, 0x82, 0xC2, 0xA0);                         Good = @(0xC2, 0xA0);         Note = 'no-break space' },
    @{ Bad = @(0xC3, 0xA2, 0xE2, 0x82, 0xAC, 0xE2, 0x80, 0xA2); Good = @(0xE2, 0x80, 0xA2);   Note = 'bullet' },
    @{ Bad = @(0xC3, 0xA2, 0xE2, 0x82, 0xAC, 0xC2, 0xBA);       Good = @(0xE2, 0x80, 0xBA);   Note = 'right single guillemet' },
    @{ Bad = @(0xC3, 0xA2, 0xE2, 0x82, 0xAC, 0xC2, 0xB9);       Good = @(0xE2, 0x80, 0xB9);   Note = 'left single guillemet' },
    @{ Bad = @(0xC3, 0xA2, 0xE2, 0x80, 0xA0, 0xE2, 0x80, 0x99); Good = @(0xE2, 0x86, 0x92);   Note = 'right arrow' },
    @{ Bad = @(0xC3, 0xA2, 0xE2, 0x80, 0xA0, 0xE2, 0x80, 0x98); Good = @(0xE2, 0x86, 0x90);   Note = 'left arrow' },
    @{ Bad = @(0xC3, 0xA2, 0xE2, 0x80, 0xA0, 0xE2, 0x80, 0x91); Good = @(0xE2, 0x86, 0x91);   Note = 'up arrow' },
    @{ Bad = @(0xC3, 0xA2, 0xE2, 0x80, 0xA0, 0xE2, 0x80, 0x93); Good = @(0xE2, 0x86, 0x93);   Note = 'down arrow' },
    @{ Bad = @(0xC3, 0x82, 0xC2, 0xAE);                         Good = @(0xC2, 0xAE);         Note = 'registered' },
    @{ Bad = @(0xC3, 0x82, 0xC2, 0xA9);                         Good = @(0xC2, 0xA9);         Note = 'copyright' },
    @{ Bad = @(0xC3, 0x82, 0xC2, 0xB0);                         Good = @(0xC2, 0xB0);         Note = 'degree' }
)

function Apply-Rules {
    param([byte[]] $Bytes)
    $hits = 0
    $current = [System.Collections.Generic.List[byte]]::new($Bytes.Length)
    $current.AddRange($Bytes)

    foreach ($rule in $rules) {
        $bad  = [byte[]] $rule.Bad
        $good = [byte[]] $rule.Good
        $bLen = $bad.Length
        $gLen = $good.Length

        $i = 0
        $newList = [System.Collections.Generic.List[byte]]::new($current.Count)
        while ($i -lt $current.Count) {
            $isMatch = $false
            if ($i + $bLen -le $current.Count) {
                $isMatch = $true
                for ($j = 0; $j -lt $bLen; $j++) {
                    if ($current[$i + $j] -ne $bad[$j]) { $isMatch = $false; break }
                }
            }
            if ($isMatch) {
                for ($j = 0; $j -lt $gLen; $j++) { [void]$newList.Add($good[$j]) }
                $i += $bLen
                $hits++
            } else {
                [void]$newList.Add($current[$i])
                $i++
            }
        }
        $current = $newList
    }

    return @{ Bytes = $current.ToArray(); Hits = $hits }
}

$fixedCount = 0
$skippedCount = 0
$totalScanned = 0
$totalReplacements = 0

foreach ($pathRel in $Paths) {
    $pathAbs = Join-Path $RepoRoot $pathRel
    if (-not (Test-Path $pathAbs)) { continue }
    $isFile = (Get-Item $pathAbs) -is [System.IO.FileInfo]

    $files = if ($isFile) { @(Get-Item $pathAbs) } else {
        Get-ChildItem -Path $pathAbs -Recurse -File | Where-Object {
            $Extensions -contains $_.Extension -and
            $_.FullName -notmatch '\\(node_modules|bin|obj|dist|\.angular)\\'
        }
    }
    foreach ($file in $files) {
        $totalScanned++
        $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
        $result = Apply-Rules -Bytes $bytes
        if ($result.Hits -eq 0) {
            $skippedCount++
            continue
        }
        if ($WhatIf) {
            Write-Output ('would-fix ({0,3} hits): {1}' -f $result.Hits, $file.FullName)
        } else {
            [System.IO.File]::WriteAllBytes($file.FullName, $result.Bytes)
            Write-Output ('fixed     ({0,3} hits): {1}' -f $result.Hits, $file.FullName)
        }
        $fixedCount++
        $totalReplacements += $result.Hits
    }
}

Write-Output ''
Write-Output ('Scanned: {0}  Fixed: {1}  Clean: {2}  Total replacements: {3}' -f $totalScanned, $fixedCount, $skippedCount, $totalReplacements)
