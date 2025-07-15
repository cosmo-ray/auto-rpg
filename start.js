
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
    },
    "iron longsword": {
	"len": 6,
	"pos": 13
    },
    "steel longsword": {
	"len": 6,
	"pos": 13
    },
    "iron spear": {
	"len": 8,
	"pos": 5
    },
    "steel spear": {
	"len": 8,
	"pos": 5
    }
}

const UNIT_ROW = 0
const UNIT_COLON = 1
const UNIT_TURN_TIMER = 2
const UNIT_ENEMY = 3
const UNIT_DMG_CANVA = 4

/*
 * attack positions:
 * sword: 8-12
 * oversize sprite: Universal-LPC-spritesheet/spritesheets/weapons/oversize/right hand/male/
 */

let turn_countdown = 0
let attacker = []
let atk_time = 1000000
let atk_cooldown = 100000
let dmg_time = 600000

function add_message(wid, msg)
{
    let msgs = wid.get("msgs");
    const wid_size = wid.get("wid-pix");

    if (!msgs) {
	msgs = yeCreateArray(wid, "msgs")
	ywCanvasNewRectangleExt(wid, 5, 5, wid_size.geti("w") - 10, 130,
				"rgba: 127 127 127 155", 3)
	ywCanvasNewRectangleExt(wid, 5, 5, wid_size.geti("w") - 10, 130,
				"rgba: 0 0 0 255", 2)
    }
    let txt = ywCanvasNewTextByStr(wid, 25, 15, msg)

    msgs.forEach(function (msg, i) {
	if (i < 4) {
	    ywCanvasMoveObjXY(msg, 0, 20);
	} else {
	    ywCanvasRemoveObj(wid, msg);
	    msgs.rm(i)
	}
    })
    yePushFront(msgs, txt);
}

function print_bar(wid, x, y, percent, color)
{
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

const FRONT = 1
const LEFT = 2
const RIGHT = 0

function move_guy(wid, i, j, to, where)
{
    let units = wid.get("units").get(i)
    let handlers = wid.get("handlers").get(i)
    let u = units.get(j)
    let h = handlers.get(j)
    let x_add = 0
    let y_add = 0

    if (where == FRONT) {
	str_where = "front row"
	x_add = -100 * (1 - (2 * i))
    } else if (where == LEFT) {
	y_add = -100
	str_where = "left side"
    } else if (where == RIGHT) {
	y_add = 100
	str_where = "right side"
    }
    yePushAt2(units, u, to)
    yePushAt2(handlers, h, to)
    ylpcsHandlerMoveXY(h, x_add, y_add)
    ylpcsHandlerRefresh(h)
    units.rm(j)
    handlers.rm(j)
    add_message(wid, "move " + yeGetString(u.get("name")) + " to " + str_where)
}

function find_enemy(units, i, j, weapon)
{
    let range = weapon.geti("range")
    let other_guy_i = 0

    if (i == 0)
	other_guy_i = 1

    let u = units.get(i).get(j)
    let other_guys = units.get(other_guy_i);
    if (range == -1) {
	for (let idx = 0; idx < 5; ++idx) {
	    if (other_guys.get(idx))
		return [other_guy_i, idx]
	}
    } else if (range == 0) {
	// can't attack in back row
	if (j > 2)
	    return null;
	if (other_guys.get(j)) {
	    return [other_guy_i, j]
	}
	if (j - 1 >= 0 && other_guys.get(j - 1)) {
	    return [other_guy_i, j - 1]
	}
	if (j + 1 <= 2 && other_guys.get(j + 1)) {
	    return [other_guy_i, j + 1]
	}
    } else if (range == 1) {
	// can only attack guy in front of you in backrow
	if (j > 2) {
	    if (other_guys.get(j - 3)) {
		return [other_guy_i, j - 3]
	    }
	    return null;
	}
	if (other_guys.get(j + 3)) {
	    return [other_guy_i, j + 3]
	}
	for (let idx = 0; idx < 3; ++idx) {
	    if (other_guys.get(idx))
		return [other_guy_i, idx]
	}
    }
    return null;
}

let atk_cnt = 0

function jrpg_auto_action(wid, eve)
{
    let all_units = yeGet(wid, "units")
    let turn_timer = ywidGetTurnTimer()
    const handler_h = ygGet("lpcs.y_threshold").toInt()

    if (all_units.get(1).len() == 0) {
	print("battle WIN\n");
	ygCallFuncOrQuit(wid, "win");
    } else if (all_units.get(0).len() == 0) {
	print("battle LOSE\n");
	ygCallFuncOrQuit(wid, "lose");
    }

    if (attacker.length > 0) {
	attacker = attacker.filter(function (a) {return a[UNIT_TURN_TIMER] < (atk_time + atk_cooldown)})

	for (a of attacker) {
	    let h = wid.get("handlers").get(a[UNIT_ROW]).get(a[UNIT_COLON])
	    if (!h) {
		if (a[UNIT_DMG_CANVA]) {
		    ywCanvasRemoveObj(wid, a[UNIT_DMG_CANVA]);
		    a[UNIT_DMG_CANVA] = null;
		}
		a[UNIT_TURN_TIMER] += 1000000
		continue;
	    }
	    let who = all_units.get(a[UNIT_ROW]).get(a[UNIT_COLON])
	    let w = who.get("weapon")
	    let w_info = weapons[yeGetStringAt(w, "name")]

	    if (a[UNIT_TURN_TIMER] > atk_time) {
		ylpcsHandlerSetOrigXY(h, good_orig_pos[0], good_orig_pos[1] + (2 * a[UNIT_ROW]))
		h.setAt("set_oversized_weapon", 0)
		if (a[UNIT_DMG_CANVA]) {
		    ywCanvasRemoveObj(wid, a[UNIT_DMG_CANVA]);
		    a[UNIT_DMG_CANVA] = null;
		}
	    } else {
		ylpcsHandlerSetOrigXY(h,
				      Math.abs(a[UNIT_TURN_TIMER] * w_info["len"] / atk_time),
				      w_info["pos"] + (2 * a[UNIT_ROW])
				     )
		h.setAt("oversize_weapon_y", 1  + (2 * a[UNIT_ROW]))
		h.setAt("set_oversized_weapon", 1)
	    }
	    ylpcsHandlerRefresh(h)
	    if (turn_timer + a[UNIT_TURN_TIMER] >= dmg_time && a[UNIT_TURN_TIMER] < dmg_time) {
		let enemy_info = a[UNIT_ENEMY]
		let attacked = all_units.get(enemy_info[UNIT_ROW]).get(enemy_info[UNIT_COLON])

		if (!attacked) {
		    add_message(wid, "MISS")
		    a[UNIT_TURN_TIMER] += turn_timer
		    continue;
		}

		let atk_power = w.geti("power") + who.get("stats").geti("strength")
		let tot_atk = atk_power - attacked.get("armor").geti("protect")
		if (tot_atk < 1)
		    tot_atk = 1;
		add_message(wid, yeGetStringAt(who, "name") + " deal " + tot_atk + " dmg to " + yeGetStringAt(attacked, "name") + " with " + yeGetStringAt(w, "name"))
		attacked.addAt("life", -tot_atk)
		let attacked_h = wid.get("handlers").get(enemy_info[UNIT_ROW]).get(enemy_info[UNIT_COLON])
		const h_pos = ylpcsHandlerPos(attacked_h)
		a[UNIT_DMG_CANVA] = ywCanvasNewTriangleExt(
		    wid, h_pos.geti(0) + 10, h_pos.geti(1) + 10,
		    h_pos.geti(0) + 20, h_pos.geti(1) + 40,
		    h_pos.geti(0) + 40, h_pos.geti(1) + 50,
		    "rgba: 255 50 50 190", 1);
		if (attacked.geti("life") < 2) {
		    let taunt = yeGetRandomElem(ygGet("taunts.strong_atk"))
		    let txt_o = ywCanvasNewTextByStr(wid, h_pos.geti(0) -10,
						     h_pos.geti(1) - 20, taunt.s())

		    if (attacked_h.get("taunt")) {
			ywCanvasRemoveObj(wid, attacked_h.get("taunt"))
		    }
		    attacked_h.setAt("taunt", txt_o)
		}

		if (attacked.geti("life") < 0) {
		    ywCanvasRemoveObj(wid, attacked_h.get("taunt"))
		    ylpcsRemoveCanvas(attacked_h)
		    all_units.get(a[UNIT_ENEMY][UNIT_ROW]).rm(a[UNIT_ENEMY][UNIT_COLON])
		    ywCanvasRemoveObj(wid, a[UNIT_DMG_CANVA])
		    a[UNIT_DMG_CANVA] = null;
		    wid.get("handlers").get(a[UNIT_ENEMY][UNIT_ROW]).rm(a[UNIT_ENEMY][UNIT_COLON])
		}
	    }
	    a[UNIT_TURN_TIMER] += turn_timer
	}
	return
    }
    for (let i = 0; i < 2; ++i)
	if (!all_units.get(i).get(0) &&
	    !all_units.get(i).get(1) &&
	    !all_units.get(i).get(2)) {
	    if (all_units.get(i).get(3))
		move_guy(wid, i, 3, 0, FRONT)
	    if (all_units.get(i).get(4))
		move_guy(wid, i, 4, 1, FRONT)
	    if (all_units.get(i).get(5))
		move_guy(wid, i, 5, 2, FRONT)
	}


    turn_countdown += turn_timer

    if (turn_countdown > 100000) {
	turn_countdown = 0
	remove_bars(wid)
	all_units.forEachNonNull(function (units, i) {
	    units.forEachNonNull(function (u, j) {
		let weapon = u.get("weapon")
		let armor = u.get("armor")
		let stats = u.get("stats")
		let to_add = 4 + stats.geti("agility") * 2 -
		    weapon.geti("maniability") - armor?.geti("heavy")

		if (to_add < 1)
		    to_add = 1
		u.addAt("atk-load", to_add)

		let h = wid.get("handlers").get(i).get(j)
		let h_pos = ylpcsHandePos(h)

		if (u.geti("atk-load") >= 100) {
		    let enemy = find_enemy(all_units, i, j, weapon)
		    if (enemy) {
			attacker.push([i, j, 0, enemy])
			++atk_cnt;
		    } else {
			if (j > 2 && !units.get(j - 3)) {
			    move_guy(wid, i, j, j - 3, FRONT)
			} else if (j == 2 && !units.get(j - 1)) {
			    move_guy(wid, i, j, j - 1, LEFT)
			} else if (j == 0 && !units.get(j + 1)) {
			    move_guy(wid, i, j, j + 1, RIGHT)
			} else {
			    add_message(wid, yeGetString(u.get("name")) + " armed with " +
					yeGetStringAt(weapon, "name") + " can't find a target")
			}
		    }
		    h_pos = ylpcsHandePos(h)
		    u.addAt("atk-load", -100)
		}
		print_bar(wid, h_pos.geti("x"), h_pos.geti("y") + handler_h,
			  u.geti("atk-load"), "rgba: 120 120 120 255")

		print_bar(wid, h_pos.geti("x"), h_pos.geti("y"),
			  u.geti("life") * 100 / u.geti("max_life"),
			  "rgba: 230 100 100 255")

		//yePrint(u.get("atk-load"))
	    })
	})
    }
}

function jrpg_auto_init(wid, map_str)
{
    yeConvert(wid, YHASH)
    ywSetTurnLengthOverwrite(-1)
    yeCreateString("canvas", wid, "<type>")
    if (!wid.get("background"))
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
    const bad_x_threshold = 60

    for (let j = 0; j < 2; ++j) {

	for (let i = 0; i < 3; ++i) {
	    let guy = yeGet(good_guy, i + 3 * j)

	    if (guy) {
		yeConvert(guy, YHASH)
		guy.setAt("atk-load", 70)
		let guy_h = ylpcsCreateHandler(guy, wid)
		ylpcsHandlerSetOrigXY(guy_h, good_orig_pos[0], good_orig_pos[1])
		ylpcsHandlerRefresh(guy_h)
		ylpcsHandlerSetPosXY(guy_h, window_width / 2 + good_x_threshold + 100 * j,
				     window_height / 3 + 110 * i)
		yePushAt2(good_handlers, guy_h, i + 3 * j)
	    }
	}
    }


    for (let j = 0; j < 2; ++j)
	for (let i = 0; i < 3; ++i) {
	    let guy = yeGet(bad_guy, i + 3 * j)

	    if (guy) {
		yeConvert(guy, YHASH)
		guy.setAt("atk-load", 70)
		let guy_h = ylpcsCreateHandler(guy, wid)
		ylpcsHandlerSetOrigXY(guy_h, bad_orig_pos[0], bad_orig_pos[1])
		ylpcsHandlerRefresh(guy_h)
		ylpcsHandlerSetPosXY(guy_h, bad_x_threshold + 100 - 100 * j,
				     window_height / 3 + 110 * i)
		yePushAt2(bad_handlers, guy_h, i + 3 * j)
	    }
	}


    return ret
}

function mod_init(mod)
{
    ygInitWidgetModule(mod, "jrpg-auto", yeCreateFunction("jrpg_auto_init"))
    ygAddModule(Y_MOD_YIRL, mod, "Universal-LPC-spritesheet")
    ygAddModule(Y_MOD_YIRL, mod, "taunts")
    ygAddModule(Y_MOD_YIRL, mod, "y_move")
    return mod
}
