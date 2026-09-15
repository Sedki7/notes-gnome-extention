import St from "gi://St";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import GLib from "gi://GLib";
import Gio from "gi://Gio";

export default class DesktopClock {
    private widget!: St.BoxLayout;
    private mainWidget!: St.BoxLayout;

    private imageContainer!: St.Widget;
    private image!: St.Icon;

    private clockLabel!: St.Label;

    private textContainer!: St.BoxLayout;
    private title!: St.Label;

    private br!: St.Widget;

    private timeout: number | null = null;

    routineSection!: St.BoxLayout;

    routineTitle!: St.Label;

    sideButton!: St.BoxLayout;

    enable(): void {
        // External items
        const file = Gio.File.new_for_path(
            GLib.build_filenamev([
                GLib.get_user_data_dir(),
                "gnome-shell",
                "extensions",
                "desktop-clock@sedki",
                "note.svg",
            ]),
        );

        // Main content widget
        this.widget = new St.BoxLayout({});

        // Image container
        this.imageContainer = new St.Widget({
            style_class: "img",
        });

        // Image
        this.image = new St.Icon({
            gicon: new Gio.FileIcon({
                file: file,
            }),
            icon_size: 64,
            style_class: "img",
        });

        this.imageContainer.add_child(this.image);

        // Clock
        this.clockLabel = new St.Label({
            text: "",
            style_class: "clock-label",
        });

        this.updateClock();

        // Text container
        this.textContainer = new St.BoxLayout({
            vertical: true,
            x_expand: true,
        });

        // Title
        this.title = new St.Label({
            text: "Notes",
            style_class: "title",
        });

        this.textContainer.add_child(this.title);

        // Spacer
        this.br = new St.Widget({
            height: 1,
            style_class: "br",
            margin_right: 13,
            margin_left: 13,
        });
        // Routin section
        this.routineSection = new St.BoxLayout({
            vertical: true,
        });

        // Side button
        this.sideButton = new St.BoxLayout({
            styleClass: "sideButton",
            track_hover: true,
            reactive: true,
            height: 100,
            width: 20,
        });

        // Main widget
        this.mainWidget = new St.BoxLayout({
            style_class: "desktop-clock",
            vertical: true,
            track_hover: true,
            reactive: true,
            width: 300,
            height: 150,
        });

        // Add content
        this.widget.add_child(this.imageContainer);
        this.widget.add_child(this.textContainer);
        this.widget.add_child(this.clockLabel);

        this.mainWidget.add_child(this.widget);
        this.mainWidget.add_child(this.br);

        // Position
        const monitor = Main.layoutManager.primaryMonitor;

        const x = monitor.x + monitor.width - 300 - 50;
        const y = monitor.y + 50;

        this.mainWidget.set_position(x, y);
        this.sideButton.set_position(x + 340, y);

        const collapse = () => {
            Main.layoutManager.removeChrome(this.mainWidget);
            Main.layoutManager.addChrome(this.sideButton, {
                affectsInputRegion: true,
                trackFullscreen: false,
            });
        };

        const expand = () => {
            Main.layoutManager.removeChrome(this.sideButton);
            Main.layoutManager.addChrome(this.mainWidget, {
                affectsInputRegion: true,
                trackFullscreen: false,
            });
        };
        this.mainWidget.connect("button-press-event", collapse);

        this.sideButton.connect("button-press-event", expand);

        // Add to desktop
        Main.layoutManager.addChrome(this.sideButton, {
            affectsInputRegion: true,
            trackFullscreen: false,
        });

        // Update clock every second
        this.timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
            this.updateClock();

            return GLib.SOURCE_CONTINUE;
        });
    }

    disable(): void {
        // Remove timer
        if (this.timeout !== null) {
            GLib.source_remove(this.timeout);
            this.timeout = null;
        }

        // Remove widget
        if (this.mainWidget) {
            Main.layoutManager.removeChrome(this.mainWidget);
            this.mainWidget.destroy();
        }
    }

    private updateClock(): void {
        const date = new Date();

        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");

        this.clockLabel.set_text(`${hours}:${minutes}:${seconds}`);
    }
}
