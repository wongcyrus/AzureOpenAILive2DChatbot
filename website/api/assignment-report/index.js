const { TableClient } = require("@azure/data-tables");
const { getEmail, isTeacher } = require("../checkMember");
const { setErrorJson } = require("../contextHelper");
const ExcelJS = require('exceljs');
const fs = require('fs');
const temp = require('temp');

const chatStorageAccountConnectionString = process.env.chatStorageAccountConnectionString;
const marksTableClient = TableClient.fromConnectionString(chatStorageAccountConnectionString, "marks");

module.exports = async function (context, req) {
    const teacherEmail = getEmail(req);

    if (!await isTeacher(teacherEmail, context)) {
        setErrorJson(context, "Unauthorized", 401);
        return;
    }


    const taskId = req.body.taskId;
    const assignmentId = req.body.assignmentId;

    let continuationToken = null;
    let pageEntities = undefined;
    let filter = `PartitionKey eq '${teacherEmail}' and assignmentId eq '${assignmentId}'`;
    filter += taskId ? ` and taskId eq '${taskId}'` : "";

    let entities = [];
    do {
        const page = await marksTableClient.listEntities({
            queryOptions: { filter }
        }).byPage({ maxPageSize: 100, continuationToken: continuationToken }).next();
        pageEntities = page.value;
        continuationToken = pageEntities.continuationToken;
        entities = entities.concat(pageEntities);
    }
    while (continuationToken !== undefined);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('marks');
    worksheet.columns = [
        { header: 'Email', key: 'email' },
        { header: 'Assignment ID', key: 'assignmentId' },
        { header: 'Task ID', key: 'taskId' },
        { header: 'Marks', key: 'mark' },
        { header: 'Comments', key: 'comments' }
    ];
    for (let entity of entities) {
        worksheet.addRow({
            email: entity.studentEmail,
            assignmentId: assignmentId,
            taskId: taskId ?? "",
            mark: entity.mark,
            comments: entity.comments
        });
    }

    const tempName = temp.path({ suffix: '.xlsx' });
    await workbook.xlsx.writeFile(tempName);
    const data = fs.readFileSync(tempName);
    const fileBuffer = Buffer.from(data, 'base64');

    context.res = {
        status: 202,
        body: fileBuffer,
        headers: {
            "Content-Disposition": `attachment; filename=mark-${assignmentId}.xlsx`
        }
    };
    context.done();
}