#!/usr/bin/python3 -B

try:
	import gi
	gi.require_version('Gtk', '3.0')
except:
	print("Error importing the gi module!")
	sys.exit()
import os
os.environ["PYTHONDONTWRITEBYTECODE"] = "1"
from JsonSettingsWidgets import *
from gi.repository import Gdk, Gio, Gtk

ipath = os.path.abspath(os.path.dirname(__file__)) + "/icons"
Gtk.IconTheme.get_default().append_search_path(ipath)
#================================================================
class Options(SettingsWidget):
	def __init__(self, info, key, settings):
		SettingsWidget.__init__(self)
		self.settings = settings
		self.set_border_width(2)
		self.set_spacing(5)
		self.props.margin = 2
		self.btns = self.settings.get_value("btns-type")
#### Main Grid
		self.grid0 = Gtk.Grid(halign=Gtk.Align.START, valign=Gtk.Align.CENTER \
			, margin = 0, column_spacing = 5, row_spacing = 3)
		self.pack_start(self.grid0, False, False, 0)
### Row 1: Indicators
## Label
		label1 = Gtk.Label(_("Indicators:"), halign=Gtk.Align.END)
## Icon Buttons
		bicons = ["num-off-symbolic", "caps-off-symbolic", "scroll-off-symbolic", \
							"blt-off-symbolic", "klt-off-symbolic", \
							"num-on-symbolic", "caps-on-symbolic", "scroll-on-symbolic", \
							"blt-on-symbolic", "klt-on-symbolic"]
		self.bopt = ["num", "caps", "scroll", "blt", "klt"]
		self.val = {}
		self.img0 = {}
		self.img1 = {}
		combo = self.settings.get_value("indicator-type")
		spec = "blt-klt"
		noblt = self.settings.get_value("no-blt")
		noklt = self.settings.get_value("no-klt")
		grid1a = Gtk.Grid(halign=Gtk.Align.CENTER, margin = 0 \
		, column_spacing = 15, row_spacing = 3)
		grid1b = Gtk.Grid(halign=Gtk.Align.CENTER, margin = 0 \
		, column_spacing = 15, row_spacing = 3)
		for i in self.bopt:
			j = self.bopt.index(i)
			self.val[i] = self.settings.get_value(i)
			bad = False
			btn = Gtk.ToggleButton(margin=0)
			self.img0[i] = Gtk.Image.new_from_icon_name(
				bicons[j], Gtk.IconSize.LARGE_TOOLBAR)
			self.img1[i] = Gtk.Image.new_from_icon_name(
				bicons[j+5], Gtk.IconSize.LARGE_TOOLBAR)
			if (i in combo) and ((i not in spec) or 
				(i == "blt" and noblt == False) or (i == "klt" and noklt == False)):
				btn.set_image(self.img1[i])
				btn.set_active(True)
			else:
				btn.set_image(self.img0[i])
			if (i == "blt" and noblt == True) or (i == "klt" and noklt == True):
				btn.set_sensitive(False)
				bad = True
			btn.set_always_show_image(True)
			desc = self.settings.get_property(i, "description")
			tip = self.settings.get_property(i, "tooltip") if \
				bad == False else _("(function not available)")
			btn.set_tooltip_text(desc + "\n\n" + tip)
			self.settings.bind(i, btn, 'active', Gio.SettingsBindFlags.DEFAULT)
			btn.connect('toggled', self.btnCombo, i)
			if i not in spec:
				grid1a.add(btn) if j == 0 else grid1a.attach(btn, j, 0, 1, 1)
			else:
				grid1b.add(btn) if j == 3 else grid1b.attach(btn, j, 0, 1, 1)
		btn = Gtk.ToggleButton(margin=0)
		img = Gtk.Image.new_from_icon_name("help", Gtk.IconSize.LARGE_TOOLBAR)
		btn.set_image(img)
		btn.set_always_show_image(True)
		btn.set_sensitive(False)
		btn.set_tooltip_text(_("(reserved for future function)"))
		grid1b.attach(btn, j+1, 0, 1, 1)
#================================================================
### Row 2: Icon colors
## Label
		label2 = Gtk.Label(_("Icon colors:"), halign=Gtk.Align.END)
## Radio Button 1
		btn1 = Gtk.RadioButton(label=_("default"))
		btn1.set_mode(self.btns)		# True=radiobutton, False=toggle button
		btn1.set_halign(Gtk.Align.CENTER)
		btn1.set_valign(Gtk.Align.CENTER)
		self.settings.bind("icon-color-default", btn1, 'active', Gio.SettingsBindFlags.DEFAULT)
		btn1.set_tooltip_text(self.settings.get_property("icon-color-default", "tooltip"))
## Radio Button 2
		btn2 = Gtk.RadioButton(group=btn1, label=_("custom"))
		btn2.set_mode(self.btns)		# True=radiobutton, False=toggle button
		btn2.set_halign(Gtk.Align.CENTER)
		btn2.set_valign(Gtk.Align.CENTER)
		self.settings.bind("icon-color-custom", btn2, 'active', Gio.SettingsBindFlags.DEFAULT)
		btn2.connect('toggled', self.iconColorCustom)
		btn2.set_tooltip_text(self.settings.get_property("icon-color-custom", "tooltip"))
## Grid 2 (Radio buttons)
		grid2 = Gtk.Grid(halign=Gtk.Align.CENTER, margin = 0 \
			, column_spacing = 5, row_spacing = 3)
		grid2.add(btn1)
		grid2.attach(btn2, 1, 0, 1, 1)
## Colorchooser Buttons
		bcol = ["color-off", "color-on", "color-bkg"]
		self.grid3 = Gtk.Grid(halign=Gtk.Align.START, margin = 0 \
		, column_spacing = 5, row_spacing = 3)
		for i in bcol:
			j = bcol.index(i)
			color = self.settings.get_value(i)
			rgba = Gdk.RGBA()
			rgba.parse(color)
			btn = Gtk.ColorButton.new_with_rgba(rgba)
			desc = self.settings.get_property(i, "description")
			btn.set_title("Select " + desc)
			btn.set_tooltip_text(desc + "\n\n" + self.settings.get_property(i, "tooltip"))
			btn.connect('color-set', self.saveColor, i)
			self.grid3.add(btn) if j == 0 else self.grid3.attach(btn, j, 0, 1, 1)
#================================================================
### Row 3: Icon size
## Label
		label3 = Gtk.Label(_("Icon size:"), halign=Gtk.Align.END)
## Radio Button 1
		btn1 = Gtk.RadioButton(label=_("default"))
		btn1.set_mode(self.btns)		# True=radiobutton, False=toggle button
		btn1.set_halign(Gtk.Align.CENTER)
		btn1.set_valign(Gtk.Align.CENTER)
		btn1.set_tooltip_text(self.settings.get_property("icon-size-default", "tooltip"))
## Radio Button 2
		btn2 = Gtk.RadioButton(group=btn1, label=_("custom"))
		btn2.set_mode(self.btns)		# True=radiobutton, False=toggle button
		btn2.set_halign(Gtk.Align.CENTER)
		btn2.set_valign(Gtk.Align.CENTER)
		self.settings.bind("icon-size-custom", btn2, 'active', Gio.SettingsBindFlags.DEFAULT)
		btn2.connect('toggled', self.iconSizeCustom)
		btn2.set_tooltip_text(self.settings.get_property("icon-size-custom", "tooltip"))
## Grid 4 (Radio buttons)
		grid4 = Gtk.Grid(halign=Gtk.Align.CENTER, margin = 0 \
			, column_spacing = 5, row_spacing = 3)
		grid4.add(btn1)
		grid4.attach(btn2, 1, 0, 1, 1)
## Spinbutton
		mins = self.settings.get_property("icon-size", "min")
		maxs = self.settings.get_property("icon-size", "max")
		step = self.settings.get_property("icon-size", "step")
		ttip = self.settings.get_property("icon-size", "tooltip")
		val = self.settings.get_value("icon-size")
		self.sp = Gtk.SpinButton.new_with_range(mins, maxs, step)
		self.sp.set_wrap(True)
		self.sp.set_value(val)
		self.sp.set_tooltip_text(ttip)
		self.settings.bind("icon-size", self.sp, 'value', Gio.SettingsBindFlags.DEFAULT)
## Label
		lbl = Gtk.Label(_("pixels"), halign=Gtk.Align.START)
## Grid 5 (spinbutton + label)
		self.grid5 = Gtk.Grid(halign=Gtk.Align.START, margin = 0 \
			, column_spacing = 5, row_spacing = 3)
		self.grid5.add(self.sp)
		self.grid5.attach(lbl, 1, 0, 1, 1)
#		self.sp.set_visible(False)
#		lbl.set_visible(False)
#================================================================
### Row 4: Tooltip font size
## Label
		label4 = Gtk.Label(_("Tooltip font size:"), halign=Gtk.Align.END)
## Radio Button 1
		btn1 = Gtk.RadioButton(label=_("default"))
		btn1.set_mode(self.btns)		# True=radiobutton, False=toggle button
		btn1.set_halign(Gtk.Align.CENTER)
		btn1.set_valign(Gtk.Align.CENTER)
		btn1.set_tooltip_text(self.settings.get_property("font-size-default", "tooltip"))
## Radio Button 2
		btn2 = Gtk.RadioButton(group=btn1, label=_("custom"))
		btn2.set_mode(self.btns)		# True=radiobutton, False=toggle button
		btn2.set_halign(Gtk.Align.CENTER)
		btn2.set_valign(Gtk.Align.CENTER)
		self.settings.bind("font-size-custom", btn2, 'active', Gio.SettingsBindFlags.DEFAULT)
		btn2.connect('toggled', self.fontSizeCustom)
		btn2.set_tooltip_text(self.settings.get_property("font-size-custom", "tooltip"))
## Grid 6 (Radio buttons)
		grid6 = Gtk.Grid(halign=Gtk.Align.CENTER, margin = 0 \
			, column_spacing = 5, row_spacing = 3)
		grid6.add(btn1)
		grid6.attach(btn2, 1, 0, 1, 1)
## Spinbutton
		mins = self.settings.get_property("font-size", "min")
		maxs = self.settings.get_property("font-size", "max")
		step = self.settings.get_property("font-size", "step")
		ttip = self.settings.get_property("font-size", "tooltip")
		val = self.settings.get_value("font-size")
		self.sp = Gtk.SpinButton.new_with_range(mins, maxs, step)
		self.sp.set_wrap(False)
		self.sp.set_value(val)
		self.sp.set_tooltip_text(ttip)
		self.settings.bind("font-size", self.sp, 'value', Gio.SettingsBindFlags.DEFAULT)
## Label
		lbl2 = Gtk.Label(_("points"), halign=Gtk.Align.START)
## Grid 3 (spinbutton + label)
		self.grid7 = Gtk.Grid(halign=Gtk.Align.START, margin = 0 \
			, column_spacing = 5, row_spacing = 3)
		self.grid7.add(self.sp)
		self.grid7.attach(lbl2, 1, 0, 1, 1)
#		self.sp.set_visible(False)
#		lbl2.set_visible(False)
#================================================================
### Row 5: Max icons per row
## Label
		label5 = Gtk.Label(_("Max icons/row:"), halign=Gtk.Align.END)
## Radio Button 1
		btn1 = Gtk.RadioButton(label=_("default"))
		btn1.set_mode(self.btns)		# True=radiobutton, False=toggle button
		btn1.set_halign(Gtk.Align.CENTER)
		btn1.set_valign(Gtk.Align.CENTER)
		btn1.set_tooltip_text(self.settings.get_property("items-default", "tooltip"))
## Radio Button 2
		btn2 = Gtk.RadioButton(group=btn1, label=_("custom"))
		btn2.set_mode(self.btns)		# True=radiobutton, False=toggle button
		btn2.set_halign(Gtk.Align.CENTER)
		btn2.set_valign(Gtk.Align.CENTER)
		self.settings.bind("items-custom", btn2, 'active', Gio.SettingsBindFlags.DEFAULT)
		btn2.connect('toggled', self.itemsCustom)
		btn2.set_tooltip_text(self.settings.get_property("items-custom", "tooltip"))
## Grid 6 (Radio buttons)
		grid8 = Gtk.Grid(halign=Gtk.Align.CENTER, margin = 0 \
			, column_spacing = 5, row_spacing = 3)
		grid8.add(btn1)
		grid8.attach(btn2, 1, 0, 1, 1)
## Spinbutton
		mins = self.settings.get_property("max-items", "min")
		maxs = self.settings.get_property("max-items", "max")
		step = self.settings.get_property("max-items", "step")
		ttip = self.settings.get_property("max-items", "tooltip")
		val = self.settings.get_value("max-items")
		self.sp = Gtk.SpinButton.new_with_range(mins, maxs, step)
		self.sp.set_wrap(False)
		self.sp.set_value(val)
		self.sp.set_tooltip_text(ttip)
		self.settings.bind("max-items", self.sp, 'value', Gio.SettingsBindFlags.DEFAULT)
## Label
		lbl3 = Gtk.Label(_("icons"), halign=Gtk.Align.START)
## Grid 3 (spinbutton + label)
		self.grid9 = Gtk.Grid(halign=Gtk.Align.START, margin = 0 \
			, column_spacing = 5, row_spacing = 3)
		self.grid9.add(self.sp)
		self.grid9.attach(lbl3, 1, 0, 1, 1)
#		self.sp.set_visible(False)
#		lbl3.set_visible(False)
#================================================================
### Row 6: Additional settings
## Label
		label6 = Gtk.Label(_("Additional:"), halign=Gtk.Align.END)
## Notifications
		ck1 = Gtk.CheckButton.new_with_label(_("Popups"))
		ck1.set_mode(self.btns)		# True=checkbox, False=toggle button
		ck1.set_halign(Gtk.Align.CENTER)
		self.settings.bind("show-notifications", ck1, 'active', Gio.SettingsBindFlags.DEFAULT)
		tip = self.settings.get_property("show-notifications", "tooltip")
		ck1.set_tooltip_text(tip)
## Tooltip
		ck2 = Gtk.CheckButton.new_with_label(_("Tooltip"))
		ck2.set_mode(self.btns)		# True=checkbox, False=toggle button
		ck2.set_halign(Gtk.Align.CENTER)
		self.settings.bind("show-tooltip", ck2, 'active', Gio.SettingsBindFlags.DEFAULT)
		tip = self.settings.get_property("show-tooltip", "tooltip")
		ck2.set_tooltip_text(tip)
## Grid 8 (Radio buttons)
		grid10 = Gtk.Grid(halign=Gtk.Align.CENTER, margin = 0 \
			, column_spacing = 5, row_spacing = 3)
		grid10.add(ck1)
		grid10.attach(ck2, 1, 0, 1, 1)
## Buttons type
		ck3 = Gtk.CheckButton.new_with_label(_("Radio buttons"))
		ck3.set_mode(self.btns)		# True=checkbox, False=toggle button
		ck3.set_halign(Gtk.Align.CENTER)
		self.settings.bind("btns-type", ck3, 'active', Gio.SettingsBindFlags.DEFAULT)
		tip = self.settings.get_property("btns-type", "tooltip")
		ck3.set_tooltip_text(tip)
## Grid 9 (Radio button)
		grid11 = Gtk.Grid(halign=Gtk.Align.START, margin = 0 \
			, column_spacing = 5, row_spacing = 3)
		grid11.add(ck3)
#		grid11.attach(ck4, 1, 0, 1, 1)
#================================================================
### Grouping
		self.grid0.add(label1)
		self.grid0.attach(grid1a, 1, 0, 1, 1)
		self.grid0.attach(grid1b, 2, 0, 1, 1)
		self.grid0.attach(Gtk.Separator.new(Gtk.Orientation.HORIZONTAL), 0, 1, 3,1)
		self.grid0.attach(label2, 0, 2, 1, 1)
		self.grid0.attach(grid2, 1, 2, 1, 1)
		self.grid0.attach(self.grid3, 2, 2, 1, 1)
		self.grid0.attach(Gtk.Separator.new(Gtk.Orientation.HORIZONTAL), 0, 3, 3,1)
		self.grid0.attach(label3, 0, 4, 1, 1)
		self.grid0.attach(grid4, 1, 4, 1, 1)
		self.grid0.attach(self.grid5, 2, 4, 1, 1)
		self.grid0.attach(Gtk.Separator.new(Gtk.Orientation.HORIZONTAL), 0, 5, 3,1)
		self.grid0.attach(label4, 0, 6, 1, 1)
		self.grid0.attach(grid6, 1, 6, 1, 1)
		self.grid0.attach(self.grid7, 2, 6, 1, 1)
		self.grid0.attach(Gtk.Separator.new(Gtk.Orientation.HORIZONTAL), 0, 7, 3,1)
		self.grid0.attach(label5, 0, 8, 1, 1)
		self.grid0.attach(grid8, 1, 8, 1, 1)
		self.grid0.attach(self.grid9, 2, 8, 1, 1)
		self.grid0.attach(Gtk.Separator.new(Gtk.Orientation.HORIZONTAL), 0, 9, 3,1)
		self.grid0.attach(label6, 0, 10, 1, 1)
		self.grid0.attach(grid10, 1, 10, 1, 1)
		self.grid0.attach(grid11, 2, 10, 1, 1)
		self.grid0.show()
#================================================================
# CALLBACKS
#================================================================
## Indicator button
	def btnCombo(self, btn, key):
		self.val[key] = btn.get_active()
		btn.set_image(self.img1[key]) if self.val[key] == True \
		else btn.set_image(self.img0[key]) 
		self.settings.set_value(key, self.val[key])
		combo = ""
		idx = 0
		for i in self.bopt:
			if self.val[i] == False:
				continue
			if idx == 0:
				combo += i
			else:
				combo += "-" + i
			idx += 1
		if idx == 0:
			combo = self.bopt[1]
			self.settings.set_value(combo, True)
		self.settings.set_value("indicator-type", combo)
#================================================================
## Icon color set
	def saveColor(self, wgt, key):
		val = wgt.get_rgba().to_string()
		self.settings.set_value(key, val)
## Icon color custom
	def iconColorCustom(self, wgt):
#		self.grid3.set_visible(wgt.get_active())
		pass
#================================================================
## Icon size custom
	def iconSizeCustom(self, btn):
#		self.grid5.set_visible(btn.get_active())
		pass
#================================================================
## Font size custom
	def fontSizeCustom(self, btn):
#		self.grid7.set_visible(btn.get_active())
		pass
#================================================================
## Icons/row custom
	def itemsCustom(self, btn):
#		self.grid9.set_visible(btn.get_active())
		pass
#================================================================
## EndOfFile
