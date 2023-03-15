
Codespace


##Login and setup Azure CLI 

```
az login --use-device-code
az account set --subscription "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```


##Deployment


```
cdktf deploy --auto-approve
cdktf output --outputs-file-include-sensitive-outputs --outputs-file output.json
```

