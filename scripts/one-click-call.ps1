# Local one-click dialer for the CRM. Listens on 127.0.0.1 only.
# A tel: link fills the number in Phone Link and waits. This presses Call.
$ErrorActionPreference = 'Stop'
$port = 47821
$prefix = "http://127.0.0.1:$port/"

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class BdaCallWin {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
}
"@

function Test-CallName([string]$name) {
  if ([string]::IsNullOrWhiteSpace($name)) { return $false }
  if ($name -eq 'Call' -or $name -eq 'Chiama' -or $name -eq 'Anrufen' -or $name -eq 'Llamar') { return $true }
  if ($name -like 'Call *' -and $name -notlike 'Calls*') { return $true }
  return $false
}

function Get-PhoneWindows {
  $hits = @()
  $seen = @{}
  $root = [System.Windows.Automation.AutomationElement]::RootElement
  $all = $root.FindAll(
    [System.Windows.Automation.TreeScope]::Children,
    [System.Windows.Automation.Condition]::TrueCondition
  )
  foreach ($win in $all) {
    $name = ''
    try { $name = [string]$win.Current.Name } catch { continue }
    $match = $false
    foreach ($part in @('Phone Link', 'Your Phone')) {
      if ($name -like "*$part*") { $match = $true; break }
    }
    if (-not $match) { continue }
    $key = [string]$win.Current.NativeWindowHandle
    if ($seen.ContainsKey($key)) { continue }
    $seen[$key] = $true
    $hits += $win
  }
  return $hits
}

function Find-CallButton($window) {
  $types = @(
    [System.Windows.Automation.ControlType]::Button,
    [System.Windows.Automation.ControlType]::SplitButton,
    [System.Windows.Automation.ControlType]::Hyperlink,
    [System.Windows.Automation.ControlType]::Custom
  )
  foreach ($type in $types) {
    $cond = New-Object System.Windows.Automation.PropertyCondition(
      [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
      $type
    )
    $buttons = $window.FindAll([System.Windows.Automation.TreeScope]::Descendants, $cond)
    foreach ($button in $buttons) {
      $name = ''
      $enabled = $false
      try {
        $name = [string]$button.Current.Name
        $enabled = [bool]$button.Current.IsEnabled
      } catch { continue }
      if ($enabled -and (Test-CallName $name)) { return $button }
    }
  }
  return $null
}

function Invoke-CallButton($button) {
  try {
    $invoke = $button.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
    $invoke.Invoke()
    return $true
  } catch {}
  try {
    $legacy = $button.GetCurrentPattern([System.Windows.Automation.LegacyIAccessiblePattern]::Pattern)
    $legacy.DoDefaultAction()
    return $true
  } catch {}
  try {
    $rect = $button.Current.BoundingRectangle
    if ($rect.Width -lt 2 -or $rect.Height -lt 2) { return $false }
    $x = [int]($rect.X + ($rect.Width / 2))
    $y = [int]($rect.Y + ($rect.Height / 2))
    [BdaCallWin]::SetCursorPos($x, $y) | Out-Null
    Start-Sleep -Milliseconds 60
    [BdaCallWin]::mouse_event(0x0002, 0, 0, 0, 0)
    [BdaCallWin]::mouse_event(0x0004, 0, 0, 0, 0)
    return $true
  } catch {
    return $false
  }
}

function Send-EnterToPhone {
  $windows = @(Get-PhoneWindows)
  if (-not $windows.Count) { return }
  $hwnd = [IntPtr]::Zero
  try { $hwnd = [IntPtr]$windows[0].Current.NativeWindowHandle } catch { return }
  if ($hwnd -eq [IntPtr]::Zero) { return }
  [BdaCallWin]::ShowWindow($hwnd, 9) | Out-Null
  [BdaCallWin]::SetForegroundWindow($hwnd) | Out-Null
  Start-Sleep -Milliseconds 180
  if ([BdaCallWin]::GetForegroundWindow() -ne $hwnd) { return }
  [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
}

function Press-PhoneCall {
  for ($i = 0; $i -lt 16; $i++) {
    $windows = @(Get-PhoneWindows)
    foreach ($win in $windows) {
      $button = Find-CallButton $win
      if (-not $button) { continue }
      try {
        $hwnd = [IntPtr]$win.Current.NativeWindowHandle
        if ($hwnd -ne [IntPtr]::Zero) {
          [BdaCallWin]::ShowWindow($hwnd, 9) | Out-Null
          [BdaCallWin]::SetForegroundWindow($hwnd) | Out-Null
        }
      } catch {}
      if (Invoke-CallButton $button) { return $true }
    }
    Start-Sleep -Milliseconds 400
  }
  return $false
}

function Send-Json($context, [int]$code, $payload) {
  $json = $payload | ConvertTo-Json -Compress
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $response = $context.Response
  $response.StatusCode = $code
  $response.ContentType = 'application/json; charset=utf-8'
  $origin = [string]$context.Request.Headers['Origin']
  if ($origin -match '^https?://(localhost|127\.0\.0\.1)(:\d+)?$') {
    $response.Headers['Access-Control-Allow-Origin'] = $origin
  } else {
    $response.Headers['Access-Control-Allow-Origin'] = '*'
  }
  $response.Headers['Access-Control-Allow-Private-Network'] = 'true'
  $response.Headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
  $response.Headers['Access-Control-Allow-Headers'] = 'Content-Type'
  $response.Headers['Vary'] = 'Origin'
  $response.ContentLength64 = $bytes.Length
  $response.OutputStream.Write($bytes, 0, $bytes.Length)
  $response.OutputStream.Close()
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
try {
  $listener.Start()
} catch {
  exit 0
}

while ($listener.IsListening) {
  $context = $listener.GetContext()
  try {
    $method = $context.Request.HttpMethod
    $path = $context.Request.Url.AbsolutePath
    if ($method -eq 'OPTIONS') {
      $response = $context.Response
      $response.StatusCode = 204
      $origin = [string]$context.Request.Headers['Origin']
      if ($origin -match '^https?://(localhost|127\.0\.0\.1)(:\d+)?$') {
        $response.Headers['Access-Control-Allow-Origin'] = $origin
      } else {
        $response.Headers['Access-Control-Allow-Origin'] = '*'
      }
      $response.Headers['Access-Control-Allow-Private-Network'] = 'true'
      $response.Headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
      $response.Headers['Access-Control-Allow-Headers'] = 'Content-Type'
      $response.Headers['Vary'] = 'Origin'
      $response.ContentLength64 = 0
      $response.OutputStream.Close()
      continue
    }
    if ($method -eq 'GET' -and $path -eq '/health') {
      Send-Json $context 200 @{ ok = $true }
      continue
    }
    if ($method -ne 'POST' -or $path -ne '/dial') {
      Send-Json $context 404 @{ ok = $false; opened = $false; clicked = $false }
      continue
    }
    $reader = New-Object System.IO.StreamReader($context.Request.InputStream, [System.Text.Encoding]::UTF8)
    $body = $reader.ReadToEnd().Trim()
    $reader.Close()
    if ($body -notmatch '^tel:\+[0-9]{8,15}$') {
      Send-Json $context 400 @{ ok = $false; opened = $false; clicked = $false; detail = 'bad number' }
      continue
    }
    try {
      Start-Process $body
    } catch {
      Send-Json $context 200 @{ ok = $false; opened = $false; clicked = $false; detail = $_.Exception.Message }
      continue
    }
    $clicked = Press-PhoneCall
    if (-not $clicked) { Send-EnterToPhone }
    Send-Json $context 200 @{ ok = $true; opened = $true; clicked = [bool]$clicked }
  } catch {
    try { $context.Response.Abort() } catch {}
  }
}
