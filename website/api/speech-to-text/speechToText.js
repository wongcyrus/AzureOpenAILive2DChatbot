const sdk = require('microsoft-cognitiveservices-speech-sdk');
const fs = require('fs');
const axios = require('axios');

const speechToText = async (key, speechRegion, filename, language, context) => {
    const headers = {
        headers: {
            'Ocp-Apim-Subscription-Key': key,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    };
    const tokenResponse = await axios.post(`https://${speechRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, null, headers);

    const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(tokenResponse.data, speechRegion);
    speechConfig.speechRecognitionLanguage = language;
    const audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync(filename));
 
    const speechRecognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    return new Promise((resolve, reject) => {
        speechRecognizer.recognizeOnceAsync(result => {
            switch (result.reason) {
                case sdk.ResultReason.RecognizedSpeech:
                    context.log(`RECOGNIZED: Text=${result.text}`);
                    resolve(result);
                    break;
                case sdk.ResultReason.NoMatch:
                    context.log("NOMATCH: Speech could not be recognized.");
                    reject("NOMATCH: Speech could not be recognized.");
                    break;
                case sdk.ResultReason.Canceled:
                    const cancellation = sdk.CancellationDetails.fromResult(result);
                    context.log(`CANCELED: Reason=${cancellation.reason}`);

                    if (cancellation.reason == sdk.CancellationReason.Error) {
                        context.log(`CANCELED: ErrorCode=${cancellation.ErrorCode}`);
                        context.log(`CANCELED: ErrorDetails=${cancellation.errorDetails}`);
                        context.log("CANCELED: Did you set the speech resource key and region values?");
                    }
                    reject(cancellation);
                    break;
            }
            speechRecognizer.close();
        });
    });
}
module.exports = {
    speechToText
};