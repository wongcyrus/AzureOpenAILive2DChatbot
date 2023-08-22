import { Construct } from "constructs";
import { App, TerraformOutput, TerraformStack } from "cdktf";
import { AzurermProvider } from "./.gen/providers/azurerm/provider";
import { ResourceGroup } from "./.gen/providers/azurerm/resource-group";

import { AzureadProvider } from "./.gen/providers/azuread/provider";
import { AzapiProvider } from "./.gen/providers/azapi/provider";

import { ChatStorageAccountConstruct } from "./components/chat-storage-account";
import { CognitiveAccountConstruct } from "./components/cognitive";
import { StaticSiteConstruct } from "./components/static-site";
import { GithubProvider } from "./.gen/providers/github/provider";
import { GitHubConstruct } from "./components/github";

import * as dotenv from 'dotenv';
dotenv.config({ path: __dirname + '/.env',override: true });

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

    const githubProvider = new GithubProvider(this, "GitHubProvider", {
      token: process.env.GITHUB_TOKEN,
    });

    const repository = "AzureOpenAILive2DChatbotCICD";
    let uniquePrefix = "ive2324";
    const region = "eastasia";


    let resourceGroup = new ResourceGroup(this, 'resourceGroup', {
      name: uniquePrefix + `azure-openai-live2d-chatbot`,
      location: region,
    });

    const cognitiveAccountConstruct = new CognitiveAccountConstruct(this, "cognitiveAccount", {
      uniquePrefix: uniquePrefix,
      resourceGroup: resourceGroup
    });

    const chatStorageAccountConstruct = new ChatStorageAccountConstruct(this, "chatStorageAccount", {
      uniquePrefix: uniquePrefix,
      resourceGroup: resourceGroup
    });

    const staticSiteConstruct = new StaticSiteConstruct(this, "staticSite", {
      resourceGroup: resourceGroup,
      chatStorageAccountConnectionString: chatStorageAccountConstruct.chatStorageAccount.primaryConnectionString,
      openAiCognitiveAccount: cognitiveAccountConstruct.openAiCognitiveAccount.primaryAccessKey,
      openAiCognitiveDeploymentNames: cognitiveAccountConstruct.openAiCognitiveDeployments.map(x => x.name),
      ttsApiKey: cognitiveAccountConstruct.ttsCognitiveAccount.primaryAccessKey,
      speechRegion: "EastUS"
    });

    new GitHubConstruct(this, "github", {
      repository: uniquePrefix + repository,
      clientID: staticSiteConstruct.live2DApplication.id,
      clientSecret: staticSiteConstruct.live2DApplicationPassword.value,
      apiToken: staticSiteConstruct.live2DStaticSite.apiKey,
      githubProvider
    });

    new TerraformOutput(this, "live2DStaticSiteApiKey", {
      value: staticSiteConstruct.live2DStaticSite.apiKey,
      sensitive: true
    });
    new TerraformOutput(this, "live2DStaticSiteDefaultHostName", {
      value: staticSiteConstruct.live2DStaticSite.defaultHostName,
    });

    new TerraformOutput(this, "live2DApplicationPasswordKeyId", {
      value: staticSiteConstruct.live2DApplicationPassword.keyId,
    });

    new TerraformOutput(this, "AADB2C_PROVIDER_CLIENT_ID", {
      value: staticSiteConstruct.live2DApplication.id,
    });
    new TerraformOutput(this, "AADB2C_PROVIDER_CLIENT_SECRET", {
      value: staticSiteConstruct.live2DApplicationPassword.value,
      sensitive: true
    });

    new TerraformOutput(this, "chatStorageAccountConnectionString", {
      value: chatStorageAccountConstruct.chatStorageAccount.primaryConnectionString,
      sensitive: true
    });

    new TerraformOutput(this, "openAiCognitiveAccountPrimaryAccessKey", {
      value: cognitiveAccountConstruct.openAiCognitiveAccount.primaryAccessKey,
      sensitive: true
    });
    new TerraformOutput(this, "openAiCognitiveDeploymentNames", {
      value: cognitiveAccountConstruct.openAiCognitiveDeployments.map(x => x.name).join(","),
    });

    new TerraformOutput(this, "ttsApiKey", {
      value: cognitiveAccountConstruct.ttsCognitiveAccount.primaryAccessKey,
      sensitive: true
    });
    new TerraformOutput(this, "ttsEndpoint", {
      value: cognitiveAccountConstruct.ttsCognitiveAccount.endpoint,
    });

  }
}

const app = new App();
new AzureOpenAiLive2DChatbotStack(app, "cdktf");
app.synth();
