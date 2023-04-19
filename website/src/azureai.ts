import { LAppPal } from "./lapppal";
import { getWaveBlob } from "webm-to-wav-converter";
import { LANGUAGE_TO_VOICE_MAPPING_LIST } from "./languagetovoicemapping";


export class AzureAi {
  private _openaiurl: string;
  private _openaipikey: string;
  private _ttsapikey: string;
  private _ttsregion: string;
  private _ttsUrl: string;
  private _sttUrl: string;

  private _inProgress: boolean;



  constructor() {
    const config = (document.getElementById("config") as any).value;

    if (config !== "") {
      const json = JSON.parse(config);
      this._openaiurl = json.openaiurl;
      this._openaipikey = json.openaipikey;
      this._ttsregion = json.ttsregion;
      this._ttsapikey = json.ttsapikey;
    } else {
      this._openaiurl = "api/chatgpt";
      this._openaipikey = "";
      this._ttsUrl = "api/text-to-speech";
      this._sttUrl = "api/speech-to-text";
      this._ttsapikey = "";
    }

    this._inProgress = false;
  }

  async getOpenAiAnswer(prompt: string) {

    if (this._openaiurl === undefined || this._inProgress || prompt === "") return "";

    this._inProgress = true;

    interface Message {
      role: string;
      content: string;
    }

    const conversations = (document.getElementById("conversations") as any).value;

    const messages = conversations ? <Message[]>JSON.parse(conversations) : [];
    LAppPal.printMessage(prompt);

    const createPrompt = (system_message: Message, messages: Array<Message>) => {
      if (messages.length === 1)
        messages.unshift(system_message);
      return messages;
    }

    const systemMessage = { "role": "system", "content": "You are a helpful assistant." };

    messages.push({ role: "user", content: prompt });

    const m = {
      "model": $("#model").val(),
      "prompt": createPrompt(systemMessage, messages),
      "max_tokens": 800,
      "temperature": 0.7,
      "frequency_penalty": 0,
      "presence_penalty": 0,
      "top_p": 0.95,
      "stop": ["<|im_end|>"]
    };


    const repsonse = await fetch(this._openaiurl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this._openaipikey,
      },
      body: JSON.stringify(m)
    });
    const json = await repsonse.json();

    const answer: string = json.choices[0].message.content;
    messages.push({ role: "assistant", content: answer });

    LAppPal.printMessage(answer);
    $("#reply").val(answer).trigger('change');
    $("#cost").text("(Left: $" + json.left.toFixed(5) + " Just Used: $" + json.cost.toFixed(6) + ")");
    (document.getElementById("conversations") as any).value = JSON.stringify(messages);

    return answer;
  }

  async getSpeechUrl(language: string, text: string) {

    const requestHeaders: HeadersInit = new Headers();
    if (this._ttsapikey !== "") {
      requestHeaders.set('Content-Type', 'application/ssml+xml');
      requestHeaders.set('X-Microsoft-OutputFormat', 'riff-8khz-16bit-mono-pcm');
      requestHeaders.set('Ocp-Apim-Subscription-Key', this._ttsapikey);
    } else {
      requestHeaders.set('Content-Type', 'application/json');
    }


    const voice = LANGUAGE_TO_VOICE_MAPPING_LIST.find(c => c.voice.startsWith(language) && c.IsMale === false).voice;

    const ssml = `
<speak version=\'1.0\' xml:lang=\'${language}\'>
  <voice xml:lang=\'${language}\' xml:gender=\'Female\' name=\'${voice}\'>
    ${text}
  </voice>
</speak>`;

    const ttsUrl = this._ttsregion ? `https://${this._ttsregion}.tts.speech.microsoft.com/cognitiveservices/v1` : this._ttsUrl;
    const response = await fetch(ttsUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: ssml
    });


    console.log(response);
    const blob = await response.blob();

    var url = window.URL.createObjectURL(blob)
    const audio: any = document.getElementById('voice');
    audio.src = url;
    LAppPal.printMessage(`Load Text to Speech url`);
    this._inProgress = false;
    return url;
  }

  async getTextFromSpeech(language: string, data: Blob) {

    LAppPal.printMessage(language);
    const requestHeaders: HeadersInit = new Headers();
    requestHeaders.set('Accept', 'application/json;text/xml');
    requestHeaders.set('Content-Type', 'audio/wav; codecs=audio/pcm; samplerate=16000');
    requestHeaders.set('Ocp-Apim-Subscription-Key', this._ttsapikey);

    const wav = await getWaveBlob(data, false, { sampleRate: 16000 });

    const sttUrl = this._ttsregion ? `https://${this._ttsregion}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1` : this._sttUrl;

    const response = await fetch(sttUrl + `?language=${language}`, {
      method: 'POST',
      headers: requestHeaders,
      body: wav
    });
    const json = await response.json();
    $("#query").val(json.DisplayText).trigger('change');

    return json.DisplayText;
  }
}
