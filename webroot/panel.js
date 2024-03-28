function clone_elem(elem) {
	var cpy = elem.cloneNode();
	Array.from(elem.childNodes).forEach(child => {
		cpy.appendChild(clone_elem(child));
	});
	return cpy;
}

function sanitize(str) {
	return str.replace(/['"]/g, "\\$&");
}

function create_item_card(item) {
	var name = item.name;
	var owner = item.owner;
	var bids = item.bids;
	var desc = item.desc;
	var price = item.price;

	// set values, then copy
	elems.item_name.innerText = name || "Not provided";
	elems.item_owner.innerText = owner || "Not provided";
	elems.item_owner.innerHTML += `<br><span class="g bold">$${readable_price(price)}</span>`;

	for (var i = 0; i < 3; i++) {
		elems[`bid_price${i}`].innerText = "---";
		elems[`bid_name${i}`].innerText = "---";
		elems[`bid_time${i}`].innerText = "---";
	}

	bids.sort((a, b) => {
		return b.time - a.time;
	});

	for (var i in bids) {
		if (i > 2) break;
		// check if user placed bid

		elems[`bid_price${i}`].innerText = `$${readable_price(bids[i].price)}`;
		elems[`bid_name${i}`].innerHTML  = (data.private_bids.includes(bids[i].id)) ? "<strong>You</strong>" : ((bids[i].secrets !== undefined) ? bids[i].secrets.name : "Anonymous");

		elems[`bid_time${i}`].innerText  = readable_time(bids[i].time);
	}

	elems.item_bid.setAttribute("onclick", `toggle_bid_window('${sanitize(name) || "Not provided"}', '${sanitize(owner) || "Not provided"}', '${sanitize(desc) || "Not provided"}', ${price}, "${item.id}")`);
	elems.rollback.setAttribute("onclick", `rollback("${item.id}")`);
	elems.remove.setAttribute("onclick", `remove("${item.id}")`);

	var cpy = clone_elem(elems.dummy);
	cpy.classList.remove('hidden');
	cpy.setAttribute("name", "card_cpy");
	elems.items.insertBefore(cpy, elems.create_item);
}

function readable_time(time) {
	var now = Date.now();
	var total_seconds = Math.abs(Math.floor((now - time) / 1000));
	var total_minutes = Math.abs(Math.floor(total_seconds / 60));
	var total_hours   = Math.abs(Math.floor(total_minutes / 60));
	var total_days    = Math.abs(Math.floor(total_hours / 24));

	var seconds = total_seconds % 60;
	var minutes = total_minutes % 60;
	var hours = total_hours % 24;
	var days = total_days % 24;
	var years = Math.floor(total_days / 365.25);

	if (total_seconds < 1) return "Now";
	return `${years > 0 ? `${years}y ` : ``}${total_days > 0 ? `${days}d` : ``}${total_hours > 0 ? ` ${hours}h` : ``}${total_minutes > 0 ? ` ${minutes}m` : `${total_seconds > 0 ? ` ${seconds}s` : ``}`}`.trim();
}

// using data.auction
function create_all_cards() {
	elems.auction_name.innerText = data.auction.name;

	if (Object.keys(data.auction.items).length < 1) {
		elems.no_items.classList.remove('hidden');
		return;
	}
	elems.no_items.classList.add('hidden');

	for (var i in data.auction.items) {
		var item = data.auction.items[i];
		create_item_card(item);
	}
}

function readable_price(price) {
	return (price / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });	
}


function place_bid(id) {
	var price = elems.bid_price.value * 100;
	var item = data.auction.items[id];


	if (price < item.price + data.auction.config.min_raise) {
		alert(`Your bid does not meet the minimum price raise for this auction ($${readable_price(data.auction.config.min_raise)}).`);
		return err(elems.bid_price);
	}
	// do the actual api call here
	api.create_bid(data.auction.id, id, price, `${data.first_name} ${data.last_name}`, (res) => {
		if (res.code == 0) {
			data.private_bids.push(res.data.id);
			alert("Bid placed!");
		} else {
			alert("Something went wrong, please wait a moment and try again.");
			window.location.reload();
		}
		update_listing();
		toggle_bid_window();
	});
}

function update_listing() {
	api.list_auction(data.auction_id, (res) => {
		if (res.code !== 0) {
			alert("Something went wrong, please try again.");
			window.location.reload();
		}
		data.auction = res.data;
		
		// remove & refresh cards
		document.querySelectorAll('[name="card_cpy"]').forEach(elem => elem.remove());
		create_all_cards();

		save();
	});
}

function start() {
	hide(elems.splash);
	show(elems.panel);
	update_listing();
	setInterval(() => { update_listing() }, 5000);
	update_timer();
	setInterval(() => { update_timer() }, 1000);
}

function update_timer() {
	elems.auction_time.innerText = readable_time(data.auction.end);
}

function toggle_bid_window(name, owner, desc, price, id) {
	if (name == undefined) {
		hide(elems.bid_window_bg);
		hide(elems.bid_window);
		return;
	}

	elems.bid_item.innerText = name;
	elems.bid_owner.innerText = owner;
	elems.bid_desc.innerText = desc;
	elems.bid_payment_method.innerText = data.auction.config.payment;
	elems.bid_name.innerText = data.first_name + " " + data.last_name;
	elems.bid_current_price.innerText = '$' + readable_price(price);
	elems.bid_price.value = ((price + data.auction.config.min_raise) / 100).toFixed(2);

	elems.bid_button.setAttribute("onclick", `place_bid("${id}")`);

	show(elems.bid_window_bg);
	show(elems.bid_window);
}


// admin mode stuff - hi saul
function activate_admin() {
	var admin_elems = document.getElementsByClassName("admin");
	if (admin_elems.length == 0) return;
	data.adminpw = prompt("Enter the admin password for this auction");
	
	api.auth_admin(data.adminpw, data.auction.id, (res) => {
		if (res.code == -1) return alert("Invalid credentials");
		if (res.code !== 0) return alert("Something went wrong");

		// it updates for some reason so you have to iterate BACKWARDS which is kind of a pain...
		for (var i = admin_elems.length - 1; i >= 0; i--) {
			admin_elems[i].classList.remove("admin");
		}
		admin_mode = true;
		update_listing();
		alert("Admin mode active");
	});
}

function rollback(item) {
	if (confirm("Are you sure you want to remove the last bid on this item?")) {
		var bids = data.auction.items[item].bids;
		if (bids.length == 0) return alert("This item has no bids");
		bids.sort((a, b) => b.time - a.time);
		api.remove_bid(data.adminpw, data.auction.id, item, bids[0].id, (res) => {
			update_listing();
			if (res.code == 0) return alert("The last bid on this item was removed");
			alert("Something went wrong");
		});
	}
}

function remove(item) {
	if (confirm("Are you sure you want to remove this item?")) {
		if (confirm("This can't be undone.")) {
			if (confirm("Like, are you *really really* sure?")) {
				if (confirm("Because it would be *really* bad if you deleted it by mistake and needed it back.")) {
					if (confirm("Since you wouldn't actually be able to get it back.")) {
						if (confirm("So just to be clear")) {
							if (confirm("You *DO* want to delete this, right?")) {
								actually_remove(item);
							}	
						}
					}
				}
			}
		}
	}
}

function actually_remove(item) {
	api.remove_item(data.adminpw, data.auction.id, item, (res) => {
		update_listing();
		console.log(res);
		if (res.code !== 0) return alert("Something went wrong");
		alert("Item removed.");
	});
}

function create_item() {
	var name = elems.create_item_name.value.trim();
	var owner = elems.create_item_owner.value.trim();
	var desc = elems.create_item_desc.value.trim();
	var price = Math.floor(parseFloat(elems.create_item_price.value.trim()) * 100);

	// check if inputs are valid
	if (name == "" || owner == "" || desc == "" || isNaN(price) || price <= 0) {
		alert("Invalid inputs");

		if (name == "") err(elems.create_item_name);
		if (owner == "") err(elems.create_item_owner);
		if (desc == "") err(elems.create_item_desc);
		if (isNaN(price) || price <= 0) err(elems.create_item_price);

		return;
	}

	api.create_item(data.adminpw, name, owner, desc, price, data.auction.id, (res) => {
		if (res.code !== 0) return alert("Something went wrong");
		update_listing();
		alert("Item created");

		// yes, saul, there is a much better way to do this
		// and it's very ugly this way
		// but you know what
		// i really want a cheeseburger
		//
		// ...mmmmmmm...
		//
		// ...cheeseburger...
		elems.create_item_name.value = "";
		elems.create_item_owner.value = "";
		elems.create_item_desc.value = "";
		elems.create_item_price.value = "";
	});
}
