const sdk = require('microsoft-cognitiveservices-speech-sdk');
const { Buffer } = require('buffer');
const { PassThrough } = require('stream');
const fs = require('fs');
const axios = require('axios');

/**
 * Node.js server code to convert text to speech
 * @returns stream
 * @param {*} key your resource key
 * @param {*} region your resource region
 * @param {*} text text to convert to audio/speech
 * @param {*} filename optional - best for long text - temp file for converted speech/audio
 */
const textToSpeech = async (key, speechRegion, text, filename) => {
    const headers = {
        headers: {
            'Ocp-Apim-Subscription-Key': key,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    };
    const tokenResponse = await axios.post(`https://${speechRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, null, headers);


    // convert callback function to promise
    return new Promise((resolve, reject) => {

        const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(tokenResponse.data, speechRegion);
        speechConfig.speechSynthesisOutputFormat = 11; // riff-16khz-16bit-mono-pcm

        let audioConfig = null;

        if (filename) {
            audioConfig = sdk.AudioConfig.fromAudioFileOutput(filename);
        }

        const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

        synthesizer.speakSsmlAsync(
            text,
            result => {
                const { audioData } = result;
                synthesizer.close();
                if (filename) {
                    // return stream from file
                    const audioFile = fs.createReadStream(filename);
                    resolve(audioFile);
                } else {

                    // return stream from memory
                    const bufferStream = new PassThrough();
                    bufferStream.end(Buffer.from(audioData));
                    resolve(bufferStream);
                }
            },
            error => {
                synthesizer.close();
                reject(error);
            });
    });
};

module.exports = {
    textToSpeech
};