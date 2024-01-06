
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
const good_sword_swing = 13
const bad_sword_swing = 15
const sword_swing_len = 6

const good_spear_thrust = 5
const bad_spear_thrust = 7
const spear_thrust_len = 8

const good_arc_shoot = 17
const bad_arc_shoot = 19
const arc_shoot_len = 13


/*
 * attack positions:
 * sword: 8-12
 * oversize sprite: Universal-LPC-spritesheet/spritesheets/weapons/oversize/right hand/male/
 */

let turn_countdown = 0
let attacker = []
let atk_time = 1000000
let atk_cooldown = 100000

function jrpg_auto_action(wid, eve)
{
    let all_units = yeGet(wid, "units")
    let turn_timer = ywidGetTurnTimer()

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

    if (turn_countdown > 400000) {
	turn_countdown = 0
	all_units.forEach(function (units, i) {
	    units.forEach(function (u, j) {
		yePrint(u.get("name"))
		print("j: ", j, "i: ", i)
		yePrint(u.get("atk-load"))
		print("agy:", u.get("stats").geti("agility"))
		print("heady:", u.get("armor")?.geti("heavy"))
		print("maniability:", u.get("weapon").geti("maniability"))
		let to_add = 10 + u.get("stats").geti("agility") -
		    u.get("weapon").geti("maniability") -
		    u.get("armor")?.geti("heavy")
		if (to_add < 1)
		    to_add = 1
		u.addAt("atk-load", to_add)
		if (u.geti("atk-load") >= 100) {
		    u.addAt("atk-load", -100)
		    attacker.push([i, j, 0])
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
    const bad_x_threshold = 100

    for (let i = 0; i < 3; ++i) {
	let guy = yeGet(good_guy, i)

	if (guy) {
	    yeConvert(guy, YHASH)
	    guy.setAt("atk-load", 70)
	    let guy_h = ylpcsCreateHandler(guy, wid)
	    ylpcsHandlerSetOrigXY(guy_h, good_orig_pos[0], good_orig_pos[1])
	    ylpcsHandlerRefresh(guy_h)
	    ylpcsHandlerSetPosXY(guy_h, window_width / 2 + good_x_threshold,
				 window_height / 3 + 70 * i)
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
				 window_height / 3 + 70 * i)
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
				 window_height / 3 + 70 * i)
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
				 window_height / 3 + 70 * i)
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
