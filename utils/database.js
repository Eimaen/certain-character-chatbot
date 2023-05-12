const sqlite = require('better-sqlite3');
const db = sqlite('database/data.sqlite');

db.exec('CREATE TABLE IF NOT EXISTS guilds (id TEXT UNIQUE PRIMARY KEY, channel TEXT)');

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
}

module.exports = new DatabaseInterface(db);