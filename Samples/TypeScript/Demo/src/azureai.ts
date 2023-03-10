import { LAppPal } from "./lapppal";
import { getWaveBlob } from "webm-to-wav-converter";
import { LANGUAGE_TO_VOICE_MAPPING_LIST } from "./languagetovoicemapping";


export class AzureAi {
  private _openaiurl: string;
  private _openaipikey: string;
  private _ttsapikey: string;
  private _ttsregion: string;

  private _inProgress: boolean;



  constructor() {
    const config = (document.getElementById("config") as any).value;

    if (config !== "") {
      const json = JSON.parse(config);
      this._openaiurl = json.openaiurl;
      this._openaipikey = json.openaipikey;
      this._ttsregion = json.ttsregion;
      this._ttsapikey = json.ttsapikey;
    }

    this._inProgress = false;
  }

  async getOpenAiAnswer(ip: string, prompt: string) {

    if (this._openaiurl === undefined || this._inProgress || prompt === "") return "";

    this._inProgress = true;

    interface Message {
      sender: string;
      text: string;
    }

    const conversations = (document.getElementById("conversations") as any).value;

    const messages = conversations ? <Message[]>JSON.parse(conversations) : [];
    LAppPal.printMessage(prompt);

    const createPrompt = (system_message: string, messages: Array<Message>) => {
      let prompt = system_message;
      for (const message of messages) {
        prompt += `\n<|im_start|>${message.sender}\n${message.text}\n<|im_end|>`
      }
      prompt += "\n<|im_start|>assistant\n"
      return prompt;
    }

    const systemMessage = "<|im_start|>system\n{'What can I help you?'}\n<|im_end|>"

    messages.push({ sender: "user", text: prompt });

    // const conversation = conversations + "\n\n## " + prompt
    const m = {
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

    messages.push({ "sender": "assistant", "text": json.choices[0].text })

    const answer: string = json.choices[0].text
    LAppPal.printMessage(answer);
    (document.getElementById("reply") as any).value = answer;
    (document.getElementById("conversations") as any).value = JSON.stringify(messages);

    return answer;
  }

  async getSpeechUrl(language: string, text: string) {

    if (this._ttsregion === undefined) return;

    const requestHeaders: HeadersInit = new Headers();
    requestHeaders.set('Content-Type', 'application/ssml+xml');
    requestHeaders.set('X-Microsoft-OutputFormat', 'riff-8khz-16bit-mono-pcm');
    requestHeaders.set('Ocp-Apim-Subscription-Key', this._ttsapikey);

    const voice = LANGUAGE_TO_VOICE_MAPPING_LIST.find(c => c.voice.startsWith(language) && c.IsMale === false).voice;

    const ssml = `
<speak version=\'1.0\' xml:lang=\'${language}\'>
  <voice xml:lang=\'${language}\' xml:gender=\'Female\' name=\'${voice}\'>
    ${text}
  </voice>
</speak>`;

    const response = await fetch(`https://${this._ttsregion}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: requestHeaders,
      body: ssml
    });

    const blob = await response.blob();

    var url = window.URL.createObjectURL(blob)
    const audio: any = document.getElementById('voice');
    audio.src = url;
    LAppPal.printMessage(`Load Text to Speech url`);
    this._inProgress = false;
    return url;
  }

  async getTextFromSpeech(language: string, data: Blob) {
    if (this._ttsregion === undefined) return "";

    LAppPal.printMessage(language);
    const requestHeaders: HeadersInit = new Headers();
    requestHeaders.set('Accept', 'application/json;text/xml');
    requestHeaders.set('Content-Type', 'audio/wav; codecs=audio/pcm; samplerate=16000');
    requestHeaders.set('Ocp-Apim-Subscription-Key', this._ttsapikey);

    const wav = await getWaveBlob(data, false);

    const response = await fetch(`https://${this._ttsregion}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${language}`, {
      method: 'POST',
      headers: requestHeaders,
      body: wav
    });
    const json = await response.json();
    return json.DisplayText;
  }
}
