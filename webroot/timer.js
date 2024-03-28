var ctx;

function show_timer_frame() {
	elems.circle.style.background = `url(${elems.timer.toDataURL()})`
}

function draw_timer_frame() {
	
}

// this is all unused code

function timer_init() {
	ctx = elems.timer.getContext("2d");

	ctx.fillStyle = "red";
	ctx.fillRect(0, 0, 100, 100);

	show_timer_frame();
}
