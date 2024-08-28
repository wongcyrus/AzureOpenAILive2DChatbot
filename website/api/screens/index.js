const { BlobServiceClient } = require("@azure/storage-blob");
const { getEmail, isMember, isValidSession } = require("../checkMember");
const { setJson, setErrorJson } = require("../contextHelper");
const { screenSharingMaxSize, screenSharingPerMinute } = require("../constants");

const chatStorageAccountConnectionString = process.env.chatStorageAccountConnectionString;

const blobServiceClient = BlobServiceClient.fromConnectionString(chatStorageAccountConnectionString);
const containerClient = blobServiceClient.getContainerClient("screens");

function getDateTimeStringAsFilename() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const second = now.getSeconds();
    return `${year}-${month}-${day}-${hour}-${minute}-${second}`;
}
async function isOverRateLimit(containerClient, prefix) {
    // page size - artificially low as example
    const maxPageSize = screenSharingPerMinute * 2;
    const listOptions = {
        includeMetadata: false,
        includeSnapshots: false,
        includeTags: false,
        includeVersions: false,
        prefix
    };

    let iterator = containerClient.listBlobsFlat(listOptions).byPage({ maxPageSize });
    let response = (await iterator.next()).value;
    let count = response.segment.blobItems.length;
    return count > screenSharingPerMinute;
}

module.exports = async function (context, req) {
    const email = getEmail(req);

    if (!await isMember(email, context)) {
        setErrorJson(context, "Unauthorized");
        return;
    }
    if (!await isValidSession(email, context)) {
        setErrorJson(context, "Screen Sharing Session Expired!");
        return;
    }

    try {
        const regex = /^data:.+\/(.+);base64,(.*)$/;
        const matches = req.body.match(regex);
        const ext = matches[1];
        const data = matches[2];
        const bodyBuffer = new Uint8Array(Buffer.from(data, 'base64'));

        const sizeInMB = bodyBuffer.length / 1_048_576;
        if (sizeInMB > screenSharingMaxSize) {
            setErrorJson(context, `File size is too large. Max ${screenSharingMaxSize} MB`, 403);
            return;
        }

        const timeBlobName = email + "/" + getDateTimeStringAsFilename() + "." + ext;;
        const prefix = timeBlobName.substring(0, timeBlobName.lastIndexOf("-"));
        if (await isOverRateLimit(containerClient, prefix)) {
            setErrorJson(context, `Rate limit exceeded. Max ${screenSharingPerMinute} images per minute`, 403);
            return;
        }

        const blobName = email.replace(/[^a-zA-Z0-9 ]/g, '_') + "." + ext;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const uploadBlobResponse = await blockBlobClient.uploadData(bodyBuffer);
        context.log(`Upload block blob ${blobName} successfully`, uploadBlobResponse.requestId);

        const destinationBlobClient = await containerClient.getBlobClient(timeBlobName);
        await destinationBlobClient.beginCopyFromURL(blockBlobClient.url);

        setJson(context, { DisplayText: blobName, timeBlobName });
    } catch (ex) {
        setErrorJson(context, ex);
    }
}