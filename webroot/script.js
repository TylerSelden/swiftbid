
var elems = {};
var admin_mode = false;

window.onload = function() {
	// fill elems
	var tmp = document.querySelectorAll("[id]");
	tmp.forEach((element) => {
		elems[element.id] = element;
	});

	// check if URL contains code already
	var url = new URL(window.location);
	var code = url.searchParams.get("code");
	if (load()) return;
	if (code) {
		try {
			elems.auction_code.value = code;
		} catch {
			err();
		}
	}
}

function show(elem) {
	elem.classList.remove('hidden');
}
function hide(elem) {
	elem.classList.add('hidden');
}
function scrollTo(elem) {
	if(window.CSS.supports('scroll-behavior', 'smooth')) {
		elem.scrollIntoView({ behavior: "smooth", block: "center" });
	}
}


function err(elem, msg) {
	if (msg) alert(msg);
	
//	document.activeElement.blur();
	elem.blur();

	var className = (window.getComputedStyle(elem).getPropertyValue('animation-name') == "fade-in") ? "error" : "error-no-fade";

	console.log(className);

	elem.classList.add(className);
	setTimeout(() => {
		elem.classList.remove(className);
	}, 1000);
}

function step_two() {
	var code = elems.auction_code.value.trim().toUpperCase();

	if (!/^[A-Z]{6}$/.test(code)) return err(elems.auction_code, "Invalid auction code");

	data.code = code;

	show(elems.step_two);
	elems.first_name.focus();
	scrollTo(elems.step_two);
}

function step_three() {
	var first_name = elems.first_name.value.trim();
	var last_name = elems.last_name.value.trim();

	if (!/^[A-Za-z0-9.'\- ]{3,}$/.test(first_name)) {
		first_name = null;
		err(elems.first_name, "Invalid name");
	}
	if (!/^[A-Za-z0-9.'\- ]{3,}$/.test(last_name)) {
		last_name = null;
		err(elems.last_name, first_name == null ? null : "Invalid name");
	}
	if (first_name == null || last_name == null) return;

	data.first_name = first_name;
	data.last_name = last_name;

	hide(elems.step_fail);
	hide(elems.step_four);
	show(elems.step_three);
	scrollTo(elems.step_three);

	// get auction data
	api.get_auction_id(data.code, (res) => {
		if (res.code !== 0) {
			localStorage.removeItem("swiftbid_data");
			step_fail(`The auction code you entered (${data.code}) is invalid. Please check for typos and try again.`);
			return;
		}
		data.auction_id = res.data;
		
		// to make it look good i guess
		setTimeout(() => {
			api.list_auction(data.auction_id, (res) => {
				if (res.code == -4) {
					console.log(res);
					if (Date.now() < res.data.start) step_fail("This auction has not started yet.");
					if (Date.now() > res.data.end) step_fail("This auction has ended already.");
					return;
				}

				data.auction = res.data;
				step_four();
			});
		}, 750);
	});
}


function step_four() {
	hide(elems.step_three);

	elems.name_conf.innerText = data.first_name + " " + data.last_name;
	elems.auction_code_conf.innerText = data.auction.code;
	elems.auction_name_conf.innerText = data.auction.name;

	show(elems.step_four);
	elems.start.focus();
}

function step_fail(msg) {
	hide(elems.step_three);

	elems.err_msg.innerText = msg;

	show(elems.step_fail);
	alert(msg);
}

function save() {
	localStorage.setItem("swiftbid_data", JSON.stringify(data));
}

function load() {
	var savedata = JSON.parse(localStorage.getItem("swiftbid_data"));
	if (savedata !== null) {
		data = savedata;
		elems.auction_code.value = data.code;
		step_two();
		elems.first_name.value = data.first_name;
		elems.last_name.value = data.last_name;
		step_three();

		return true;
	}
	return false;
}

function leave() {
	if (confirm("Are you sure you'd like to leave this auction? All bids you've placed will be forgotten by your device, but not erased from the auction.")) {
		localStorage.removeItem("swiftbid_data");
		alert("Successfully left auction.");
		window.location.reload();
	}
}

function dummy_fn() {
	alert("The old really funny error message got deleted by accident :(");
}
