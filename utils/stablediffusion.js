/**
 * These urls just proxy data to a1111's web-ui API.
 * Add launch argument "--api" and check https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/API to set it up.
 * It mostly requires just changing the urls.
 */

const axios = require('axios').default;

/**
 * Generate the Cirno image.
 * @returns {object} Generated image data.
 */
const generateImage = async (prompt) => {
    let data = (await axios.post('https://ai.eimaen.pw/api/sd/inference/system', {
        prompt: `masterpiece, ${prompt}`,
        steps: 24,
        sampler_name: 'Euler a',
        negative_prompt: 'EasyNegative, (badhandv4:1.2), collage',
        width: 256,
        height: 384
    }, { responseType: 'json' }).catch(err => { console.log(err); return { data: null }; })).data;
    if (data && data.status.code == 200)
        return data;
    return null;
}

const interrogate = async (image, model = 'clip') => {
    let data = (await axios.post('http://ai.eimaen.pw/api/interrogate/system', {
        model,
        image
    }, { responseType: 'json' }).catch(err => { console.log(err); return { data: null }; })).data;
    if (data && data.status.code == 200)
        return data;
    return null;
}

const interrogateDeepDanbooruHf = async (image, acceptableConfidence = 0.7) => {
    let client = (await import('@gradio/client')).client;
    let app = await client('https://eimaen-deepdanbooru.hf.space/');
    let data = await app.predict('/predict', [image, acceptableConfidence]).catch(err => { console.error(err); return null; });;
    if (data)
        return data.data;
    return null;
}

module.exports = { generateImage, interrogate, interrogateDeepDanbooruHf };