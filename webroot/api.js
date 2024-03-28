var data = { private_bids: [] }

var api = {
	call: function(method, url, data, callback) {
		var xhr = new XMLHttpRequest();
		xhr.open(method, url, true);
		xhr.setRequestHeader('Content-Type', 'application/json');
	
		xhr.onreadystatechange = () => {
			if (xhr.readyState == 4) {
				if (xhr.status == 200) {
					try {
						callback(JSON.parse(xhr.responseText));
					} catch (e) {
						console.error(e);
						callback(xhr.responseText);
					}
				} else {
					alert("Something went wrong, please try again. If the issue continues, please contact an administrator.");
				}
			}
		}
		xhr.send(JSON.stringify(data));
	},
	base_url: "https://server.benti.dev:8081/api",
	list_auction: function(auction, callback) {
		var req = { auction };
		if (admin_mode) req.adminpw = data.adminpw;
		this.call(
			"POST",
			`${this.base_url}/list_auction`,
			req,
			callback
		);
	},
	get_auction_id: function(code, callback) {
		this.call(
			"POST",
			`${this.base_url}/get_auction_id`,
			{ code },
			callback
		);
	},
	create_bid: function(auction, item, price, name, callback) {
		this.call(
			"POST",
			`${this.base_url}/create_bid`,
			{ auction, item, price, name },
			callback
		);
	},
	remove_bid: function(adminpw, auction, item, bid, callback) {
		this.call(
			"POST",
			`${this.base_url}/remove_bid`,
			{ adminpw, auction, item, bid },
			callback
		);
	},
	remove_item: function(adminpw, auction, item, callback) {
		this.call(
			"POST",
			`${this.base_url}/remove_item`,
			{ adminpw, auction, item },
			callback
		);
	},
	auth_admin: function(adminpw, auction, callback) {
		this.call(
			"POST",
			`${this.base_url}/auth_admin`,
			{ adminpw, auction },
			callback
		);
	},
	create_item: function(adminpw, name, owner, desc, price, auction, callback) {
		this.call(
			"POST",
			`${this.base_url}/create_item`,
			{ adminpw, name, owner, desc, price, auction },
			callback
		);
	},
	test: function(callback) {
		this.call(
			"GET",
			this.base_url,
			{},
			callback
		);
	}
}
