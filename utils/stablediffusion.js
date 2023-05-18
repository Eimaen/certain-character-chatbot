const axios = require('axios').default;

/**
 * Generate the Cirno image.
 * @returns {object} Generated image data.
 */
const generateImage = async (prompt) => {
    let data = (await axios.postForm('YOUR ENDPOINT', {
        prompt: `masterpiece, ${prompt}`,
        steps: 24,
        sampler_name: 'DPM++ 2M Karras',
        negative_prompt: 'EasyNegative, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, jpeg artifacts, signature, watermark, username, blurry, smartphone, phone, camera, mirror selfie',
        width: 512,
        height: 768
    }, { responseType: 'json' }).catch(err => ({ data: null }))).data;
    if (data && data.status.code == 200)
        return data;
    return null;
}

module.exports = { generateImage };