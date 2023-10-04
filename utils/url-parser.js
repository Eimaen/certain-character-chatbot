const url = require('url');
const axios = require('axios').default;
const renewSpotifyToken = require('./spotify');

var token = '';
setInterval(() => renewSpotifyToken().then(t => token = t), 3200000);

const getTrackTitleFromSpotifyLink = async (spotifyLink) => {
    try {
        if (token == '')
            token = await renewSpotifyToken();

        const regex = /track\/([a-zA-Z0-9]+)/;
        const match = spotifyLink.match(regex);
        if (!match || match.length < 2) {
            throw new Error('Invalid Spotify link');
        }
        const trackId = match[1];

        const response = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
            headers: {
                'Authorization': 'Bearer ' + token,
            },
        });
        
        return `*plays ${response.data.artists.map(a => a.name).join(', ')} - ${response.data.name}*`;
    } catch (error) {
        console.error('Error retrieving track title:', error.message);
    }
}

const transformURL = async (urlString) => {
    const parsedUrl = url.parse(urlString);
    const domain = parsedUrl.hostname;

    switch (domain) {
        case 'open.spotify.com':
            return await getTrackTitleFromSpotifyLink(urlString).catch(() => urlString);
        default:
            return urlString;
    }
}

async function parseAndTransformURLs(text) {
    const urlRegex = /https?:\/\/[^\s/$.?#].[^\s]*/g;
    const urls = text.match(urlRegex) || [];

    for (let urlString of urls) {
        text = text.replace(urlString, await transformURL(urlString));
    };

    return text;
}

module.exports = parseAndTransformURLs;