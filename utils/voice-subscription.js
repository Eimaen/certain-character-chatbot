/**
 * This could've been magic with speaking Cirno using so-vits-svc and whisper...
 * Unfortunately I'm tired.
 */

const {
    createAudioPlayer,
    entersState,
    VoiceConnectionDisconnectReason,
    VoiceConnectionStatus,
    VoiceConnection,
    EndBehaviorType
} = require('@discordjs/voice');
const whisper = require('whisper-node').whisper;
const fs = require('fs');
const { join } = require('path');
const { OpusEncoder } = require('@discordjs/opus');
const wav = require('wav');

const whisperWhitelist = [
    '394601924881809408'
]

const encoder = new OpusEncoder(16000, 1);

module.exports = class GuildVoiceSubscription {
    /**
    * @param {VoiceConnection} voiceConnection Voice connection
    * @param {VoiceChannel} channel Discord voice channel
    */
    constructor(voiceConnection, channel) {
        this.voiceConnection = voiceConnection;
        this.channel = channel;
        this.audioPlayer = createAudioPlayer();

        // #1 Shitcode WR AnyO(n^((2^2)^2))
        this.audioBuffer = [];
        this.receiver = this.voiceConnection.receiver;
        this.receiver.speaking.on('start', user => {
            if (this.audioBuffer[user]?.length > 0) return;
            if (!this.audioBuffer[user]) this.audioBuffer[user] = [];
            console.log('<- ' + user);
            if (!this.receiver.subscriptions.has(user)) {
                this.receiver.subscribe(user, { end: { behavior: EndBehaviorType.AfterInactivity, duration: 1000 } }).on('data', async (data) => {
                    this.audioBuffer[user].push(encoder.decode(data));
                }).on('end', async () => {
                    console.log('/- ' + user);
                    if (this.audioBuffer[user] == []) return;
                    let writer = new wav.Writer({ sampleRate: 16000, channels: 1 });
                    writer.write(Buffer.concat(this.audioBuffer[user]));
                    writer.pipe(fs.createWriteStream(join(__dirname, `${user}.wav`)));
                    writer.end();
                    let data = (await whisper(join(__dirname, `${user}.wav`), {
                        modelName: 'base.en'
                    })).map(part => part.speech).join('');
                    console.log(data);
                    this.audioBuffer[user] = [];
                    this.receiver.subscriptions.get(user)?.destroy();
                    this.receiver.subscriptions.delete(user);
                });
            }
        });
    }
}