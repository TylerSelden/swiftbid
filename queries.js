const queries = {
	init: `
	CREATE TABLE IF NOT EXISTS auctions (
		name TEXT,
		id TEXT,
		code INTEGER,
		expires INTEGER
	);
	`,
	list_tables: `
	SELECT NAME FROM sqlite_master WHERE type='table';
	`,
	read_auctions: `
	SELECT * FROM auctions;
	`
};

module.exports = queries;
