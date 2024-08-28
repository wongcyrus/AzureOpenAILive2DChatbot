const { TableClient } = require("@azure/data-tables");
const { getEmail, isTeacher } = require("../checkMember");
const { setJson, setErrorJson } = require("../contextHelper");

const chatStorageAccountConnectionString = process.env.chatStorageAccountConnectionString;
const chatHistoryTableClient = TableClient.fromConnectionString(chatStorageAccountConnectionString, "chatHistory");

module.exports = async function (context, req) {
    const teacherEmail = getEmail(req);

    if (!await isTeacher(teacherEmail, context)) {
        setErrorJson(context, "Unauthorized", 401);
        return;
    }

    const studentEmail = req.query.email;
    const taskId = req.query.taskId;
    const start = req.query.start;
    const end = req.query.end;


    let continuationToken = null;
    let pageEntities = undefined;
    let filter = `PartitionKey eq '${studentEmail}' and Timestamp le datetime'${end}' and Timestamp ge datetime'${start}'`;
    filter += taskId ? ` and taskId eq '${taskId}'` : "";

    let entities = [];
    do {
        const page = await chatHistoryTableClient.listEntities({
            queryOptions: { filter }
        }).byPage({ maxPageSize: 100, continuationToken: continuationToken }).next();
        pageEntities = page.value;
        continuationToken = pageEntities.continuationToken;
        entities = entities.concat(pageEntities);
    }
    while (continuationToken !== undefined);
    setJson(context, entities);
}