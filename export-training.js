/**
 * Export gathered conversation data for trainig.
 * Needs to be changed in order to match model template.
 */

const db = require('./utils/database');
const fs = require('fs');

fs.writeFileSync('data.csv', 'text' + db.getAllContexts().map(c => {
    let data = JSON.parse(c.data);

    /** @type {Array<{ role: string, content: string }>} */
    let messages = data.openAiRequest.messages;
    let final = [`<s>[INST] <<SYS>>\n${messages.find(m => m.role == 'system').content}\n<</SYS>>\n\n`];
    for (let i = 0; i < messages.length; i++) {
        if (messages[i - 1]?.role == 'assistant' && messages[i]?.role == 'user') {
            final.push(`${messages[i].content} [/INST] `);
        } else if (messages[i - 1]?.role == 'user' && messages[i]?.role == 'assistant') {
            final.push(`${messages[i].content} </s><s> [INST] `);
        }
    }
    for (let i = messages.length - 1; i >= 0 && messages[i]?.role != 'assistant'; i--) 
        final.pop();

    if ((final.length - 1) % 2 != 0)
        return null;

    if (final.length)
        final[final.length - 1] = final[final.length - 1].substring(0, final[final.length - 1].lastIndexOf('<s> [INST] '));

    return final?.join('');
}).filter(c => c).map(c => `\n"${c.replaceAll('"', '""')}"`).join(''));