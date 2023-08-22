
import { ActionsSecret } from ".././.gen/providers/github/actions-secret";
import { Repository } from ".././.gen/providers/github/repository";
import { GithubProvider } from ".././.gen/providers/github/provider";
import { Construct } from "constructs";

export interface GitHubProps {
  apiToken: string;
  repository: string;
  clientID: string;
  clientSecret: string;
  githubProvider: GithubProvider;
}

export class GitHubConstruct extends Construct {
  constructor(scope: Construct, id: string, props: GitHubProps) {
    super(scope, id);


    const repository = new Repository(this, "Repository", {
      name: props.repository,
      visibility: "public",
      vulnerabilityAlerts: true,
      template:
      {
        repository: "AzureOpenAILive2DChatbotDemo",
        owner: "wongcyrus",
        includeAllBranches: true
      }
    });

    new ActionsSecret(this, "ClientIdActionsSecret", {
      repository: repository.name,
      secretName: "AADB2C_PROVIDER_CLIENT_ID",
      plaintextValue: props.clientID,
      dependsOn: [repository]
    });

    new ActionsSecret(this, "ClientSecretActionsSecret", {
      repository: repository.name,
      secretName: "AADB2C_PROVIDER_CLIENT_SECRET",
      plaintextValue: props.clientSecret,
      dependsOn: [repository]
    });
    new ActionsSecret(this, "DeploymentTokenActionsSecret", {
      repository: repository.name,
      secretName: "AZURE_STATIC_WEB_APPS_API_TOKEN",
      plaintextValue: props.apiToken,
      dependsOn: [repository]
    });

  }
}
