// initial setup
const fs = require('fs');
const express = require('express');
const https = require('https');
const cors = require('cors');

const app = express();

const utils = require('./utils.js');

// initialize json

var auctions = {};

var config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
var ssl = {
	key: fs.readFileSync('./ssl/key.pem', 'utf8'),
	cert: fs.readFileSync('./ssl/cert.pem', 'utf8')
}


app.use(express.json());
app.use(cors({ origin: "*" }));
app.use((err, req, res, next) => {
	if (err.status == 400) return res.sendStatus(err.status);
	next(err);
});

function err(err) {
	console.warn(`${new Date().toLocaleString()}: Error caught (${err.toString().length > 25 ? err.toString().substring(0, 25) + "..." : err.toString()}), check ${config.save.error} for more information. `);
	fs.appendFileSync(config.save.error, `${new Date().toLocaleString()}: ${err.toString()}\n`);
}

// the actual stuff

// helper functions
function is_root(msg) {
	// check root pass
	if (msg.rootpw == config.rootpw) return true;
	return false;
}
function is_admin(msg) {
	// check root
	if (is_root(msg)) return true;
	if (!auction_exists(msg)) return false;
	if (auctions[msg.auction].secrets.adminpw == msg.adminpw) return true;
	return false;
}
function code_to_uuid(msg) {
	for (var i in auctions) {
		if (auctions[i].code == msg.code) return i;
	}
	return false;
}
function auction_exists(msg) {
	if (auctions[msg.auction] == undefined) return false;
	return true;
}
function auction_is_ongoing(msg) {
	if (!auction_exists(msg)) return false;
	var start = auctions[msg.auction].start;
	var end = auctions[msg.auction].end;
	var now = Date.now();
	if (now < start || now > end) return false;
	return true;
}
   //\\
  //  \\
 //    \\
//      \\
function item_exists(msg) {
	if (!auction_exists(msg)) return false;
	if (auctions[msg.auction].items[msg.item] == undefined) return false;
	return true;
}

function remove_secrets(obj) {
	for (var key in obj) {
		if (key == "secrets") {
			delete obj.secrets;
		} else if (typeof(obj[key]) == "object") {
			remove_secrets(obj[key]);
		}
	}
}

var status_codes = {
	"-4": "Auction is not ongoing",
	"-3": "Minimum raise not met",
	"-2": "Resource not found",
	"-1": "Invalid credentials",
	"0":  "Success",
	"1":  "Generic error"
}

function send(res, code, data, allow_secrets) {
	var message = "Unknown error";
	if (status_codes[code.toString()] !== undefined) message = status_codes[code.toString()];

	// remove secrets
	if (data !== undefined && allow_secrets !== true) {
		data = JSON.parse(JSON.stringify(data));
		remove_secrets(data);
	}
	res.json({ code: code, message: message, data: data });
}

// root
// (rootpw, name, start, end, min_raise, payment adminpw) -> auction
app.post('/api/create_auction', (req, res) => {
	try {
		var msg = req.body;
		if (!is_root(msg)) return send(res, -1);
		var auction = new utils.auction(msg.name, msg.start, msg.end, msg.min_raise, msg.payment, msg.adminpw);
		auctions[auction.id] = auction;
		send(res, 0, auction);
	} catch (e) {
		err(e);
		send(res, 1);
	}
});

// root, dev
// (rootpw) -> auctions
app.post('/api/list_auctions', (req, res) => {
	try {
		var msg = req.body;
		if (!is_root(msg)) return send(res, -1);
		send(res, 0, auctions, true);
	} catch (e) {
		err(e);
		send(res, 1);
	}
});

// (auction) -> auction
app.post('/api/list_auction', (req, res) => {
	try {
		var msg = req.body;
		if (!auction_exists(msg)) return send(res, -2);
		if (!auction_is_ongoing(msg)) return send(res, -4, { start: auctions[msg.auction].start, end: auctions[msg.auction].end });
		send(res, 0, auctions[msg.auction], is_admin(msg));
	} catch (e) {
		err(e);
		send(res, 1);
	}
});

// (code) -> auction
app.post('/api/get_auction_id', (req, res) => {
	try {
		var msg = req.body;
		var id = code_to_uuid(msg);
		if (id == false) return send(res, -2);
		send(res, 0, id);
	} catch (e) {
		err(e);
		send(res, 1);
	}
});






// root, admin
// (rootpw/adminpw, name, owner, desc, price, auction) -> item
app.post('/api/create_item', (req, res) => {
	try {
		var msg = req.body;
		if (!auction_exists(msg)) return send(res, -2);
		if (!is_admin(msg)) return send(res, -1);
		var auction = auctions[msg.auction];
		var item = new utils.item(msg.name, msg.owner, msg.desc, msg.price, msg.auction);
		auction.items[item.id] = item;
		send(res, 0, item);
	} catch (e) {
		err(e);
		send(res, 1);
	}
});

// (auction, item, price, name) -> bid
app.post('/api/create_bid', (req, res) => {
	try {
		var msg = req.body;
		// item_exists checks for auction too
		if (!item_exists(msg)) return send(res, -2);
		if (!auction_is_ongoing(msg)) return send(res, -4, { start: auctions[msg.auction].start, end: auctions[msg.auction].end });
		var auction = auctions[msg.auction];
		var item = auction.items[msg.item];
		var bid = new utils.bid(msg.name, msg.price);

		if (bid.price < item.price + auction.config.min_raise) return send(res, -3);
		item.bids.push(bid);
		item.price = bid.price;
		send(res, 0, bid);
	} catch (e) {
		err(e);
		send(res, -1);
	}
});


// root, admin
// (rootpw/adminpw, auction, item, bid)
app.post('/api/remove_bid', (req, res) => {
	try {
		var msg = req.body;
		if (!is_admin(msg)) return send(res, -1);
		if (!item_exists(msg)) return send(res, -2);

		var auction = auctions[msg.auction];
		var item = auction.items[msg.item];
		var bid;
		// yes there's probably a better way to do this i know
		for (var i in item.bids) {
			if (item.bids[i].id == msg.bid) bid = i;
		}
		if (bid == undefined) return send(res, -2);

		bid = item.bids.splice(bid, 1);
		
		// again a much better way to do this is definitely out there
		item.price = 0;
		for (var i in item.bids) {
			if (item.bids[i].price > item.price) item.price = item.bids[i].price;
		}
		if (item.bids.length == 0) item.price = item.origprice;

		send(res, 0, bid, true);
	} catch (e) {
		err(e);
		send(res, 1);
	}
});


// (rootpw/adminpw, auction) -> [true/false]
app.post('/api/auth_admin', (req, res) => {
	try {
		var msg = req.body;
		if (is_admin(msg)) {
			send(res, 0);
		} else {
			send(res, -1);
		}
	} catch (e) {
		err(e);
		send(res, 1);
	}
});

// root, admin
// (rootpw/adminpw, auction, item)
app.post('/api/remove_item', (req, res) => {
	try {
		var msg = req.body;
		if (!is_admin(msg)) return send(res, -1);
		if (!item_exists(msg)) return send(res, -2);

		var auction = auctions[msg.auction];
		var item_cpy = JSON.parse(JSON.stringify(auction.items[msg.item]));
		
		delete auction.items[msg.item];
		send(res, 0, item_cpy);
	} catch (e) {
		err(e);
		send(res, 1);
	}
});

// root
// (rootpw, auction) -> auction
app.post('/api/remove_auction', (req, res) => {
	try {
		var msg = req.body;
		if (!is_root(msg) && !(config.admin_can_remove_auction && is_admin(msg))) return send(res, -1);
		// if admin is able to delete their auction, they can, if not, only root can
		if (!auction_exists(msg)) return send(res, -2);

		var auction_cpy = JSON.parse(JSON.stringify(auctions[msg.auction]));
		delete auctions[msg.auction];
		send(res, 0, auction_cpy);
	} catch (e) {
		err(e);
		send(res, 1);
	}

});

// for testing
app.get('/api', (req, res) => {
	return res.json({ code: 0, message: "Success" });
});


// restore if necessary
if (config.save.restore) load();

https.createServer({
	key: ssl.key,
	cert: ssl.cert
}, app).listen(config.port);

console.log(`REST API running on port ${config.port}.`);

function save() {
	try {
		fs.writeFileSync(config.save.file, JSON.stringify(auctions, null, '  '));
	} catch (e) {
		err(e);
	}
}

function load() {
	console.log(`Restoring from ${config.save.file}...`);
	try {
		auctions = JSON.parse(fs.readFileSync(config.save.file, 'utf8'));
	} catch (e) {
		err(e);
	}
}


if (config.save.interval > 0) setInterval(save, config.save.interval);
