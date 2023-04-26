const { BlobServiceClient } = require("@azure/storage-blob");
const { speechToText } = require("./speechToText");
const { getEmail, isMember } = require("../checkMember");
const { setJson, setErrorJson } = require("../contextHelper");
const temp = require('temp');
const fs = require('fs');

const speechRegion = process.env.speechRegion;
const ttsApiKey = process.env.ttsApiKey;
const chatStorageAccountConnectionString = process.env.chatStorageAccountConnectionString;

const blobServiceClient = BlobServiceClient.fromConnectionString(chatStorageAccountConnectionString);
const containerClient = blobServiceClient.getContainerClient("voice");


module.exports = async function (context, req) {
    const email = getEmail(req);
    if (!await isMember(email, context)) {
        setErrorJson(context, "Unauthorized", 401);
        return;
    }

    const language = req.query.language;

    try {
        const bodyBuffer = new Uint8Array(Buffer.from(req.body, 'binary'));
        const tempName = temp.path({ suffix: '.wav' });
        fs.writeFileSync(tempName, bodyBuffer);

        const blobName = email.replace(/[^a-zA-Z0-9 ]/g, '') + "-stt.wav";
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const uploadBlobResponse = await blockBlobClient.uploadData(bodyBuffer);
        context.log(`Upload block blob ${blobName} successfully`, uploadBlobResponse.requestId);

        const res = await speechToText(ttsApiKey, speechRegion, tempName, language, context);
        context.log(res);

        setJson(context, { DisplayText: res.privText });
    } catch (ex) {
        setErrorJson(context, ex, 500);
    }
}