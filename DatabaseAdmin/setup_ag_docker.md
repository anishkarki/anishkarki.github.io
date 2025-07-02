# Installing Always On Availability Group in Docker [SQL Server]
```bash
apt install pacemaker crmsh resource-agents mssql-tools unixodbc-dev

docker exec -it sqlserver1 /bin/bash
apt update && apt install -y iputils-ping telnet
```

