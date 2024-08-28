const { BlobServiceClient } = require("@azure/storage-blob");
const { textToSpeech } = require('./textToSpeech');
const { getEmail, isMember } = require("../checkMember");
const { setErrorJson } = require("../contextHelper");
const temp = require('temp');
const fs = require('fs');

const speechRegion = process.env.speechRegion;
const ttsApiKey = process.env.ttsApiKey;
const chatStorageAccountConnectionString = process.env.chatStorageAccountConnectionString;

const blobServiceClient = BlobServiceClient.fromConnectionString(chatStorageAccountConnectionString);
const containerClient = blobServiceClient.getContainerClient("voices");

module.exports = async function (context, req) {
    const email = getEmail(req);

    if (!await isMember(email, context)) {
        setErrorJson(context, "Unauthorized", 401);
        return;
    }

    let body = req.body;
    context.log(body);
    const tempName = temp.path({ suffix: '.wav' });
    await textToSpeech(ttsApiKey, speechRegion, body, tempName);

    const blobName = email.replace(/[^a-zA-Z0-9 ]/g, '') + "-tts.wav";
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const uploadBlobResponse = await blockBlobClient.uploadFile(tempName);
    context.log(`Upload block blob ${blobName} successfully`, uploadBlobResponse.requestId);

    context.res = {
        status: 200,
        headers: {
            "access-control-allow-origin": "*",
            "content-type": "audio/x-wav",
        },
        isRaw: true,
        body: fs.readFileSync(tempName)
    };
}