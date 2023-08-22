
import { ActionsSecret } from ".././.gen/providers/github/actions-secret";
import { Repository } from ".././.gen/providers/github/repository";
import { GithubProvider } from ".././.gen/providers/github/provider";
import { Construct } from "constructs";

export interface GitHubProps {
    apiToken: string;
    repository: string;
    clientID: string;
    clientSecret: string;
    githubProvider:GithubProvider;
}

export class GitHubConstruct extends Construct {
    constructor(scope: Construct, id: string, props: GitHubProps) {
        super(scope, id);


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
