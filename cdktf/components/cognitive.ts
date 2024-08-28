
import { CognitiveAccount } from ".././.gen/providers/azurerm/cognitive-account";
import { CognitiveDeployment } from ".././.gen/providers/azurerm/cognitive-deployment";
import { ResourceGroup } from ".././.gen/providers/azurerm/resource-group";
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
      { name: "gpt-35-turbo", version: "0301" },
      { name: "gpt-35-turbo-16k", version: "0613" },
      { name: "gpt-4", version: "0613" },
      { name: "gpt-4-32k", version: "0613" },
      { name: "gpt-4o", version: "2024-05-13" }
    ]

    for (const model of models) {
      const openaModel = new CognitiveDeployment(this, "openAiCognitiveDeployment" + model.name + model.version, {
        name: model.name,
        cognitiveAccountId: this.openAiCognitiveAccount.id,
        model: {
          name: model.name,
          format: "OpenAI",
          version: model.version,
        },
        scale: {
          type: "Standard",
          capacity: 5,
        }
      });
      this.openAiCognitiveDeployments.push(openaModel);
    }
  }
}
