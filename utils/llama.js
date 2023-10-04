/**
 * It's crap, paying Elon 0.0002$ is much easier.
 */

const generateMessage = async (system, context) => {
    if (!context || context.length == 0)
        return null;
    let client = (await import('@gradio/client')).client;
    let app = await client('https://eimaen-llm-tests.hf.space/');
    let data = await app.predict(2,
        [
            context[context.length - 1],
            context.map(c => [c, '']),
            system,
            1,
            0.95,
            50
        ]).catch(err => { console.error(err); return null; });
    if (data)
        return data.data;
    return null;
};

module.exports = { generateMessage };