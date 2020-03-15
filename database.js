const sqlite = require('better-sqlite3')

class Database {
  constructor() {
    this.db = new sqlite('.data/database.db', { verbose: x => console.info(`>> ${x}`) })
    this.setup()
  }

  setup() {
    const stmt = this.db.prepare('CREATE TABLE IF NOT EXISTS files(doc TEXT);')
    stmt.run()
  }

  insertFile(filename, originalName) {
    const data = {
      filename,
      originalName,
      createdAt: Date.now()
    }
    const stmt = this.db.prepare('INSERT INTO files(doc) VALUES(?);')
    stmt.run(JSON.stringify(data))
  }

  deleteFile(filename) {
    const stmt = this.db.prepare("DELETE FROM files WHERE json_extract(doc, '$.filename') = ?;")
    stmt.run(filename)
  }

  getAllFiles() {
    const stmt = this.db.prepare("SELECT doc FROM files ORDER BY json_extract(doc, '$.createdAt') DESC;")
    const files = stmt.pluck().all()
    console.log(files)
    return files.map(file => JSON.parse(file))
  }

}

module.exports = Database