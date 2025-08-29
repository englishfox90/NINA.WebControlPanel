# PowerShell script to add SessionWidget to dashboard configuration

# Get current configuration
$config = Invoke-RestMethod -Uri "http://localhost:3001/api/config" -Method GET

# Add SessionWidget to the widgets array
$sessionWidget = @{
    id = "session-widget"
    component = "SessionWidget"
    title = "Current Session"
    layout = @{
        i = "session-widget"
        x = 10
        y = 0
        w = 4
        h = 15
        minW = 3
        minH = 10
    }
}

$config.layout.widgets += $sessionWidget

# Convert to JSON and send back
$body = $config | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri "http://localhost:3001/api/config" -Method PUT -Body $body -ContentType "application/json"
