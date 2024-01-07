
const good_orig_pos = [0, 9]
const bad_orig_pos = [0, 11]

const weapons = {
    "longsword": {
	"len": 6,
	"pos": 13
    },
    "bow": {
	"len": 13,
	"pos": 17
    },
    "spear": {
	"len": 8,
	"pos": 5
    }
}

/*
 * attack positions:
 * sword: 8-12
 * oversize sprite: Universal-LPC-spritesheet/spritesheets/weapons/oversize/right hand/male/
 */

let turn_countdown = 0
let attacker = []
let atk_time = 1000000
let atk_cooldown = 100000

function add_message(wid, msg)
{
    let msgs = wid.get("msgs");
    const wid_size = wid.get("wid-pix");

    if (!msgs) {
	msgs = yeCreateArray(wid, "msgs")
	ywCanvasNewRectangleExt(wid, 5, 5, wid_size.geti("w") - 10, 150,
				"rgba: 127 127 127 155", 3)
	ywCanvasNewRectangleExt(wid, 5, 5, wid_size.geti("w") - 10, 150,
				"rgba: 0 0 0 255", 2)
    }
    let txt = ywCanvasNewTextByStr(wid, 25, 15, msg)

    msgs.forEach(function (msg, i) {
	if (i < 4) {
	    ywCanvasMoveObjXY(msg, 0, 20);
	} else {
	    ywCanvasRemoveObj(wid, msg);
	    msgs.remove(i)
	}
    })
    yePushFront(msgs, txt);
}

function print_bar(wid, x, y, percent, color)
{
    print("print bar", x, y, percent)
    let bars = yeTryCreateArray(wid, "bars");

    let over_bar = ywCanvasNewRectangleExt(wid, x, y, 80, 12, "rgba: 220 220 220 255", 2)
    let percent_bar = ywCanvasNewRectangle(wid, x + 5, y + 2, 70 * percent / 100, 8, color)
    yePushBack(bars, over_bar)
    yePushBack(bars, percent_bar)
}

function remove_bars(wid)
{
    let bars = wid.get("bars")

    if (bars) {
	bars.forEach(function (b, _) {
	    ywCanvasRemoveObj(wid, b);
	})
	bars.clear();
    }
}

let atk_cnt = 0

function jrpg_auto_action(wid, eve)
{
    let all_units = yeGet(wid, "units")
    let turn_timer = ywidGetTurnTimer()
    const handler_h = ygGet("lpcs.y_threshold").toInt()

    if (attacker.length > 0) {
	attacker = attacker.filter(function (a) {return a[2] < (atk_time + atk_cooldown)})

	for (a of attacker) {
	    let h = wid.get("handlers").get(a[0]).get(a[1])
	    let w = all_units.get(a[0]).get(a[1]).get("weapon")
	    let w_info = weapons[yeGetStringAt(w, "name")]

	    yePrint(w)
	    //yePrint(h)
	    if (a[2] > atk_time) {
		ylpcsHandlerSetOrigXY(h, good_orig_pos[0], good_orig_pos[1] + (2 * a[0]))
		h.setAt("set_oversized_weapon", 0)
	    } else {
		ylpcsHandlerSetOrigXY(h,
				      Math.abs(a[2] * w_info["len"] / atk_time),
				      w_info["pos"] + (2 * a[0])
				     )
		h.setAt("oversize_weapon_y", 1  + (2 * a[0]))
		h.setAt("set_oversized_weapon", 1)
	    }
	    ylpcsHandlerRefresh(h)
	    a[2] += turn_timer
	}
	return
    }

    turn_countdown += turn_timer

    if (turn_countdown > 100000) {
	turn_countdown = 0
	remove_bars(wid)
	all_units.forEach(function (units, i) {
	    units.forEach(function (u, j) {
		yePrint(u.get("name"))
		print("j: ", j, "i: ", i)
		yePrint(u.get("atk-load"))
		print("agy:", u.get("stats").geti("agility"))
		print("heady:", u.get("armor")?.geti("heavy"))
		print("maniability:", u.get("weapon").geti("maniability"))
		let to_add = 4 + u.get("stats").geti("agility") -
		    u.get("weapon").geti("maniability") -
		    u.get("armor")?.geti("heavy")
		if (to_add < 1)
		    to_add = 1
		u.addAt("atk-load", to_add)

		print("get handler")
		let h = wid.get("handlers").get(i).get(j)
		print("handler pos")
		let h_pos = ylpcsHandePos(h)
		print("before print bar")

		print_bar(wid, h_pos.geti("x"),
			  h_pos.geti("y") + handler_h,
			  u.geti("atk-load"),
			  "rgba: 120 120 120 255")

		print_bar(wid, h_pos.geti("x"),
			  h_pos.geti("y"),
			  u.geti("life") * 100 / u.geti("max_life"),
			  "rgba: 230 100 100 255")

		if (u.geti("atk-load") >= 100) {
		    u.addAt("atk-load", -100)
		    attacker.push([i, j, 0])
		    add_message(wid, "attack " + atk_cnt)
		    ++atk_cnt;
		}
		yePrint(u.get("atk-load"))
	    })
	})
    }
}

function jrpg_auto_init(wid, map_str)
{
    yeConvert(wid, YHASH)
    ywSetTurnLengthOverwrite(-1)
    yeCreateString("canvas", wid, "<type>")
    yeCreateString("rgba: 255 255 255 255", wid, "background")
    yeCreateFunction(jrpg_auto_action, wid, "action")
    let units = yeGet(wid, "units")

    if (units == null) {
	units = ygFileToEnt(YJSON, "./units.json")
	yePush(wid, units, "units")
    }
    let ret = ywidNewWidget(wid, "canvas")
    add_message(wid, "Battle start !")
    add_message(wid, "Battle start ! 2")
    add_message(wid, "Battle start ! 3")
    add_message(wid, "Battle start ! 3")

    const wid_size = yeGet(wid, "wid-pix");
    const window_width = ywRectW(wid_size);
    const window_height = ywRectH(wid_size);

    let good_guy = yeGet(units, 0)
    let bad_guy = yeGet(units, 1)
    let good_handlers = yeCreateArray(wid, "good handler")
    let bad_handlers = yeCreateArray(wid, "bad handler")
    let handlers = yeCreateArray(wid, "handlers")
    yePushBack(handlers, good_handlers)
    yePushBack(handlers, bad_handlers)

    const good_x_threshold = 40
    const bad_x_threshold = 160

    for (let i = 0; i < 3; ++i) {
	let guy = yeGet(good_guy, i)

	if (guy) {
	    yeConvert(guy, YHASH)
	    guy.setAt("atk-load", 70)
	    let guy_h = ylpcsCreateHandler(guy, wid)
	    ylpcsHandlerSetOrigXY(guy_h, good_orig_pos[0], good_orig_pos[1])
	    ylpcsHandlerRefresh(guy_h)
	    ylpcsHandlerSetPosXY(guy_h, window_width / 2 + good_x_threshold,
				 window_height / 3 + 110 * i)
	    yePushAt2(good_handlers, guy_h, i)
	}
    }

    for (let i = 0; i < 3; ++i) {
	let guy = yeGet(good_guy, i + 3)

	if (guy) {
	    yeConvert(guy, YHASH)
	    guy.setAt("atk-load", 70)
	    let guy_h = ylpcsCreateHandler(guy, wid)
	    ylpcsHandlerSetOrigXY(guy_h, good_orig_pos[0], good_orig_pos[1])
	    ylpcsHandlerRefresh(guy_h)
	    ylpcsHandlerSetPosXY(guy_h, window_width / 2 + good_x_threshold + 100,
				 window_height / 3 + 110 * i)
	    yePushAt2(good_handlers, guy_h, i + 3)
	}
    }

    for (let i = 0; i < 3; ++i) {
	let guy = yeGet(bad_guy, i)

	if (guy) {
	    yeConvert(guy, YHASH)
	    guy.setAt("atk-load", 70)
	    let guy_h = ylpcsCreateHandler(guy, wid)
	    ylpcsHandlerSetOrigXY(guy_h, bad_orig_pos[0], bad_orig_pos[1])
	    ylpcsHandlerRefresh(guy_h)
	    ylpcsHandlerSetPosXY(guy_h, bad_x_threshold,
				 window_height / 3 + 110 * i)
	    yePushAt2(bad_handlers, guy_h, i)
	}
    }

    for (let i = 0; i < 3; ++i) {
	let guy = yeGet(bad_guy, i + 3)

	if (guy) {
	    yeConvert(guy, YHASH)
	    guy.setAt("atk-load", 70)
	    let guy_h = ylpcsCreateHandler(guy, wid)
	    ylpcsHandlerSetOrigXY(guy_h, bad_orig_pos[0], bad_orig_pos[1])
	    ylpcsHandlerRefresh(guy_h)
	    ylpcsHandlerSetPosXY(guy_h, bad_x_threshold + 100,
				 window_height / 3 + 110 * i)
	    yePushAt2(bad_handlers, guy_h, i + 3)
	}
    }


    return ret
}

function mod_init(mod)
{
    ygInitWidgetModule(mod, "jrpg-auto", yeCreateFunction("jrpg_auto_init"))
    ygAddModule(Y_MOD_YIRL, mod, "Universal-LPC-spritesheet")
    ygAddModule(Y_MOD_YIRL, mod, "y_move")
    return mod
}
