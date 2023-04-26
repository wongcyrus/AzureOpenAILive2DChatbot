const { TableClient } = require("@azure/data-tables");
const { dailyCostLimit, screenSharingMaxDuration } = require("./constants");

const chatStorageAccountConnectionString = process.env.chatStorageAccountConnectionString;
const usersTableClient = TableClient.fromConnectionString(chatStorageAccountConnectionString, "users");
const chatHistoryTableClient = TableClient.fromConnectionString(chatStorageAccountConnectionString, "chatHistory");
const sessionsTableClient = TableClient.fromConnectionString(chatStorageAccountConnectionString, "sessions");

const getEmail = (req) => {
    const header = req.headers['x-ms-client-principal'];
    const encoded = Buffer.from(header, 'base64');
    const decoded = encoded.toString('ascii');
    const clientPrincipal = JSON.parse(decoded);
    return clientPrincipal.userDetails;
}

const isMember = async (email, context) => {
    try {
        const user = await usersTableClient.getEntity(email, email);
        context.log(user);
        return user.partitionKey ? true : false;
    } catch (__) {
        return false;
    }
}

const isTeacher = async (email, context) => {
    try {
        const user = await usersTableClient.getEntity(email, email);
        context.log(user);
        return user.partitionKey ? true : false && user.Role === "teacher";
    } catch (__) {
        return false;
    }
}

const isOverLimit = (email, tokenUsageCost, limit, context) => {
    context.log(email + " used $" + tokenUsageCost + " today.");
    return tokenUsageCost > limit;
};

async function getUsageLimit(email) {
    const user = await usersTableClient.getEntity(email, email);
    const limit = user.Limit ?? dailyCostLimit;
    return limit;
}

async function todayUsage(email) {
    let continuationToken = null;
    let pageEntities = undefined;
    let entities = [];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    do {
        const page = await chatHistoryTableClient.listEntities({
            queryOptions: {
                filter: `PartitionKey eq '${email}' and Timestamp ge datetime'${yesterday.toISOString()}'`
            }
        }).byPage({ maxPageSize: 100, continuationToken: continuationToken }).next();
        pageEntities = page.value;
        continuationToken = pageEntities.continuationToken;
        entities = entities.concat(pageEntities);
    }
    while (continuationToken !== undefined);
    const tokenUsageCost = entities.reduce((acc, cur) => {
        acc += cur.Cost;
        return acc;
    }, 0);
    return tokenUsageCost;
}

async function isValidSession(email, context) {
    let continuationToken = null;
    let pageEntities = undefined;
    let entities = [];
    const sessionEndtime = new Date();
    sessionEndtime.setHours(sessionEndtime.getHours() + screenSharingMaxDuration);
    do {
        const page = await sessionsTableClient.listEntities({
            queryOptions: {
                filter: `PartitionKey eq '${email}' and Timestamp le datetime'${sessionEndtime.toISOString()}'`
            }
        }).byPage({ maxPageSize: 100, continuationToken: continuationToken }).next();
        pageEntities = page.value;
        continuationToken = pageEntities.continuationToken;
        entities = entities.concat(pageEntities);
    }
    while (continuationToken !== undefined);

    return entities.length > 0;
}


module.exports = {
    getEmail,
    isMember,
    isTeacher,
    isOverLimit,
    todayUsage,
    getUsageLimit,
    isValidSession
};
