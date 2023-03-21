
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
    public readonly openAiCognitiveDeployment: CognitiveDeployment;
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

        this.openAiCognitiveDeployment = new CognitiveDeployment(this, "openAiCognitiveDeployment", {
            name: props.uniquePrefix + "OpenAiCognitiveServicesDeployment",
            cognitiveAccountId: this.openAiCognitiveAccount.id,
            model: {
                name: "gpt-35-turbo",
                format: "OpenAI",
                version: "0301",
            },
            scale: {
                type: "Standard"
            }
        });
    }
}
