import { ResourceGroup } from "@cdktf/provider-azurerm/lib/resource-group";
import { StorageAccount } from "@cdktf/provider-azurerm/lib/storage-account";
import { StorageContainer } from "@cdktf/provider-azurerm/lib/storage-container";
import { StorageManagementPolicy } from "@cdktf/provider-azurerm/lib/storage-management-policy";
import { StorageTable } from "@cdktf/provider-azurerm/lib/storage-table";
import { Construct } from "constructs";

export interface ChatStorageAccountProps {
    uniquePrefix: string;
    resourceGroup: ResourceGroup;
}

export class ChatStorageAccountConstruct extends Construct {
    public readonly chatStorageAccount: StorageAccount;


    constructor(scope: Construct, id: string, props: ChatStorageAccountProps) {
        super(scope, id);
        this.chatStorageAccount = new StorageAccount(this, "chatStorageAccount", {
            name: props.uniquePrefix + "storageaccount",
            resourceGroupName: props.resourceGroup.name,
            location: props.resourceGroup.location,
            accountTier: "Standard",
            accountReplicationType: "LRS",
            staticWebsite: {
                indexDocument: "index.html",
                error404Document: "404.html"
            }
        })

        new StorageTable(this, "chatStorageTable", {
            name: "chatHistory",
            storageAccountName: this.chatStorageAccount.name,
        })

        new StorageTable(this, "userStorageTable", {
            name: "users",
            storageAccountName: this.chatStorageAccount.name,
        })

        new StorageContainer(this, "chatStorageBlob", {
            name: "voice",
            storageAccountName: this.chatStorageAccount.name,
            containerAccessType: "blob",
        })

        new StorageManagementPolicy(this, "StorageManagementPolicy", {
            storageAccountId: this.chatStorageAccount.id,
            rule: [{
                name: "DeleteOldBlobs",
                enabled: true,
                filters: {
                    blobTypes: ["blockBlob"],
                    prefixMatch: ["voice/*"]
                },
                actions: {
                    baseBlob: {
                        deleteAfterDaysSinceModificationGreaterThan: 1
                    }
                }
            }]
        });
    }
}