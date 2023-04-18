
import { CognitiveAccount } from "@cdktf/provider-azurerm/lib/cognitive-account";
import { CognitiveDeployment } from "@cdktf/provider-azurerm/lib/cognitive-deployment";
import { ResourceGroup } from "@cdktf/provider-azurerm/lib/resource-group";
import { Construct } from "constructs";

export interface CognitiveAccountProps {
  uniquePrefix: string;
  resourceGroup: ResourceGroup;
}

export class CognitiveAccountConstruct extends Construct {
  public readonly ttsCognitiveAccount: CognitiveAccount;
  public readonly openAiCognitiveAccount: CognitiveAccount;
  public readonly openAiCognitiveDeployments: CognitiveDeployment[];
  constructor(scope: Construct, id: string, props: CognitiveAccountProps) {
    super(scope, id);
    this.ttsCognitiveAccount = new CognitiveAccount(this, "ttsCognitiveAccount", {
      name: props.uniquePrefix + "TTSCognitiveServicesAccount",
      resourceGroupName: props.resourceGroup.name,
      location: "EastUS",
      kind: "SpeechServices",
      skuName: "S0",
    });

    this.openAiCognitiveAccount = new CognitiveAccount(this, "openAiCognitiveAccount", {
      name: props.uniquePrefix + "OpenAiCognitiveServicesAccount",
      resourceGroupName: props.resourceGroup.name,
      location: "EastUS",
      kind: "OpenAI",
      skuName: "S0",
    });


    this.openAiCognitiveDeployments = [];

    const models = [
      { name: "text-ada-001", version: "1" }, { name: "text-curie-001", version: "1" },
      { name: "text-davinci-002", version: "1" }, { name: "text-davinci-003", version: "1" },
      { name: "code-davinci-002", version: "1" },
      { name: "gpt-35-turbo", version: "0301" }, { name: "gpt-4", version: "0314" }, { name: "gpt-4-32k", version: "0314" }]

    for (const model of models) {
      const openaModel = new CognitiveDeployment(this, "openAiCognitiveDeployment" + model.name + model.version, {
        name: props.uniquePrefix + "OpenAiCognitiveServicesDeployment",
        cognitiveAccountId: this.openAiCognitiveAccount.id,
        model: {
          name: model.name,
          format: "OpenAI",
          version: model.version,
        },
        scale: {
          type: "Standard"
        }
      });
      this.openAiCognitiveDeployments.push(openaModel);
    }
  }
}
