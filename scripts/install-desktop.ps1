<#
.SYNOPSIS
为 DeepSeek Harness Desktop 安装或卸载 dsh-compact-activity。

.DESCRIPTION
复用 Desktop 自带的 Electron/Node 与 DSH CLI，并下载经过 SHA-256 校验的官方
pnpm 便携版。脚本不会修改 Desktop 安装目录，也不会手动编辑 DSH profile。

.PARAMETER DesktopRoot
DeepSeek Harness Desktop 安装目录，例如 D:\DSH\DeepSeek Harness。

.PARAMETER Proxy
下载 pnpm 使用的 HTTP(S) 代理。默认读取 HTTPS_PROXY 环境变量。

.PARAMETER Remove
卸载插件。省略时安装或更新插件。
#>

[CmdletBinding()]
param(
  [Parameter()]
  [string] $DesktopRoot,

  [Parameter()]
  [string] $Proxy = $env:HTTPS_PROXY,

  [Parameter()]
  [switch] $Remove
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$pluginName = 'dsh-compact-activity'
$pnpmVersion = '11.21.0'
$pnpmAssets = @{
  X64 = @{
    File = 'pnpm-win32-x64.zip'
    Sha256 = '6643043caa3b01c65c431039926a2af954326d5cefbdb4da7baceceb17f5051f'
  }
  ARM64 = @{
    File = 'pnpm-win32-arm64.zip'
    Sha256 = '694fbb992c1631983729887318fc26f0921ecc826655fcfa29514d470a6725d1'
  }
}

function Resolve-DesktopRoot {
  param([string] $RequestedRoot)

  $runningRoots = Get-Process -Name 'DeepSeek Harness' -ErrorAction SilentlyContinue |
    ForEach-Object {
      try {
        if ($_.Path) { Split-Path -Parent $_.Path }
      } catch {
        # 某些受保护进程不允许读取 Path；继续检查显式路径和常见安装位置。
      }
    }

  $programFilesX86 = [Environment]::GetEnvironmentVariable('ProgramFiles(x86)')
  $candidates = @(
    $RequestedRoot
    $env:DSH_DESKTOP_ROOT
    $runningRoots
    $(if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA 'Programs\DeepSeek Harness' })
    $(if ($env:ProgramFiles) { Join-Path $env:ProgramFiles 'DeepSeek Harness' })
    $(if ($programFilesX86) { Join-Path $programFilesX86 'DeepSeek Harness' })
  ) | Where-Object { $_ } | Select-Object -Unique

  foreach ($candidate in $candidates) {
    $resolved = Resolve-Path -LiteralPath $candidate -ErrorAction SilentlyContinue
    if (-not $resolved) { continue }

    $exe = Join-Path $resolved.Path 'DeepSeek Harness.exe'
    $cli = Join-Path $resolved.Path 'resources\host\node_modules\@deepseek-ai\dsh\lib\bin.js'
    if ((Test-Path -LiteralPath $exe -PathType Leaf) -and
        (Test-Path -LiteralPath $cli -PathType Leaf)) {
      return $resolved.Path
    }
  }

  throw @'
找不到 DeepSeek Harness Desktop。
请传入安装目录，例如：
  .\scripts\install-desktop.ps1 -DesktopRoot 'D:\DSH\DeepSeek Harness'
'@
}

function Assert-DesktopStopped {
  param([string] $DesktopExe)

  $running = Get-Process -Name 'DeepSeek Harness' -ErrorAction SilentlyContinue |
    Where-Object {
      try { $_.Path -eq $DesktopExe } catch { $false }
    }

  if ($running) {
    throw 'DeepSeek Harness Desktop 仍在运行。请从系统托盘完全退出后重新执行；脚本不会强制结束进程。'
  }
}

function Get-PortablePnpm {
  $nativeArchitecture = if ($env:PROCESSOR_ARCHITEW6432) {
    $env:PROCESSOR_ARCHITEW6432
  } else {
    $env:PROCESSOR_ARCHITECTURE
  }
  $architecture = switch ($nativeArchitecture.ToUpperInvariant()) {
    'AMD64' { 'X64' }
    'X64' { 'X64' }
    'ARM64' { 'ARM64' }
    default { $nativeArchitecture.ToUpperInvariant() }
  }
  $asset = $pnpmAssets[$architecture]
  if (-not $asset) {
    throw "不支持的 Windows 架构：$architecture。当前仅支持 X64 和 ARM64。"
  }

  $toolRoot = Join-Path $env:LOCALAPPDATA "$pluginName\tools\pnpm-$pnpmVersion-$architecture"
  $archive = Join-Path $toolRoot $asset.File
  $pnpmExe = Join-Path $toolRoot 'pnpm.exe'
  $pnpmEntry = Join-Path $toolRoot 'dist\pnpm.mjs'
  New-Item -ItemType Directory -Path $toolRoot -Force | Out-Null

  $archiveValid = (Test-Path -LiteralPath $archive -PathType Leaf) -and
    ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -eq $asset.Sha256)
  if ($archiveValid -and
      (Test-Path -LiteralPath $pnpmExe -PathType Leaf) -and
      (Test-Path -LiteralPath $pnpmEntry -PathType Leaf)) {
    return $pnpmExe
  }

  if (-not $archiveValid) {
    $download = "$archive.download"
    $url = "https://github.com/pnpm/pnpm/releases/download/v$pnpmVersion/$($asset.File)"
    for ($attempt = 1; $attempt -le 3; $attempt++) {
      try {
        if (Test-Path -LiteralPath $download) {
          Remove-Item -LiteralPath $download -Force
        }

        Write-Host "下载官方 pnpm $pnpmVersion 便携版（第 $attempt/3 次）..."
        $request = @{ Uri = $url; OutFile = $download; UseBasicParsing = $true }
        if ($Proxy) { $request.Proxy = $Proxy }
        Invoke-WebRequest @request

        $actualHash = (Get-FileHash -LiteralPath $download -Algorithm SHA256).Hash
        if ($actualHash -ne $asset.Sha256) {
          throw "pnpm 下载校验失败。期望 $($asset.Sha256)，实际 $actualHash。"
        }
        break
      } catch {
        if (Test-Path -LiteralPath $download) {
          Remove-Item -LiteralPath $download -Force
        }
        if ($attempt -eq 3) { throw }
        Write-Warning "下载失败，将重试：$($_.Exception.Message)"
      }
    }

    Move-Item -LiteralPath $download -Destination $archive -Force
  }

  # pnpm.exe 依赖压缩包内的 dist/；必须完整解压，不能只复制可执行文件。
  Expand-Archive -LiteralPath $archive -DestinationPath $toolRoot -Force
  if (-not (Test-Path -LiteralPath $pnpmExe -PathType Leaf) -or
      -not (Test-Path -LiteralPath $pnpmEntry -PathType Leaf)) {
    throw 'pnpm 压缩包缺少 pnpm.exe 或 dist/pnpm.mjs。'
  }

  return $pnpmExe
}

function Invoke-DesktopDsh {
  param(
    [string] $DesktopExe,
    [string] $CliEntry,
    [string] $PnpmExe,
    [string[]] $Arguments,
    [switch] $ShowOutput
  )

  $start = [System.Diagnostics.ProcessStartInfo]::new()
  $start.FileName = $DesktopExe
  $start.UseShellExecute = $false
  $start.CreateNoWindow = $true
  $start.RedirectStandardOutput = $true
  $start.RedirectStandardError = $true
  $start.EnvironmentVariables['ELECTRON_RUN_AS_NODE'] = '1'
  $start.EnvironmentVariables['PATH'] = "$(Split-Path -Parent $PnpmExe);$env:PATH"
  # Desktop exe 属于 GUI 子系统。直接调用不会可靠等待，因此使用 Process 获取退出码和输出。
  $processArguments = @('--expose-internals', $CliEntry) + $Arguments
  $start.Arguments = ($processArguments | ForEach-Object { '"' + $_.Replace('"', '\"') + '"' }) -join ' '

  $process = [System.Diagnostics.Process]::Start($start)
  if (-not $process) { throw '无法启动 Desktop 内置 DSH CLI。' }

  $stdoutTask = $process.StandardOutput.ReadToEndAsync()
  $stderrTask = $process.StandardError.ReadToEndAsync()
  $process.WaitForExit()
  $stdout = $stdoutTask.GetAwaiter().GetResult()
  $stderr = $stderrTask.GetAwaiter().GetResult()

  if ($stdout -and ($ShowOutput -or $process.ExitCode -ne 0)) {
    Write-Host $stdout.TrimEnd()
  }
  if ($stderr) { Write-Host $stderr.TrimEnd() }
  if ($process.ExitCode -ne 0) {
    throw "Desktop 内置 DSH CLI 执行失败，退出码 $($process.ExitCode)。"
  }

  return $stdout
}

$resolvedRoot = Resolve-DesktopRoot -RequestedRoot $DesktopRoot
$desktopExe = Join-Path $resolvedRoot 'DeepSeek Harness.exe'
$cliEntry = Join-Path $resolvedRoot 'resources\host\node_modules\@deepseek-ai\dsh\lib\bin.js'
Assert-DesktopStopped -DesktopExe $desktopExe
$pnpmExe = Get-PortablePnpm

$action = if ($Remove) { 'remove' } else { 'add' }
Write-Host "Desktop：$resolvedRoot"
Write-Host "操作：$action $pluginName"
Invoke-DesktopDsh -DesktopExe $desktopExe -CliEntry $cliEntry -PnpmExe $pnpmExe -Arguments @('plugin', '--profile', 'web', $action, $pluginName) -ShowOutput | Out-Null

$config = Invoke-DesktopDsh -DesktopExe $desktopExe -CliEntry $cliEntry -PnpmExe $pnpmExe -Arguments @('web', '--dump-config')
$configured = $config -match 'id:\s+ui-compact-activity' -and
  $config -match 'name:\s+dsh-compact-activity'

if ($Remove) {
  if ($configured) { throw '卸载命令成功，但插件仍存在于配置树。' }
  Write-Host '卸载完成。现在可以重新打开 DeepSeek Harness Desktop。'
} else {
  if (-not $configured) { throw '安装命令成功，但配置树中没有 ui-compact-activity。' }
  Write-Host '安装和配置验证完成。现在可以重新打开 DeepSeek Harness Desktop。'
}
