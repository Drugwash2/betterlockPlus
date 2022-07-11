//  betterlockPlus - an improvement over the original 'betterlock' by entelechy.
// This is FOSS and shall remain FOSS. Drugwash, 2022.05
const Applet = imports.ui.applet;
const AppletManager = imports.ui.appletManager;
const Cinnamon = imports.gi.Cinnamon;
const Clutter = imports.gi.Clutter;
const St = imports.gi.St;
const Gdk = imports.gi.Gdk;
const Gtk = imports.gi.Gtk;
//const Keymap = Gdk.Keymap.get_default(); // deprecated since Gdk 3.22
const Keymap = Gdk.Keymap.get_for_display(Gdk.Display.get_default());
const Caribou = imports.gi.Caribou;
const PopupMenu = imports.ui.popupMenu;
const Lang = imports.lang;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const Settings = imports.ui.settings;
const ModalDialog = imports.ui.modalDialog;
const Util = imports.misc.util;	// only for the timeout
const Interfaces = imports.misc.interfaces;
const BrightnessBusName = "org.cinnamon.SettingsDaemon.Power.Screen";
const KeyboardBusName = "org.cinnamon.SettingsDaemon.Power.Keyboard";
var z;
try { z = Caribou.XAdapter.get_default() }
catch(e) { z = Caribou.DisplayAdapter.get_default() }
const Adapt = z;
const APPNAME = "Num/Caps/Scroll Lock+";
const UUID = "betterlockPlus@drugwash";
const ICON_SIZE = 18;
const SPC = 1;
const FSZ = 8; 		// font size for the tooltip
const Samstep = 14.2857143;	//  seven steps in Samsung R-580 notebook
const bltkeyU = 0x1008FF02; // backlight Up
const bltkeyD = 0x1008FF03; // backlight Down
const kltkeyT = 0x1008FF04; // keylight Toggle
const kltkeyU = 0x1008FF05; // keylight Up
const kltkeyD = 0x1008FF06; // keylight Down
const debug = false;

// l10n/translation
const GLib = imports.gi.GLib;
const Gettext = imports.gettext;
Gettext.bindtextdomain(UUID, GLib.get_home_dir() + "/.local/share/locale");

function _(str) {
	return Gettext.dgettext(UUID, str);
}

function MyApplet(metadata, orientation, panel_height, instance_id) {
	this._init(metadata, orientation, panel_height, instance_id);
}

MyApplet.prototype = {
	__proto__: Applet.Applet.prototype,

	_init: function(metadata, orientation, panel_height, instance_id) {
		Applet.Applet.prototype._init.call(this, orientation, panel_height, instance_id);
		if (Applet.hasOwnProperty("AllowedLayout"))
			this.setAllowedLayout(Applet.AllowedLayout.BOTH);

		this._meta = metadata; this.instance_id = instance_id;
		this.orient = (orientation == St.Side.LEFT || orientation == St.Side.RIGHT) ? 1 : 0;
		this.debug = false; this.height = panel_height; this.lastState = "";
		this.iconSize = ICON_SIZE; this.icontype = St.IconType.SYMBOLIC;
		this.iconSizeDefault = ICON_SIZE; this.iconSizeDefaultSmb = ICON_SIZE;
		this.fontSize = FSZ; this.lastSize = 0; this.lastType = 0; this.keylight_state = false;
		this.backlight = 0; this.maxBlt = 0; this.minBlt = 0; this.bStep = 0; this.noBlt = false;
		this.keylight = 0; this.maxKlt = 0; this.minKlt = 0; this.kStep = 0; this.noKlt = false;
		this.NumName = _("Num Lock"); this.CapsName = _("Caps Lock"); this.ScrollName = _("Scroll Lock");
		this.DispName = _("Display backlight"); this.KeyName = _("Keyboard backlight");
		this.lblOn = " " + _("on"); this.lblOff = " " + _("off");
		this._firstRun = true; this._getStates();
		this.settings = new Settings.AppletSettings(this, metadata.uuid, instance_id);

		this.settings.bind("show-notifications", "showNotifications", null);
		this.settings.bind("show-tooltip", "showTooltip", null);
		this.settings.bind("no-blt", "noBlt", null);
		this.settings.bind("no-klt", "noKlt", null);
		this.settings.bind("blt", "bltBtn", null);
		this.settings.bind("klt", "kltBtn", null);
		this.settings.bind("indicator-type", "indicatorType", this._updateIconVisibility);
		this.settings.bind("icon-size-custom", "customSize", this._updateAll);
		this.settings.bind("icon-color-custom", "customColor", this._updateAll);
		this.settings.bind("font-size-custom", "customFont", null);
		this.settings.bind("color-off", "color0", this._updateIconVisibility);
		this.settings.bind("color-on", "color1", this._updateIconVisibility);
		this.settings.bind("color-bkg", "color2", this._updateIconVisibility);
		this.settings.bind("icon-size", "iconSizeCustom", this._updateIcons);
		this.settings.bind("font-size", "fontSize", null);
		this.settings.bind("items-custom", "compact", this._updateAll);
		this.settings.bind("max-items", "maxItems", this._updateAll);
		this.settings.bind("decor", "decor", this._updateIcons);

		this.icontype = (this.decor === true) ? St.IconType.FULLCOLOR : St.IconType.SYMBOLIC;

		try { this._getLight(BrightnessBusName, this.DispName); } catch(e) {}
		try { this._getLight(KeyboardBusName, this.KeyName); } catch(e) {}
		this.table = new St.Table({homogeneous: false, reactive: true, style_class:  'applet-box',
			x_expand: false, y_expand: false});
		this.table.set_style("padding: 0px; margin: 0px;"); let boxstyle = "padding: " + SPC.toString() + "px; margin: 1px;";
		this.actor.add(this.table); this.hover = this;
		this.binNum = new St.Bin({ name: this.NumName, reactive: true, style: boxstyle });
		this.binCaps = new St.Bin({ name: this.CapsName, reactive: true, style: boxstyle });
		this.binScroll = new St.Bin({ name: this.ScrollName, reactive: true, style: boxstyle });
		this.binBlt = new St.Bin({ name: this.DispName, reactive: true, style: boxstyle });
		this.binKlt = new St.Bin({ name: this.KeyName, reactive: true, style: boxstyle });
		this.data = new Map([[this.binNum, false], [this.binCaps, false], [this.binScroll, false],
			[this.binBlt, this.maxBlt], [this.binKlt, this.maxKlt]]);
		this.binNum.connect('enter-event', Lang.bind(this, this.onHover));
		this.binCaps.connect('enter-event', Lang.bind(this, this.onHover));
		this.binScroll.connect('enter-event', Lang.bind(this, this.onHover));
		this.binBlt.connect('enter-event', Lang.bind(this, this.onHover));
		this.binKlt.connect('enter-event', Lang.bind(this, this.onHover));
		this.binBlt.connect('scroll-event', Lang.bind(this, this.onScroll));
		this.binKlt.connect('scroll-event', Lang.bind(this, this.onScroll));
		Main.themeManager.connect("theme-set", Lang.bind(this, this._paintBtns));

		this.on_panel_icon_size_changed();
		this._updateState(Keymap, true);
		this._keyboardStateChangedId = Keymap.connect('state-changed', Lang.bind(this, this._updateState));
		this._updateIconVisibility();
		this._applet_tooltip._tooltip.use_markup = true;
		this._applet_tooltip._tooltip.clutter_text.ellipsize = false;
		this.set_applet_tooltip(this.showTooltip ? APPNAME : "");
	},

	_ensureSource: function() {
		if (!this._source) {
			this._source = new MessageTray.Source();
			this._source.connect('destroy', () => this._source = null );
			if (Main.messageTray) Main.messageTray.add(this._source);
		}
	},

	_notifyMessage: function(iconName, text) {
		if (this._notification)
			this._notification.destroy();

		/* must call after destroying previous notification,
		 * or this._source will be cleared */
		this._ensureSource();

		let icon = new St.Icon({
			icon_name: iconName,
			icon_type: this.icontype,
			icon_size: this.iconSize
		});
		this._notification = new MessageTray.Notification(this._source, _("Lock Keys+"), text, {
			icon: icon
		});
		this._notification.setUrgency(MessageTray.Urgency.NORMAL);
		this._notification.setTransient(true);
		this._notification.connect('destroy', Lang.bind(this, function() {
			this._notification = null;
		}));
		this._source.notify(this._notification);
	},

	_buildMenu: function(n) {
		this._applet_context_menu.removeAll();
		if (n.length > 1) {
			for (let i=0; i<n.length; i++) {
				if (n[i] == this.binNum) {
					this.numMenuItem = new PopupMenu.PopupSwitchMenuItem(this.NumName, this.numlock_state);
					this.numMenuItem.connect('activate', Lang.bind(this, this._onStateChanged, "Num_Lock"));
					this._applet_context_menu.addMenuItem(this.numMenuItem);
				} else if (n[i] == this.binCaps) {
					this.capsMenuItem = new PopupMenu.PopupSwitchMenuItem(this.CapsName, this.capslock_state);
					this.capsMenuItem.connect('activate', Lang.bind(this, this._onStateChanged, "Caps_Lock"));
					this._applet_context_menu.addMenuItem(this.capsMenuItem);
				} else if (n[i] == this.binScroll) {
					this.scrollMenuItem = new PopupMenu.PopupSwitchMenuItem(this.ScrollName, this.scrolllock_state);
					this.scrollMenuItem.connect('activate', Lang.bind(this, this._onStateChanged, "Scroll_Lock"));
					this._applet_context_menu.addMenuItem(this.scrollMenuItem);
				}
			}
			this._applet_context_menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem({margin: 0}));
		}
		this.context_menu_item_about =  new PopupMenu.PopupIconMenuItem(_("About..."),
			"dialog-information", this.icontype);
		this.context_menu_item_about.connect('activate', Lang.bind(this, this.openAbout));
		this._applet_context_menu.addMenuItem(this.context_menu_item_about);

		this.context_menu_item_configure =  new PopupMenu.PopupIconMenuItem(_("Configure..."),
			"system-run", this.icontype);
		this.context_menu_item_configure.connect('activate', Lang.bind(this, this.configureApplet));
		this._applet_context_menu.addMenuItem(this.context_menu_item_configure);

		this.context_menu_item_remove =  new PopupMenu.PopupIconMenuItem(_("Disable '%s'").
			format(this._(this._meta.name)), "edit-delete", this.icontype);
		this.context_menu_item_remove.connect('activate', Lang.bind(this, function(actor, event) {
			if (Clutter.ModifierType.CONTROL_MASK & Cinnamon.get_event_state(event)) {
				AppletManager._removeAppletFromPanel(this._uuid, this.instance_id);
			} else {
				let dialog = new ModalDialog.ConfirmDialog(
					_("Are you sure you want to disable %s?").format(this._meta.name),
					() => AppletManager._removeAppletFromPanel(this._uuid, this.instance_id)
				);
				dialog.open();
			}
		}));
		this._applet_context_menu.addMenuItem(this.context_menu_item_remove);
	},

	on_panel_icon_size_changed: function() {
		try {this.iconSizeDefault = this.getPanelIconSize(St.IconType.FULLCOLOR);}
		catch(e) {this.iconSizeDefault = ICON_SIZE;}
		try {this.iconSizeDefaultSmb = this.getPanelIconSize(St.IconType.SYMBOLIC);}
		catch(e) {this.iconSizeDefaultSmb = ICON_SIZE;}
		this._updateIcons();
	},

	_updateAll: function() {
		this._updateIcons();
	},

	_updateIcons: function() {
		this.iconSize = this.customSize ? this.iconSizeCustom :
			(this.decor ? this.iconSizeDefault : this.iconSizeDefaultSmb);
		if (this.lastSize == this.iconSize && this.lastType == this.icontype) {
			this._updateIconVisibility();
			return;
		}
		this.lastSize = this.iconSize; this.lastType = this.icontype;
		if (this._firstRun === false) this._destroyIcons();
		this.num_on = new St.Icon({
			icon_name: "num-on",
			icon_type: this.icontype,
			icon_size: this.iconSize,
			style_class: "system-status-icon"
		});
		this.num_off = new St.Icon({
			icon_name: "num-off",
			icon_type: this.icontype,
			icon_size: this.iconSize,
			style_class: "system-status-icon"
		});
		this.caps_on = new St.Icon({
			icon_name: "caps-on",
			icon_type: this.icontype,
			icon_size: this.iconSize,
			style_class: "system-status-icon"
		});
		this.caps_off = new St.Icon({
			icon_name: "caps-off",
			icon_type: this.icontype,
			icon_size: this.iconSize,
			style_class: "system-status-icon"
		});
		this.scroll_on = new St.Icon({
			icon_name: "scroll-on",
			icon_type: this.icontype,
			icon_size: this.iconSize,
			style_class: "system-status-icon"
		});
		this.scroll_off = new St.Icon({
			icon_name: "scroll-off",
			icon_type: this.icontype,
			icon_size: this.iconSize,
			style_class: "system-status-icon"
		});
		this.klt_on = new St.Icon({
			icon_name: "klt-on",
			icon_type: this.icontype,
			icon_size: this.iconSize,
			style_class: "system-status-icon"
		});
		this.klt_off = new St.Icon({
			icon_name: "klt-off",
			icon_type: this.icontype,
			icon_size: this.iconSize,
			style_class: "system-status-icon"
		});
		this.blt = new St.Icon({
			icon_name: "blt-on",
			icon_type: this.icontype,
			icon_size: this.iconSize,
			style_class: "system-status-icon"
		});

		this.binNum.child = this.num_off;
		this.binCaps.child = this.caps_off;
		this.binScroll.child = this.scroll_off;
		this.binBlt.child = this.blt;
		this.binKlt.child = this.klt_off;
		this._updateIconVisibility();
	},

	_destroyIcons: function() {
		let o = this.table.get_children();
		for (let i=0; i<o.length; i++)
			o[i].destroy_all_children(); // get_child_at_index().destroy()
	},

	_buildBar: function(n, l) {
		let o = this.table.get_children();
		for (let i=0; i<o.length; i++)
			this.table.remove_child(o[i]);
		let items = this.compact ? Math.min(this.maxItems, n.length) : n.length - l.length;
		let sz = items * (this.iconSize + (items-1) * SPC)  > this.height ? 0 : 1;
		let pos = (sz && this.orient==0) || (sz==0 && this.orient==1) ? 1 : 0;
		let r, c, cp, br, bc; let next = 1;
		for (let i=0; i<n.length; i++) {
// compact items; put all in n, use a single loop:
			if (i > items * next - 1) next++;
			cp = i - items * (next - 1) + 1;
			r = pos ? cp : next; c = pos ? next : cp;
			this.table.add(n[i], {row: r, col: c, x_fill: false, y_fill: false,
				x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE});
		}
	},

	_updateIconVisibility: function() {
		this._paintBtns();
		let n = []; let l = [];
		if (this.indicatorType.match(/num/)) {
			this.binNum.show();
			n.push(this.binNum);
		}
		else
			this.binNum.hide();
		if (this.indicatorType.match(/caps/)) {
			this.binCaps.show();
			n.push(this.binCaps);
		}
		else
			this.binCaps.hide();
		if (this.indicatorType.match(/scroll/)) {
			this.binScroll.show();
  			n.push(this.binScroll);
		}
	  else
			this.binScroll.hide();

		if (!this.noBlt && this.indicatorType.match(/blt/)) {
			this.binBlt.show();
			n.push(this.binBlt);
			l.push(this.binBlt);
		}
		else
			this.binBlt.hide();
		if (!this.noKlt && this.indicatorType.match(/klt/)) {
			this.binKlt.show();
			n.push(this.binKlt);
			l.push(this.binKlt);
		}
		else {
			this.binKlt.hide();
		}
		this._buildBar(n, l);
		this._buildMenu(n);
	},

	_setColors: function() {
		if (!this.customColor) {
			this.colorOn = "";
			this.colorOff = "";
			try {this.table.set_style_class_name('applet-box');} catch(e) {}
		} else {
			this.colorOn = "color: " + this.color1 + "; background-color: " + this.color2;
			this.colorOff = "color: " + this.color0;
			try {this.table.set_style_class_name('');} catch(e) {}
		}
	},

	_paintBtns: function() {
		this._setColors();
		if (this.numlock_state) {
			this.binNum.set_style(this.colorOn);
			this.binNum.child = this.num_on;
		}
		else {
			this.binNum.child = this.num_off;
			this.binNum.set_style(this.colorOff);
		}

		if (this.capslock_state) {
			this.binCaps.set_style(this.colorOn);
			this.binCaps.child = this.caps_on;
		}
		else {
			this.binCaps.child = this.caps_off;
			this.binCaps.set_style(this.colorOff);
		}

		if (this.scrolllock_state) {
			this.binScroll.set_style(this.colorOn);
			this.binScroll.child = this.scroll_on;
		}
		else {
			this.binScroll.child = this.scroll_off;
			this.binScroll.set_style(this.colorOff);
		}

		if (this.keylight_state) {
			this.binKlt.set_style(this.colorOn);
			this.binKlt.child = this.klt_on;
		}
		else {
			this.binKlt.child = this.klt_off;
			this.binKlt.set_style(this.colorOff);
		}

		this.binBlt.set_style(this.colorOn);
	},

	_getStates: function() {
		this.numlock_state = this._getNumlockState();
		this.capslock_state = this._getCapslockState();
		this.scrolllock_state = this._getScrolllockState();
//		this.keylight_state = this._getKeylightState();
	},

	_updateState: function(a, force=false) {
// It's annoying that this function reacts to other modifier keys too!
// Caps=2, Num=16, Scroll=32 | Shift=1, Ctrl=4, Alt=8, Win=64, AltGr=128
		let m= a.get_modifier_state();
		if (!force && ((m & 205) != 0 || (this.lastState === m))) return;
		this.lastState = m;
		this._getStates();

		let numlock_prev = this.binNum.child;
		let capslock_prev = this.binCaps.child;
		let scrolllock_prev = this.binScroll.child;
		let keylight_prev = this.binKlt.child;

		this._paintBtns();

		this.data.set(this.binNum, this.numlock_state);
		this.data.set(this.binCaps, this.capslock_state);
		this.data.set(this.binScroll, this.scrolllock_state);
		this.data.set(this.binKlt, this.keylight_state);

		this.onHover(this.hover, 0);
		let msg, icon_name;

		try {this.numMenuItem.setToggleState(this.numlock_state);} catch(e){}
		try {this.capsMenuItem.setToggleState(this.capslock_state);} catch(e){}
		try {this.scrollMenuItem.setToggleState(this.scrolllock_state);} catch(e){}
		if (this.showNotifications && !this._firstRun) {
			if (this.indicatorType.match(/num/) && numlock_prev != this.binNum.child) {
				if (this.binNum.child == this.num_on) {
					msg = this.NumName + this.lblOn;
					icon_name = 'num-on';
				} else {
					msg = this.NumName + this.lblOff;
					icon_name = 'num-off';
				}
				this._notifyMessage(icon_name, msg);
			}
			if (this.indicatorType.match(/caps/) && capslock_prev != this.binCaps.child) {
				if (this.binCaps.child == this.caps_on) {
					msg = this.CapsName + this.lblOn;
					icon_name = 'caps-on';
				} else {
					msg = this.CapsName + this.lblOff;
					icon_name = 'caps-off';
				}
				this._notifyMessage(icon_name, msg);
			}
			if (this.indicatorType.match(/scroll/) && scrolllock_prev != this.binScroll.child) {
				if (this.binScroll.child == this.scroll_on) {
					msg = this.ScrollName + this.lblOn;
					icon_name = 'scroll-on';
				} else {
					msg = this.ScrollName + this.lblOff;
					icon_name = 'scroll-off';
				}
				this._notifyMessage(icon_name, msg);
			}
			if (this.indicatorType.match(/klt/) && keylight_prev != this.binKlt.child) {
				if (this.binKlt.child == this.klt_on) {
					msg = this.KeyName + this.lblOn;
					icon_name = 'klt-on';
				} else {
					msg = this.KeyName + this.lblOff;
					icon_name = 'klt-off';
				}
				this._notifyMessage(icon_name, msg);
			}
		}
		this._firstRun = false;
	},

	_getNumlockState: function() {
		return Keymap.get_num_lock_state();
	},

	_getCapslockState: function() {
		return Keymap.get_caps_lock_state();
	},

	_getScrolllockState: function() {
		return Keymap.get_scroll_lock_state();
	},

	_getKeylightState: function() {
		return !this.keylight_state;	// just until we find out how to get real state!
	},

	_onStateChanged: function(actor, event, s, key) {
		let keyval = Gdk.keyval_from_name(key);
//global.log("key=" + key + ", code=" + keyval.toString());
		Adapt.keyval_press(keyval);
		Adapt.keyval_release(keyval);
		if (key === "KbdLightOnOff") {
			this.keylight_state = this._getKeylightState();
			this._updateState(Keymap, true);
		} else this._updateState(Keymap);
	},

	_getPercStr: function(val, vmax) {
		return (Math.round(val * 100 / vmax)).toString() + "%";
	},

	_setTooltip: function(txt, val) {
		if (!this.showTooltip) { this.set_applet_tooltip(""); return; }
		if (this.customFont) {
			this.ttstyle = "text-align: center; font-size: " + this.fontSize.toString() + "pt;";
			this._applet_tooltip._tooltip.set_style(this.ttstyle);
		} else this._applet_tooltip._tooltip.set_style("");
		let tttxt = txt + ": <span><b>" + val + "</b></span>";
// Do this twice or markup will be fucked up!
		this._applet_tooltip._tooltip.get_clutter_text().set_markup(tttxt);
		this._applet_tooltip._tooltip.clutter_text.set_markup(tttxt);
	},

	on_applet_clicked: function(event) {
		 if (this.indicatorType === "num" || event.get_source() === this.binNum) {
			this._onStateChanged(this, event, true, "Num_Lock");
			if (this.debug) global.log("clicked Num");
		}
	   else if (this.indicatorType === "caps" || event.get_source() === this.binCaps) {
			this._onStateChanged(this, event, true, "Caps_Lock");
			if (this.debug) global.log("clicked Caps");
		}
		else if (this.indicatorType === "scroll" || event.get_source() === this.binScroll) {
			this._onStateChanged(this, event, true, "Scroll_Lock");
			if (this.debug) global.log("clicked Scroll");
		}
		else if (this.indicatorType === "klt" || event.get_source() === this.binKlt) {
			this._onStateChanged(this, event, true, "KbdLightOnOff");
			if (this.debug) global.log("clicked KbdLight");
		}
		this.onHover(event.get_source(), "enter"); // event is irrelevant here.
// Stupid behavior: on applet click tooltip is automatically hidden
// and won't be shown again until cursor is moved! So we use this trick.
// On slower machines the timeout value [ms] may have to be increased.
		this.timeout = Util.setInterval(() => this._shakeCursor(), 100);
	},

	_shakeCursor: function() {
		Util.clearInterval(this.timeout); this.timeout = null;
		let dev, mx, my, scr;
		let disp = Gdk.Display.get_default();
		try {
			let seat = disp.get_default_seat();
			dev = seat.get_pointer();
		}catch(e) {
			let devman = disp.get_device_manager();
			dev = devman.get_client_pointer();
		}
//		let wnd = disp.get_default_group();
//		wnd.get_device_position(dev, mx, my, null);
//		[mx, my, mod] = wnd.get_device_position(dev);
// I know it's deprecated but WTF should we
// do if wnd.get_device_position() doesn't work!?!
		[scr, mx, my] = dev.get_position(); 
//global.log("mouse x=" + mx.toString() + " y=" + my.toString());
// gdk_device_warp()
		dev.warp(scr, mx+5, my);
//		[scr, mx, my] = dev.get_position();
//		dev.warp(scr, mx-5, my);
		dev.warp(scr, mx, my);
	},

	onHover: function(actor, event) {
		let t, s;
		if (actor.name === null) {
			t = this._meta.name ;
			s = "v" + this._meta.version.toString() + "\n</b>by " + this._meta.author + "<b>";
		} else {
			t = actor.name; let d = this.data.get(actor);
			if (t == this.DispName) s = this._getPercStr(this.backlight, this.maxBlt);
			else if (t == this.KeyName)
				s = this.keylight_state === true ? this._getPercStr(this.keylight, this.maxKlt) : "Off";
			else s = d === true ? "On" : d === false ? "Off" : "?";
		}
		this._setTooltip(t, s);
		this.hover = actor;
	},

	onScroll: function(actor, event) {
		let direction = event.get_scroll_direction(); let d;
		switch (actor.name) {
			case this.DispName:
				if (direction == Clutter.ScrollDirection.DOWN) {
					if (this.backlight > this.minBlt) {
						this.backlight = Math.max(this.minBlt, this.backlight - this.bStep);
						Adapt.keyval_press(bltkeyD);
						Adapt.keyval_release(bltkeyD);
					}
				}
				else if (direction == Clutter.ScrollDirection.UP) {
					if (this.backlight < this.maxBlt) {
						this.backlight = Math.min(this.maxBlt, this.backlight + this.bStep);
						Adapt.keyval_press(bltkeyU);
						Adapt.keyval_release(bltkeyU);
					}
				}
				this.data.set(this.binBlt, this.backlight);
				if (this.showTooltip) {
					d = this._getPercStr(this.backlight, this.maxBlt);
				}
				break;
			case this.KeyName:
				if (this.keylight_state === false) break;
				if (direction == Clutter.ScrollDirection.DOWN) {
					if (this.keylight > this.minKlt) {
						this.keylight = Math.max(this.minKlt, this.keylight - this.kStep);
						Adapt.keyval_press(kltkeyD);
						Adapt.keyval_release(kltkeyD);
					}
				}
				else if (direction == Clutter.ScrollDirection.UP) {
					if (this.keylight < this.maxKlt) {
						this.keylight = Math.min(this.maxKlt, this.keylight + this.kStep);
						Adapt.keyval_press(kltkeyU);
						Adapt.keyval_release(kltkeyU);
					}
				}
				this.data.set(this.binKlt, this.keylight);
				if (this.showTooltip) {
					d = this._getPercStr(this.keylight, this.maxKlt);
				}
				break;
		}
	},

	on_panel_height_changed: function() {
		this.height = this._panelHeight;
		this._updateIconVisibility();
	},

	on_orientation_changed: function(orient) {
		this.orient = (orient == St.Side.LEFT || orient == St.Side.RIGHT) ? 1 : 0;
		this._updateIconVisibility();
	},

	on_applet_removed_from_panel: function() {
		Keymap.disconnect(this._keyboardStateChangedId);
		this.settings.finalize();
	},

	on_applet_reloaded: function() {
// no idea for now
	},

// Adapted from the official power applet in Mint 19.2 //
// This should be called whenever devices change as we
// might (dis)connect an external keyboard and this
// must be reflected in settings and on panel
	_getLight: function(bus, key) {
		this.test = 0; let p;
		var pro = Interfaces.getDBusProxy(bus);
		if (debug) global.log("proxy " + key.toString() + " = " + pro.toString());
		try { p = pro.GetPercentageSync(); } // returns an array [val]
		catch(e) {
			if (key === this.DispName) {
				this.noBlt = true; // no display backlight available
				this.backlight = 0; this.maxBlt = 0; this.bStep = 0;
				this.bltBtn = false;
			} else if (key === this.KeyName) {
				this.noKlt = true; // no keyboard backlight available
				this.keylight = 0; this.maxKlt = 0; this.kStep = 0;
				this.kltBtn = false;
			}
			if (debug) global.log("percentage error for " + key.toString() + " : " + this.noBlt.toString() + ", " + this.noKlt.toString());
			return;
		}
		if (debug) global.log("percentage " + key.toString() + " = " + p[0].toString());
		this._proxy = pro;
		try { this._step = this._proxy.GetStepSync(); }
		catch(e) { this._step = Samstep; }
		if (debug) global.log("step " + key.toString() + " = " + this._step.toString());
// dBus
		if (p[0] > 50) { // don't use 'equal to zero', system may avoid that value
			try { this._proxy.StepDownSync(); } catch(e) { }
			this.test = this._proxy.GetPercentageSync();
			try { this._proxy.StepUpSync(); } catch(e) { }
			if (debug) global.log("test step down " + key.toString() + " (perc=" + p[0] + ")  = " + this.test.toString());
		} else {
			try { this._proxy.StepUpSync(); } catch(e) { }
			this.test = this._proxy.GetPercentageSync();
			try { this._proxy.StepDownSync(); } catch(e) { }
			if (debug) global.log("test step up " + key.toString() + " (perc=" + p[0] + ")  = " + this.test.toString());
		}
// stepTest
		this.vmax = Math.floor(100 / Math.abs(p[0] - this.test));
		this._step = 100 / this.vmax;
		if (debug) global.log("for " + key.toString() + ": max=" + this.vmax + ", step=" + this._step.toString());
		if (key === this.DispName) {
			this.backlight = Math.round(p[0] / this._step);
			this.maxBlt = this.vmax; this.bStep = this._step;
			this._proxy.connectSignal('Changed', Lang.bind(this, this._getBlt));
			if (debug) global.log("1: backlight=" + this.backlight.toString() + ", keylight=" + this.keylight.toString());
		}
		else if (key === this.KeyName) {
			this.keylight = Math.round(p[0] / this._step);
			this.maxKlt = this.vmax; this.kStep = this._step;
			this._proxy.connectSignal('Changed', Lang.bind(this, this._getKlt));
			if (debug) global.log("2: backlight=" + this.backlight.toString() + ",keylight=" + this.keylight.toString());
		}
	if (debug) global.log("3: maxBlt=" + this.maxBlt.toString() + ", bStep=" + this.bStep.toString());
	if (debug) global.log("3: maxKlt=" + this.maxKlt.toString() + ", kStep=" + this.kStep.toString());
	},

	_getBlt() {
		this._proxy.GetPercentageRemote(Lang.bind(this, function(val, e) {
			this.backlight = Math.round(val / this.bStep);
			this._setTooltip(this.DispName, this._getPercStr(this.backlight, this.maxBlt));
		}));
	},

	_getKlt() {
		this._proxy.GetPercentageRemote(Lang.bind(this, function(val, e) {
			this.keylight = Math.round(val / this.kStep);
			this._setTooltip(this.KeyName, this._getPercStr(this.keylight, this.maxKlt));
		}));
	}
};

function main(metadata, orientation, panel_height, instance_id) {
	return new MyApplet(metadata, orientation, panel_height, instance_id);
}
// EndOfFile
