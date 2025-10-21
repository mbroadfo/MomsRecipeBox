# Fetch the instance ID of the bastion instance with Name tag 'bastion' and state 'running'
$instanceId = (aws ec2 describe-instances `
  --filters "Name=tag:Name,Values=bastion" "Name=instance-state-name,Values=running" `
  --query "Reservations[*].Instances[*].InstanceId" `
  --output text).Trim()

Write-Output "Bastion instance ID: $instanceId"

# Ensure AWS CLI can find the Session Manager plugin
$pluginPath = "C:\Program Files\Amazon\SessionManagerPlugin\bin\SessionManagerPlugin.exe"
$env:AWS_SSM_PLUGIN = $pluginPath

# Start the SSM port forwarding session using the ToRemoteHost document
aws ssm start-session `
  --target $instanceId `
  --document-name "AWS-StartPortForwardingSessionToRemoteHost" `
  --parameters file://ssm-port-forward.json
