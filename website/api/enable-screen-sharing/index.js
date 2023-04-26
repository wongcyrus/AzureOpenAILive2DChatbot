const { TableClient } = require("@azure/data-tables");
const { BlobServiceClient } = require("@azure/storage-blob");
const { getEmail, isTeacher } = require("../checkMember");
const { setJson, setErrorJson } = require("../contextHelper");

const chatStorageAccountConnectionString = process.env.chatStorageAccountConnectionString;

const classesTableClient = TableClient.fromConnectionString(chatStorageAccountConnectionString, "classes");
const sessionsTableClient = TableClient.fromConnectionString(chatStorageAccountConnectionString, "sessions");

const blobServiceClient = BlobServiceClient.fromConnectionString(chatStorageAccountConnectionString);
const containerClient = blobServiceClient.getContainerClient("screen");


module.exports = async function (context, req) {

    const teacherEmail = getEmail(req);
    if (!await isTeacher(teacherEmail, context)) {
        setErrorJson(context, "Unauthorized", 401);
        return;
    }

    const classId = req.query.classId;

    let continuationToken = null;
    let pageEntities = undefined;
    let entities = [];
    do {
        const page = await classesTableClient.listEntities({
            queryOptions: {
                filter: `PartitionKey eq '${classId}'`
            }
        }).byPage({ maxPageSize: 100, continuationToken: continuationToken }).next();
        pageEntities = page.value;
        if (!pageEntities) break;
        continuationToken = pageEntities.continuationToken;
        entities = entities.concat(pageEntities);
    }
    while (continuationToken !== undefined);

    for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        context.log(entity);
        const studentEmail = entity.rowKey;
        context.log(studentEmail);
        await sessionsTableClient.upsertEntity(
            {
                partitionKey: studentEmail,
                rowKey: studentEmail,
                TeacherEmail: teacherEmail
            }, "Replace"
        );
    }

    const emails = entities.map(entity => entity.rowKey);

    //delete cached screens
    await Promise.all(emails.map(async studentEmail => {
        const blobName = studentEmail.replace(/[^a-zA-Z0-9 ]/g, '_') + ".jpeg";
        const blobClient = containerClient.getBlobClient(blobName);
        await blobClient.deleteIfExists();
    }));

    const results = entities.map(entity => ({ email: entity.rowKey, name: entity.Name }));
    setJson(context, results);
}