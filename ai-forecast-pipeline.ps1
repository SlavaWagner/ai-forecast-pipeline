# ai-forecast-pipeline.ps1 - Command Line Interface Forwarder
# Runs the Node.js CLI with parameters

# Forward all arguments directly
node "$PSScriptRoot\bin\index.js" $args
