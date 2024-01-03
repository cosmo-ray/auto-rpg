
const good_orig_pos = [1, 1]
const bad_orig_pos = [1, 3]

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

function jrpg_auto_action(wid, eve)
{
    print("action !\n")
}

function jrpg_auto_init(wid, map_str)
{
    yeConvert(wid, YHASH)
    yeCreateString("canvas", wid, "<type>")
    yeCreateString("rgba: 255 255 255 255", wid, "background")
    yeCreateFunction(jrpg_auto_action, wid, "action")
    var units = yeGet(wid, "units")

    if (units == null) {
	units = ygFileToEnt(YJSON, "./units.json")
	yePush(wid, units, "units")
    }
    let ret = ywidNewWidget(wid, "canvas")
    const wid_size = yeGet(wid, "wid-pix");
    const window_width = ywRectW(wid_size);
    const window_height = ywRectH(wid_size);

    yePrint(units)
    let good_guy = yeGet(units, 0)
    let bad_guy = yeGet(units, 1)
    let good_handlers = yeCreateArray(wid, "good handler")
    let bad_handlers = yeCreateArray(wid, "bad handler")

    const good_x_threshold = 40
    const bad_x_threshold = 100

    yePrint(good_guy)
    for (let i = 0; i < 3; ++i) {
	let guy = yeGet(good_guy, i)
	yeConvert(guy, YHASH)

	if (guy) {
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
	yeConvert(guy, YHASH)

	if (guy) {
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
	yeConvert(guy, YHASH)

	if (guy) {
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
	yeConvert(guy, YHASH)

	if (guy) {
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
