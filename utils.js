const { v4: uuid } = require('uuid');

function code() {
//	return "KCRMNQ";
	return Array.from({length: 6}, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('').toUpperCase();
}

// start, end ========
function auction(name, start, end, min_raise, payment, adminpw) {
	if (typeof(name) !== "string" || typeof(start) !== "number" || typeof(end) !== "number" || typeof(min_raise) !== "number" || typeof(adminpw) !== "string" || typeof(payment) !== "string") throw new Error("Missing parameter");
	var data = {
		id: uuid(),
		code: code(),
		name: name,
		start: start,
		end: end,
		items: {},
		time: Date.now(),

		config: {
			min_raise: min_raise,
			payment: payment
		},
		secrets: {
			adminpw: adminpw
		}
	};
	return data;
}

function item(name, owner, desc, price, auction) {
	if (typeof(name) !== "string" || typeof(owner) !== "string" || typeof(desc) !== "string" || typeof(price) !== "number" || typeof(auction) !== "string") throw new Error("Missing parameter");
	var data = {
		id: uuid(),
		name: name,
		owner: owner,
		desc: desc,
		auction: auction,
		origprice: price,
		price: price,
		time: Date.now(),
		bids: []
	};
	return data;
}

function bid(name, price) {
	if (typeof(name) !== "string" || typeof(price) !== "number") throw new Error("Missing parameter");
	var data = {
		id: uuid(),
		price: price,
		time: Date.now(),
		secrets: {
			name: name
		}
	};
	return data;
}


module.exports = {uuid, auction, item, bid}
