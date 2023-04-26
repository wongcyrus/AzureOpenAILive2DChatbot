
import { ActionsSecret } from "@cdktf/provider-github/lib/actions-secret";
import { Repository } from "@cdktf/provider-github/lib/repository";
import { GithubProvider } from "@cdktf/provider-github/lib/provider";
import { Construct } from "constructs";

export interface GitHubProps {
    apiToken: string;
    repository: string;
    clientID: string;
    clientSecret: string;
}

export class GitHubConstruct extends Construct {
    constructor(scope: Construct, id: string, props: GitHubProps) {
        super(scope, id);

        new GithubProvider(this, "GitHubProvider", {
            token: process.env.GITHUB_TOKEN_DEPLOYMENT,
        });
        new Repository(this, "Repository", {
            name: props.repository,
            visibility: "public",
            template:
            {
                repository: "AzureOpenAILive2DChatbotDemo",
                owner: "wongcyrus",
                includeAllBranches: true
            }
        });

        new ActionsSecret(this, "ClientIdActionsSecret", {
            repository: props.repository,
            secretName: "AADB2C_PROVIDER_CLIENT_ID",
            plaintextValue: props.clientID
        });

        new ActionsSecret(this, "ClientSecretActionsSecret", {
            repository: props.repository,
            secretName: "AADB2C_PROVIDER_CLIENT_SECRET",
            plaintextValue: props.clientSecret
        });
        new ActionsSecret(this, "DeploymentTokenActionsSecret", {
            repository: props.repository,
            secretName: "AZURE_STATIC_WEB_APPS_API_TOKEN",
            plaintextValue: props.apiToken
        });



    }
}
