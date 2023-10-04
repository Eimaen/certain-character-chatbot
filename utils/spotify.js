const axios = require('axios').default;
const { spotify } = require('../config.json');

module.exports = async () => {
    let response = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
        headers: {
            'Authorization': 'Basic ' + (new Buffer.from(spotify.clientId + ':' + spotify.clientSecret).toString('base64'))
        },
        responseType: 'json'
    }).catch(_ => { console.error(_); return null; });
    if (response?.data)
        return response.data.access_token;
    return null;
}