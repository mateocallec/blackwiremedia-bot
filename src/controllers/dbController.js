const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

/**
 * @class DBController
 * @brief Controller for SQLite database operations related to CVE vulnerabilities.
 */
class DBController {
    constructor() {
        const dbFolder = path.resolve(__dirname, '../../data');
        if (!fs.existsSync(dbFolder)) {
            fs.mkdirSync(dbFolder, { recursive: true });
            console.log(`[DB] ✅ Created data folder at ${dbFolder}`);
        }

        this.db = new sqlite3.Database(path.join(dbFolder, 'database.db'), (err) => {
            if (err) console.error('[DB] ❌ Failed to open database:', err.message);
            else console.log('[DB] ✅ Database connected.');
        });

        this.initDB();
    }

    /**
     * @brief Initializes the database with required tables if they don't exist.
     */
    initDB() {
        this.db.run(`
            CREATE TABLE IF NOT EXISTS vulnerabilities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cve_id TEXT UNIQUE NOT NULL,
                cvss_score REAL NOT NULL,
                published_at DATETIME NOT NULL,
                post_title TEXT,
                post_content TEXT,
                description TEXT,
                raw_data JSON,
                used INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('[DB] ❌ Failed to initialize table:', err.message);
            else console.log('[DB] ✅ Table "vulnerabilities" ready.');
        });
    }

    /**
     * @brief Inserts a vulnerability into the database.
     * @param {Object} cve CVE object containing data to insert.
     * @return {Promise<number>} The ID of the inserted row.
     */
    async insertVulnerability(cve) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO vulnerabilities (cve_id, cvss_score, published_at, post_title, post_content, description, raw_data, used)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [cve.cve_id, cve.cvss_score, cve.published_at, cve.post_title, cve.post_content, cve.description, JSON.stringify(cve.raw_data), 0],
                function (err) {
                    if (err) {
                        console.error(`[DB] ❌ Failed to insert CVE ${cve.cve_id}:`, err.message);
                        reject(err);
                    } else {
                        console.log(`[DB] ✅ Inserted CVE ${cve.cve_id} with ID ${this.lastID}`);
                        resolve(this.lastID);
                    }
                }
            );
        });
    }

    /**
     * @brief Checks if a CVE already exists in the database.
     * @param {string} cve_id CVE identifier.
     * @return {Promise<boolean>} True if exists, false otherwise.
     */
    async cveExists(cve_id) {
        return new Promise((resolve) => {
            this.db.get(
                `SELECT 1 FROM vulnerabilities WHERE cve_id = ?`,
                [cve_id],
                (err, row) => {
                    if (err) {
                        console.error(`[DB] ❌ Error checking CVE ${cve_id}:`, err.message);
                        resolve(false);
                    } else resolve(!!row);
                }
            );
        });
    }

    /**
     * @brief Retrieves a list of unused vulnerabilities with post content.
     * @param {number} limit Maximum number of records to retrieve.
     * @return {Promise<Array>} Array of vulnerability rows.
     */
    async getVulnerabilities(limit = 10) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT * FROM vulnerabilities 
                 WHERE post_content IS NOT NULL 
                 AND used = 0 
                 ORDER BY published_at DESC 
                 LIMIT ?`,
                [limit],
                (err, rows) => {
                    if (err) {
                        console.error('[DB] ❌ Failed to fetch vulnerabilities:', err.message);
                        reject(err);
                    } else resolve(rows);
                }
            );
        });
    }

    /**
     * @brief Marks a vulnerability as used after posting.
     * @param {string} cve_id CVE identifier.
     * @return {Promise<number>} Number of rows updated.
     */
    async markLineAsUsed(cve_id) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE vulnerabilities SET used = 1 WHERE cve_id = ?`,
                [cve_id],
                function (err) {
                    if (err) {
                        console.error(`[DB] ❌ Failed to mark CVE ${cve_id} as used:`, err.message);
                        reject(err);
                    } else {
                        console.log(`[DB] ✅ Marked CVE ${cve_id} as used`);
                        resolve(this.changes);
                    }
                }
            );
        });
    }

    /**
     * @brief Closes the database connection.
     */
    close() {
        this.db.close((err) => {
            if (err) console.error('[DB] ❌ Error closing database:', err.message);
            else console.log('[DB] ✅ Database connection closed.');
        });
    }
}

module.exports = DBController;
