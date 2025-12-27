Add-Type -AssemblyName System.Drawing

function Create-GradientIcon($size, $path) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
    
    # Create gradient
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(16, 163, 127),
        [System.Drawing.Color]::FromArgb(212, 165, 116),
        [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
    )
    
    # Multi-color blend
    $blend = New-Object System.Drawing.Drawing2D.ColorBlend(3)
    $blend.Colors = @(
        [System.Drawing.Color]::FromArgb(16, 163, 127),   # Green
        [System.Drawing.Color]::FromArgb(138, 180, 248),  # Blue
        [System.Drawing.Color]::FromArgb(212, 165, 116)   # Orange
    )
    $blend.Positions = @([float]0.0, [float]0.5, [float]1.0)
    $brush.InterpolationColors = $blend
    
    # Draw circle
    $margin = [int]($size * 0.02)
    $g.FillEllipse($brush, $margin, $margin, $size - $margin * 2 - 1, $size - $margin * 2 - 1)
    
    # Draw "P"
    $fontSize = [int]($size * 0.55)
    $font = New-Object System.Drawing.Font("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold)
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $center = $size / 2
    $g.DrawString("P", $font, $whiteBrush, $center, $center, $format)
    
    # Save
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Cleanup
    $font.Dispose()
    $whiteBrush.Dispose()
    $brush.Dispose()
    $g.Dispose()
    $bmp.Dispose()
    
    Write-Host "Created $path"
}

$iconsPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Create-GradientIcon 16 "$iconsPath\icons\icon16.png"
Create-GradientIcon 48 "$iconsPath\icons\icon48.png"
Create-GradientIcon 128 "$iconsPath\icons\icon128.png"

Write-Host "All icons created with gradient!" -ForegroundColor Green
