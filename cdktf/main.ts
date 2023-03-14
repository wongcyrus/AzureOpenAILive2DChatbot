import { Construct } from "constructs";
import { App, TerraformOutput, TerraformStack } from "cdktf";
import { AzurermProvider } from "@cdktf/provider-azurerm/lib/provider";
import { ResourceGroup } from "@cdktf/provider-azurerm/lib/resource-group";
import { StaticSite } from "@cdktf/provider-azurerm/lib/static-site";
import { Application } from "@cdktf/provider-azuread/lib/application";
// import { ApplicationPassword } from "@cdktf/provider-azuread/lib/application-password";
import { AzureadProvider } from "@cdktf/provider-azuread/lib/provider";

class AzureOpenAiLive2DChatbotStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    new AzurermProvider(this, "azure", { features: {} })
    new AzureadProvider(this, "azuread", {})

    const region = "eastasia";

    const resourceGroup = new ResourceGroup(this, 'resourceGroup', {
      name: `azure-openai-live2d-chatbot`,
      location: region,
    });

    new Application(this, "live2DApplication", {
      displayName: "AzureOpenAiLive2DChatbot",
    });

    // const live2DApplicationPassword = new ApplicationPassword(this, "live2DApplicationPwd", {
    //   applicationObjectId: live2DApplication.objectId,
    //   displayName: "live2DApplication cred"
    // })

    const live2DStaticSite = new StaticSite(this, "live2DStaticSite", {
      location: resourceGroup.location,
      name: "live2DStaticSite",
      resourceGroupName: resourceGroup.name,
      skuTier: "Free",
    });

    new TerraformOutput(this, "live2DStaticSiteApiKey", {
      value: live2DStaticSite.apiKey,
      sensitive: true
    });
    new TerraformOutput(this, "live2DStaticSiteDefaultHostName", {
      value: live2DStaticSite.defaultHostName,
    });

    // new TerraformOutput(this, "live2DApplicationPassword", {
    //   value: live2DApplicationPassword.value,
    //   sensitive: true
    // });




  }
}

const app = new App();
new AzureOpenAiLive2DChatbotStack(app, "cdktf");
app.synth();
