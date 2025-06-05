# Fetch the instance ID of the bastion instance with Name tag 'bastion' and state 'running'
$instanceId = (aws ec2 describe-instances `
  --filters "Name=tag:Name,Values=bastion" "Name=instance-state-name,Values=running" `
  --query "Reservations[*].Instances[*].InstanceId" `
  --output text).Trim()

Write-Output $instanceId

# Start the SSM port forwarding session
aws ssm start-session `
  --target $instanceId `
  --document-name "AWS-StartPortForwardingSession" `
  --parameters '{\"portNumber\":[\"5432\"],\"localPortNumber\":[\"5432\"]}'
