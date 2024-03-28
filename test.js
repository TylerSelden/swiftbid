const sqlite = require('sqlite3').verbose();
var db = new sqlite.Database('db.sqlite');
const queries = require('./queries.js');



db.serialize(() => {
	db.exec(queries.init);
	
	db.all(queries.read_auctions, (err, rows) => { console.log(rows) });
});
