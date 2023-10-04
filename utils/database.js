const sqlite = require('better-sqlite3');
const db = sqlite('database/data.sqlite');

db.exec('CREATE TABLE IF NOT EXISTS guilds (id TEXT UNIQUE PRIMARY KEY, channel TEXT)');
db.exec('CREATE TABLE IF NOT EXISTS users (id TEXT UNIQUE PRIMARY KEY, name TEXT)');
db.exec('CREATE TABLE IF NOT EXISTS context (id TEXT UNIQUE PRIMARY KEY, data TEXT)');
db.exec('CREATE TABLE IF NOT EXISTS messages (id TEXT UNIQUE PRIMARY KEY, content TEXT)');

class DatabaseInterface {
    /**
     * Create a database interface.
     * @param { sqlite.Database } db 
     */
    constructor(db) {
        this.backend = db;
    }

    getGuild(id) {
        if (!this.backend.prepare('SELECT * FROM guilds WHERE id = ?').get(id))
            this.backend.prepare('INSERT INTO guilds (id) VALUES (?)').run(id);
        return this.backend.prepare('SELECT * FROM guilds WHERE id = ?').get(id);
    };

    setGuild(id, guildConfig) {
        if (!this.backend.prepare('SELECT * FROM guilds WHERE id = ?').get(id))
            this.backend.prepare('INSERT INTO guilds (id, channel) VALUES (?, ?)').run(id, guildConfig.channel);
        else
            this.backend.prepare('UPDATE guilds SET channel = ? WHERE id = ?').run(guildConfig.channel, id);
    }

    getUser(id) {
        if (!this.backend.prepare('SELECT * FROM users WHERE id = ?').get(id))
            this.backend.prepare('INSERT INTO users (id, name) VALUES (?, ?)').run(id, `<@${id}>`);
        return this.backend.prepare('SELECT * FROM users WHERE id = ?').get(id);
    }

    setUser(id, userConfig) {
        if (!this.backend.prepare('SELECT * FROM users WHERE id = ?').get(id))
            this.backend.prepare('INSERT INTO users (id, name) VALUES (?, ?)').run(id, userConfig.name);
        else
            this.backend.prepare('UPDATE users SET name = ? WHERE id = ?').run(userConfig.name, id);
    }

    insertContext(id, data) {
        if (!this.backend.prepare('SELECT * FROM context WHERE id = ?').get(id))
            this.backend.prepare('INSERT INTO context (id, data) VALUES (?, ?)').run(id, data);
        else
            this.backend.prepare('UPDATE context SET data = ? WHERE id = ?').run(data, id);
    }

    getContext(id) {
        return this.backend.prepare('SELECT * FROM context WHERE id = ?').get(id);
    }

    getAllContexts() {
        return this.backend.prepare('SELECT * FROM context').all();
    }

    getMessage(id) {
        return this.backend.prepare('SELECT * FROM messages WHERE id = ?').get(id);
    }

    setMessage(id, text) {
        this.backend.prepare('INSERT INTO messages (id, content) VALUES (?, ?)').run(id, text);
    }
}

module.exports = new DatabaseInterface(db);