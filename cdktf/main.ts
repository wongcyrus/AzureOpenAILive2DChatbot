import { Construct } from "constructs";
import { App, Fn, TerraformOutput, TerraformStack } from "cdktf";
import { AzurermProvider } from "@cdktf/provider-azurerm/lib/provider";
import { ResourceGroup } from "@cdktf/provider-azurerm/lib/resource-group";
import { StaticSite } from "@cdktf/provider-azurerm/lib/static-site";
import { Application } from "@cdktf/provider-azuread/lib/application";
import { ApplicationPassword } from "@cdktf/provider-azuread/lib/application-password";
import { AzureadProvider } from "@cdktf/provider-azuread/lib/provider";
import { StorageAccount } from "@cdktf/provider-azurerm/lib/storage-account";
import { StorageTable } from "@cdktf/provider-azurerm/lib/storage-table";
import { CognitiveAccount } from "@cdktf/provider-azurerm/lib/cognitive-account";
import { CognitiveDeployment } from "@cdktf/provider-azurerm/lib/cognitive-deployment";
import { AzapiProvider } from "./.gen/providers/azapi/provider";
import { StorageContainer } from "@cdktf/provider-azurerm/lib/storage-container";
import { ResourceAction } from "./.gen/providers/azapi/resource-action";
import { ApplicationInsights } from "@cdktf/provider-azurerm/lib/application-insights";

class AzureOpenAiLive2DChatbotStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    new AzurermProvider(this, "azure", {
      features: {
        resourceGroup: {
          preventDeletionIfContainsResources: false
        }
      },
      skipProviderRegistration: false
    });
    new AzureadProvider(this, "azuread", {});
    new AzapiProvider(this, "azapi", {});

    const uniquePrefix = "ivechat";

    const region = "eastasia";

    const resourceGroup = new ResourceGroup(this, 'resourceGroup', {
      name: `azure-openai-live2d-chatbot`,
      location: region,
    });

    const chatStorageAccount = new StorageAccount(this, "chatStorageAccount", {
      name: uniquePrefix + "storageaccount",
      resourceGroupName: resourceGroup.name,
      location: resourceGroup.location,
      accountTier: "Standard",
      accountReplicationType: "LRS",
      staticWebsite: {
        indexDocument: "index.html",
        error404Document: "404.html"
      }
    })

    new StorageTable(this, "chatStorageTable", {
      name: "chatHistory",
      storageAccountName: chatStorageAccount.name,
    })

    new StorageContainer(this, "chatStorageBlob", {
      name: "voice",
      storageAccountName: chatStorageAccount.name,
      containerAccessType: "blob",
    })

    const ttsCognitiveAccount = new CognitiveAccount(this, "ttsCognitiveAccount", {
      name: uniquePrefix + "TTSCognitiveServicesAccount",
      resourceGroupName: resourceGroup.name,
      location: "EastUS",
      kind: "SpeechServices",
      skuName: "S0",
    });

    const openAiCognitiveAccount = new CognitiveAccount(this, "openAiCognitiveAccount", {
      name: uniquePrefix + "OpenAiCognitiveServicesAccount",
      resourceGroupName: resourceGroup.name,
      location: "EastUS",
      kind: "OpenAI",
      skuName: "S0",
    });

    const openAiCognitiveDeployment = new CognitiveDeployment(this, "openAiCognitiveDeployment", {
      name: uniquePrefix + "OpenAiCognitiveServicesDeployment",
      cognitiveAccountId: openAiCognitiveAccount.id,
      model: {
        name: "gpt-35-turbo",
        format: "OpenAI",
        version: "0301",
      },
      scale: {
        type: "Standard"
      }
    });

    const live2DStaticSite = new StaticSite(this, "live2DStaticSite", {
      location: resourceGroup.location,
      name: "live2DStaticSite",
      resourceGroupName: resourceGroup.name,
      skuTier: "Free",
    });

    const live2DApplicationInsights = new ApplicationInsights(this, "live2DApplicationInsights", {
      name: "live2DApplicationInsights",
      resourceGroupName: resourceGroup.name,
      location: resourceGroup.location,
      applicationType: "web",
    })

    new ResourceAction(this, "live2DStaticSiteAction", {
      type: "Microsoft.Web/staticSites/config@2022-03-01",
      resourceId: live2DStaticSite.id + "/config/appsettings",
      method: "PUT",
      body: `${Fn.jsonencode({
        "properties": {
          "APPINSIGHTS_INSTRUMENTATIONKEY": `${live2DApplicationInsights.instrumentationKey}`,
          "APPLICATIONINSIGHTS_CONNECTION_STRING": `${live2DApplicationInsights.connectionString}`,
          "chatStorageAccountConnectionString": `${chatStorageAccount.primaryConnectionString}`,
          "openAiCognitiveAccount": `${openAiCognitiveAccount.primaryAccessKey}`,
          "openAiCognitiveDeploymentName": `${openAiCognitiveDeployment.name}`,
          "ttsApiKey": `${ttsCognitiveAccount.primaryAccessKey}`,
          "speechRegion": `EastUS`
        },
        "kind": "appsettings"
      })}`
    });


    const live2DApplication = new Application(this, "live2DApplication", {
      displayName: "AzureOpenAiLive2DChatbot",
      signInAudience: "AzureADMyOrg",
      web: {
        redirectUris: ["https://" + live2DStaticSite.defaultHostName + "/.auth/login/aadb2c/callback"],
        implicitGrant: {
          accessTokenIssuanceEnabled: true,
          idTokenIssuanceEnabled: true
        }
      }
    });

    const live2DApplicationPassword = new ApplicationPassword(this, "live2DApplicationPwd", {
      applicationObjectId: live2DApplication.objectId,
      displayName: "live2DApplication cred",
    })

    new TerraformOutput(this, "live2DStaticSiteApiKey", {
      value: live2DStaticSite.apiKey,
      sensitive: true
    });
    new TerraformOutput(this, "live2DStaticSiteDefaultHostName", {
      value: live2DStaticSite.defaultHostName,
    });

    new TerraformOutput(this, "live2DApplicationPasswordKeyId", {
      value: live2DApplicationPassword.keyId,
    });

    new TerraformOutput(this, "AADB2C_PROVIDER_CLIENT_ID", {
      value: live2DApplication.id,
    });
    new TerraformOutput(this, "AADB2C_PROVIDER_CLIENT_SECRET", {
      value: live2DApplicationPassword.value,
      sensitive: true
    });

    new TerraformOutput(this, "chatStorageAccountConnectionString", {
      value: chatStorageAccount.primaryConnectionString,
      sensitive: true
    });

    new TerraformOutput(this, "openAiCognitiveAccountPrimaryAccessKey", {
      value: openAiCognitiveAccount.primaryAccessKey,
      sensitive: true
    });
    new TerraformOutput(this, "openAiCognitiveDeploymentName", {
      value: openAiCognitiveDeployment.name,
    });

    new TerraformOutput(this, "ttsApiKey", {
      value: ttsCognitiveAccount.primaryAccessKey,
      sensitive: true
    });
    new TerraformOutput(this, "ttsEndpoint", {
      value: ttsCognitiveAccount.endpoint,
    });

  }
}

const app = new App();
new AzureOpenAiLive2DChatbotStack(app, "cdktf");
app.synth();
