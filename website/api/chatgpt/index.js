const axios = require('axios');
const { TableClient } = require("@azure/data-tables");
const { getEmail, isMember, todayUsage, isOverLimit, getUsageLimit } = require("../checkMember");
const { setJson, setErrorJson } = require("../contextHelper");

const { calculateCost } = require("./price");


const openaipikey = process.env.openAiCognitiveAccount;
const chatStorageAccountConnectionString = process.env.chatStorageAccountConnectionString;

const chatHistoryTableClient = TableClient.fromConnectionString(chatStorageAccountConnectionString, "chatHistory");

module.exports = async function (context, req) {

    const email = getEmail(req);

    if (!await isMember(email, context)) {
        setJson(context, {
            "choices": [
                {
                    "message": { "content": "You are not member!" }
                }
            ]
        });
        return;
    }

    const limit = await getUsageLimit(email);
    const tokenUsageCost = await todayUsage(email);
    if (isOverLimit(email, tokenUsageCost, limit, context)) {
        setJson(context, {
            "choices": [
                {
                    "message": { "content": "Used up your daily limit. Please try again tomorrow." }
                }
            ]
        });
        return;
    }

    let body = { ...req.body };
    const taskId = body.taskId ?? "";
    delete body.taskId;
    const model = body.model;
    delete body.model;
    if (!process.env.openAiCognitiveDeploymentNames.split(",").find(element => model == element)) {
        setErrorJson(context, {
            "choices": [
                {
                    "text": "Invalid model name!",
                }
            ]
        }, 429);
    }

    try {
        let openaiurl;
        if (model.startsWith('gpt-')) {
            const apiVersion = "2023-03-15-preview";
            openaiurl = `https://eastus.api.cognitive.microsoft.com/openai/deployments/${model}/chat/completions?api-version=${apiVersion}`;
            body['messages'] = body['prompt'];
            delete body['prompt'];
            delete body['best_of'];
            body.stop = null;
            body.frequency_penalty = 0;
            body.presence_penalty = 0;
        } else {
            const apiVersion = "2022-12-01";
            openaiurl = `https://eastus.api.cognitive.microsoft.com/openai/deployments/${model}/completions?api-version=${apiVersion}`;
            body.prompt = body['prompt'].map(c => c.content).join('');
        }
        context.log(body);
        const headers = {
            'Content-Type': 'application/json',
            'api-key': openaipikey,
        }
        const res = await axios.post(openaiurl, JSON.stringify(body), {
            headers: headers
        });
        context.log(res.data);

        let question;
        if (model.startsWith('gpt-')) {
            const lastMessage = body.messages[body.messages.length - 1];
            question = lastMessage.content;
        } else {
            res.data.choices[0]["message"] = { content: res.data.choices[0].text };
            const lastMessage = body.prompt[body.prompt.length - 1];
            question = lastMessage.content;
        }

        const now = new Date();
        const ticks = "" + now.getTime();

        const cost = calculateCost(model, res.data.usage.completion_tokens || 0, res.data.usage.prompt_tokens);
        const chatEntity = {
            taskId,
            ... {
                PartitionKey: email,
                RowKey: ticks,
                Email: email,
                User: question,
                Chatbot: res.data.choices[0].message.content,
                Model: model,
                CompletionTokens: res.data.usage.completion_tokens,
                PromptTokens: res.data.usage.prompt_tokens,
                TotalTokens: res.data.usage.total_tokens,
                Cost: cost
            }, ...body
        };
        delete chatEntity['messages'];
        delete chatEntity['prompt'];

        context.log(chatEntity);
        await chatHistoryTableClient.createEntity(chatEntity);

        let response = { ...res.data };
        response['cost'] = cost;
        response['left'] = limit - (tokenUsageCost + cost);

        setJson(context, response);

    } catch (ex) {
        context.log(ex);
        setErrorJson(context, ex);
    }
}