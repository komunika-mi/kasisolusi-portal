<#
.SYNOPSIS
  Pasang secrets dan variabel GitHub Actions untuk berita otomatis Kasisolusi.

.DESCRIPTION
  Dijalankan PEMILIK repo sendiri, di komputernya sendiri, dengan GitHub CLI (gh) yang sudah login.
  Kunci API diketik lewat Read-Host -AsSecureString (tidak tampil di layar) lalu dikirim ke
  `gh secret set` lewat stdin TANPA baris baru di ujungnya. Kunci tidak pernah ditulis ke berkas,
  tidak masuk riwayat PowerShell, dan tidak muncul di baris perintah proses.

  Catatan: pipe PowerShell biasa ($nilai | gh ...) menambahkan CRLF di ujung nilai, dan nilai
  rahasia jadi salah tanpa terlihat. Karena itu stdin ditulis langsung lewat .NET Process.
  Jebakan kedua (diuji 15 Nov 2026 di Windows PowerShell 5.1): penulis stdin bawaan .NET Framework
  langsung mengirim BOM UTF-8 (3 byte) begitu proses dimulai bila Console.InputEncoding UTF-8.
  Karena itu InputEncoding diganti sementara ke UTF-8 tanpa BOM saat proses gh dimulai.

.PARAMETER Repo
  Nama repo GitHub, misalnya pemilik/kasisolusi-portal.

.PARAMETER Status
  Nilai variabel OTOMASI_BERITA (kill switch): 'mati' (bawaan, tidak menerbitkan apa pun) atau
  'aktif' (mulai menerbitkan sesuai jadwal).

.PARAMETER Model
  Opsional. Nilai variabel OPENROUTER_MODEL, misalnya deepseek/deepseek-v4.1-flash.
  Beberapa id boleh dipisah koma; yang pertama dipakai lebih dulu.

.PARAMETER SiteOrigin
  Opsional. Nilai variabel SITE_ORIGIN untuk tautan di kabar Telegram, misalnya
  https://kasisolusi.co.id. Kosong = alamat bawaan situs.

.PARAMETER HanyaVariabel
  Lewati pertanyaan secrets; hanya pasang variabel (misalnya untuk menyalakan/mematikan saklar).

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File otomasi\pasang-secrets.ps1 -Repo pemilik/kasisolusi-portal

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File otomasi\pasang-secrets.ps1 -Repo pemilik/kasisolusi-portal -HanyaVariabel -Status aktif
#>
param(
  [Parameter(Mandatory = $true)][string]$Repo,
  [ValidateSet('mati', 'aktif')][string]$Status = 'mati',
  [string]$Model = '',
  [string]$SiteOrigin = '',
  [switch]$HanyaVariabel
)
$ErrorActionPreference = 'Stop'

if ($Repo -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$') { throw "Format -Repo harus pemilik/nama-repo (diterima: $Repo)" }

$gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $gh) { throw 'GitHub CLI (gh) belum terpasang. Pasang dari https://cli.github.com lalu jalankan: gh auth login' }
$ghExe = $gh.Source

function Jalankan-Gh([string[]]$Argumen) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $ghExe
  $psi.Arguments = ($Argumen | ForEach-Object { if ($_ -match '\s') { '"' + $_ + '"' } else { $_ } }) -join ' '
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $p = [System.Diagnostics.Process]::Start($psi)
  $keluar = $p.StandardOutput.ReadToEnd()
  $galat = $p.StandardError.ReadToEnd()
  $p.WaitForExit()
  return @{ Kode = $p.ExitCode; Keluar = $keluar; Galat = $galat }
}

$cek = Jalankan-Gh @('auth', 'status', '--hostname', 'github.com')
if ($cek.Kode -ne 0) { throw 'gh belum login. Jalankan dulu: gh auth login' }
$cek = Jalankan-Gh @('repo', 'view', $Repo, '--json', 'nameWithOwner')
if ($cek.Kode -ne 0) { throw "Repo $Repo tidak ditemukan, atau akun gh ini tidak punya akses ke sana." }

function Kirim-Rahasia([string]$Nama, [System.Security.SecureString]$Nilai) {
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Nilai)
  $polos = $null
  try {
    $polos = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr).Trim()
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $ghExe
    $psi.Arguments = "secret set $Nama --repo $Repo"
    $psi.UseShellExecute = $false
    $psi.RedirectStandardInput = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $encLama = [Console]::InputEncoding
    try {
      # Tanpa ini .NET Framework menulis BOM UTF-8 ke stdin gh, dan secret tersimpan dengan 3 byte asing di depan.
      [Console]::InputEncoding = New-Object System.Text.UTF8Encoding $false
    }
    catch {
      throw 'Tidak bisa mengatur encoding konsol ke UTF-8 tanpa BOM; jalankan skrip ini dari jendela PowerShell biasa.'
    }
    try { $p = [System.Diagnostics.Process]::Start($psi) }
    finally { [Console]::InputEncoding = $encLama }
    $p.StandardInput.Write($polos)   # Write, bukan WriteLine: tanpa baris baru di ujung
    $p.StandardInput.Close()
    $null = $p.StandardOutput.ReadToEnd()
    $galat = $p.StandardError.ReadToEnd()
    $p.WaitForExit()
    if ($p.ExitCode -ne 0) { throw "gh secret set $Nama gagal: $galat" }
    Write-Host "  $Nama terpasang." -ForegroundColor Green
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    $polos = $null
  }
}

Write-Host ''
Write-Host "Repo: $Repo"
if (-not $HanyaVariabel) {
  Write-Host 'Ketik atau tempel tiap kunci lalu Enter. Isinya tidak tampil di layar.'
  Write-Host 'Enter tanpa isi = lewati (secret lama, kalau ada, tetap dipakai).'
  Write-Host ''
  $daftar = @(
    @{ Nama = 'OPENROUTER_API_KEY'; Wajib = $true; Ket = 'kunci OpenRouter, untuk menulis artikel (WAJIB)' },
    @{ Nama = 'OPENAI_API_KEY'; Wajib = $false; Ket = 'kunci OpenAI, untuk ilustrasi gpt-image-1 (lewati = Pollinations saja)' },
    @{ Nama = 'TELEGRAM_BOT_TOKEN'; Wajib = $false; Ket = 'token bot Telegram untuk kabar tiap putaran (opsional)' },
    @{ Nama = 'TELEGRAM_CHAT_ID'; Wajib = $false; Ket = 'id chat Telegram tujuan kabar (opsional, berpasangan dengan token)' }
  )
  foreach ($s in $daftar) {
    $nilai = Read-Host -AsSecureString "$($s.Nama) - $($s.Ket)"
    if ($nilai.Length -eq 0) {
      if ($s.Wajib) { Write-Host "  $($s.Nama) dilewati. Tanpa kunci ini pipeline tidak menerbitkan apa pun." -ForegroundColor Yellow }
      else { Write-Host "  $($s.Nama) dilewati." }
      continue
    }
    Kirim-Rahasia $s.Nama $nilai
    $nilai.Dispose()
  }
}

Write-Host ''
$h = Jalankan-Gh @('variable', 'set', 'OTOMASI_BERITA', '--repo', $Repo, '--body', $Status)
if ($h.Kode -ne 0) { throw "gh variable set OTOMASI_BERITA gagal: $($h.Galat)" }
Write-Host "  OTOMASI_BERITA = $Status" -ForegroundColor Green
if ($Model) {
  $h = Jalankan-Gh @('variable', 'set', 'OPENROUTER_MODEL', '--repo', $Repo, '--body', $Model)
  if ($h.Kode -ne 0) { throw "gh variable set OPENROUTER_MODEL gagal: $($h.Galat)" }
  Write-Host "  OPENROUTER_MODEL = $Model" -ForegroundColor Green
}
if ($SiteOrigin) {
  $h = Jalankan-Gh @('variable', 'set', 'SITE_ORIGIN', '--repo', $Repo, '--body', $SiteOrigin)
  if ($h.Kode -ne 0) { throw "gh variable set SITE_ORIGIN gagal: $($h.Galat)" }
  Write-Host "  SITE_ORIGIN = $SiteOrigin" -ForegroundColor Green
}

Write-Host ''
Write-Host 'Secrets yang terpasang (hanya nama, nilainya memang tidak bisa dibaca kembali):'
Write-Host (Jalankan-Gh @('secret', 'list', '--repo', $Repo)).Keluar
Write-Host 'Variabel:'
Write-Host (Jalankan-Gh @('variable', 'list', '--repo', $Repo)).Keluar
if ($Status -eq 'mati') {
  Write-Host 'Saklar masih MATI. Coba dulu uji kering: Actions > Berita otomatis > Run workflow (kering dicentang).'
  Write-Host "Kalau hasilnya sudah sesuai, nyalakan: ...\pasang-secrets.ps1 -Repo $Repo -HanyaVariabel -Status aktif"
}
