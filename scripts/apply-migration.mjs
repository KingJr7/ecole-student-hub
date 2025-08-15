import sqlite3 from 'sqlite3';
import fs from 'fs';

const db = new sqlite3.Database('database.sqlite');
const sql = fs.readFileSync('migration.sql').toString();

db.exec(sql, function(err){
    if (err) {
        console.error(err);
        return;
    }
    console.log('Database schema created successfully.');
});

db.close();
