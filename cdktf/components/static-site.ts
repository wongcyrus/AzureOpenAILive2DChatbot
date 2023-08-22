import { Construct } from "constructs";

import { ApplicationInsights } from ".././.gen/providers/azurerm/application-insights";
import { StaticSite } from ".././.gen/providers/azurerm/static-site";
import { ResourceAction } from "../.gen/providers/azapi/resource-action";
import { Fn } from "cdktf";
import { Application } from ".././.gen/providers/azuread/application";
import { ApplicationPassword } from ".././.gen/providers/azuread/application-password";
import { ResourceGroup } from ".././.gen/providers/azurerm/resource-group";

export interface StaticSiteConstructProps {
  chatStorageAccountConnectionString: string;
  openAiCognitiveAccount: string;
  openAiCognitiveDeploymentNames: string[];
  ttsApiKey: string;
  speechRegion: string;
  resourceGroup: ResourceGroup;
}

export class StaticSiteConstruct extends Construct {
  public readonly live2DStaticSite: StaticSite;
  public readonly live2DApplication: Application;
  public readonly live2DApplicationPassword: ApplicationPassword;

  constructor(scope: Construct, id: string, props: StaticSiteConstructProps) {
    super(scope, id);
    this.live2DStaticSite = new StaticSite(this, "live2DStaticSite", {
      location: props.resourceGroup.location,
      name: "live2DStaticSite",
      resourceGroupName: props.resourceGroup.name,
      skuTier: "Free",
    });

    const live2DApplicationInsights = new ApplicationInsights(this, "live2DApplicationInsights", {
      name: "live2DApplicationInsights",
      resourceGroupName: props.resourceGroup.name,
      location: props.resourceGroup.location,
      applicationType: "web",
    })

    new ResourceAction(this, "live2DStaticSiteAction", {
      type: "Microsoft.Web/staticSites/config@2022-03-01",
      resourceId: this.live2DStaticSite.id + "/config/appsettings",
      method: "PUT",
      body: `${Fn.jsonencode({
        "properties": {
          "APPINSIGHTS_INSTRUMENTATIONKEY": `${live2DApplicationInsights.instrumentationKey}`,
          "APPLICATIONINSIGHTS_CONNECTION_STRING": `${live2DApplicationInsights.connectionString}`,
          "chatStorageAccountConnectionString": `${props.chatStorageAccountConnectionString}`,
          "openAiCognitiveAccount": `${props.openAiCognitiveAccount}`,
          "openAiCognitiveDeploymentNames": `${props.openAiCognitiveDeploymentNames.join(",")}`,
          "ttsApiKey": `${props.ttsApiKey}`,
          "speechRegion": `${props.speechRegion}`,
        },
        "kind": "appsettings"
      })}`
    });


    this.live2DApplication = new Application(this, "live2DApplication", {
      displayName: "AzureOpenAiLive2DChatbot",
      signInAudience: "AzureADMyOrg",
      web: {
        redirectUris: ["https://" + this.live2DStaticSite.defaultHostName + "/.auth/login/aadb2c/callback"],
        implicitGrant: {
          accessTokenIssuanceEnabled: true,
          idTokenIssuanceEnabled: true
        }
      }
    });

    this.live2DApplicationPassword = new ApplicationPassword(this, "live2DApplicationPwd", {
      applicationObjectId: this.live2DApplication.objectId,
      displayName: "live2DApplication cred",
    });
  }
}
