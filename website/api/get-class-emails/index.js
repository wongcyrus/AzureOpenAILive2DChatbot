const { TableClient } = require("@azure/data-tables");
const { getEmail, isTeacher } = require("../checkMember");
const { setJson, setErrorJson } = require("../contextHelper");


const chatStorageAccountConnectionString = process.env.chatStorageAccountConnectionString;
const classesTableClient = TableClient.fromConnectionString(chatStorageAccountConnectionString, "classes");


module.exports = async function (context, req) {

    context.log("ip:" + req['x-forwarded-for']);
    const teacherEmail = getEmail(req);

    if (!await isTeacher(teacherEmail, context)) {
        setErrorJson(context, "Unauthorized", 401);
        return;
    }

    const classId = req.query.classId;

    if (!classId) {
        setJson(context, []);
        return;
    }
   
    const classIds = classId.split(",");
    const r = await Promise.all(classIds.map(async classId => {
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
        return entities
    }));
    const entities = r.flat();

    let students = entities.map(entity => ({ email: entity.rowKey, name: entity.Name }));
    students.sort((p1, p2) => p1.email.localeCompare(p2.email))

    setJson(context, students);

}