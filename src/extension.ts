import St from "gi://St";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import Clutter from "gi://Clutter";

export default class DesktopClock {
    private widget!: St.BoxLayout;
    private mainWidget!: St.BoxLayout;

    private headerBox!: St.BoxLayout;
    private headerTitle!: St.Label;
    private collapseButton!: St.Button;

    private imageContainer!: St.Widget;
    private image!: St.Icon;

    private clockLabel!: St.Label;

    private textContainer!: St.BoxLayout;
    private notesEntry!: St.Entry;

    private br!: St.Widget;

    private timeout: number | null = null;
    private saveTimeoutId: number | null = null;
    sideButton!: St.BoxLayout;

    enable(): void {
        const file = Gio.File.new_for_path(
            GLib.build_filenamev([
                GLib.get_user_data_dir(),
                "gnome-shell",
                "extensions",
                "desktop-clock@sedki",
                "note.svg",
            ]),
        );

        // --- Header Bar ---
        this.headerBox = new St.BoxLayout({
            style_class: "header-box",
            x_expand: true,
        });

        this.headerTitle = new St.Label({
            text: "Notes & Clock",
            style_class: "header-title",
            x_expand: true,
        });

        this.collapseButton = new St.Button({
            label: "—",
            style_class: "collapse-button",
            reactive: true,
            can_focus: true,
        });

        this.headerBox.add_child(this.headerTitle);
        this.headerBox.add_child(this.collapseButton);

        // --- Notes Entry Field ---
        this.textContainer = new St.BoxLayout({
            vertical: true,
            x_expand: true,
        });

        this.notesEntry = new St.Entry({
            hint_text: "Type notes here...",
            style_class: "notes-entry",
            can_focus: true,
            reactive: true,
            x_expand: true,
        });

        const clutterText = this.notesEntry.get_clutter_text();
        clutterText.set_single_line_mode(false);
        clutterText.set_activatable(false);

        // Load saved notes from file on startup
        this.notesEntry.set_text(this.loadNotes());

        // Assign stage focus on click
        const grabFocus = () => {
            global.stage.set_key_focus(clutterText);
            return Clutter.EVENT_PROPAGATE;
        };

        this.notesEntry.connect("button-press-event", grabFocus);
        clutterText.connect("button-press-event", grabFocus);

        // Debounced Auto-Save: Saves 500ms after user stops typing
        clutterText.connect("text-changed", () => {
            if (this.saveTimeoutId !== null) {
                GLib.source_remove(this.saveTimeoutId);
            }
            this.saveTimeoutId = GLib.timeout_add(
                GLib.PRIORITY_DEFAULT,
                500,
                () => {
                    this.saveNotes();
                    this.saveTimeoutId = null;
                    return GLib.SOURCE_REMOVE;
                },
            );
        });

        this.textContainer.add_child(this.notesEntry);

        // --- Divider ---
        this.br = new St.Widget({
            height: 1,
            style_class: "br",
        });

        // --- Clock & Icon Footer ---
        this.widget = new St.BoxLayout({
            style_class: "content-box",
        });

        this.imageContainer = new St.Widget({
            style_class: "img",
        });

        this.image = new St.Icon({
            gicon: new Gio.FileIcon({ file: file }),
            icon_size: 32,
            style_class: "img",
        });

        this.imageContainer.add_child(this.image);

        this.clockLabel = new St.Label({
            text: "",
            style_class: "clock-label",
        });

        this.updateClock();

        this.widget.add_child(this.imageContainer);
        this.widget.add_child(this.clockLabel);

        // --- Main Container ---
        this.mainWidget = new St.BoxLayout({
            style_class: "desktop-clock",
            vertical: true,
            reactive: true,
            width: 320,
            height: 220,
            visible: false,
            opacity: 0,
        });

        this.mainWidget.add_child(this.headerBox);
        this.mainWidget.add_child(this.textContainer);
        this.mainWidget.add_child(this.br);
        this.mainWidget.add_child(this.widget);

        // --- Side Button Container ---
        this.sideButton = new St.BoxLayout({
            style_class: "sideButton",
            track_hover: true,
            reactive: true,
            height: 100,
            width: 20,
        });

        this.mainWidget.set_pivot_point(0.5, 0.5);
        this.sideButton.set_pivot_point(0.5, 0.5);

        // Screen Positioning
        const monitor = Main.layoutManager.primaryMonitor;
        const x = monitor.x + monitor.width - 340;
        const y = monitor.y + 50;

        (this.mainWidget as any).set_position(x, y);
        (this.sideButton as any).set_position(x + 330, y);

        Main.layoutManager.addChrome(this.mainWidget, {
            affectsInputRegion: true,
            trackFullscreen: false,
        });
        Main.layoutManager.addChrome(this.sideButton, {
            affectsInputRegion: true,
            trackFullscreen: false,
        });

        // --- Collapse / Expand Handlers ---
        const collapse = () => {
            this.saveNotes(); // Ensure notes are saved before collapsing
            global.stage.set_key_focus(null);

            (this.mainWidget as any).ease({
                opacity: 0,
                scale_x: 0.8,
                scale_y: 0.8,
                duration: 250,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                onComplete: () => {
                    (this.mainWidget as any).hide();
                    (this.sideButton as any).show();
                    (this.sideButton as any).scale_x = 0.5;
                    (this.sideButton as any).scale_y = 0.5;

                    (this.sideButton as any).ease({
                        opacity: 255,
                        scale_x: 1.0,
                        scale_y: 1.0,
                        duration: 200,
                        mode: Clutter.AnimationMode.EASE_IN_QUAD,
                    });
                },
            });

            return Clutter.EVENT_STOP;
        };

        const expand = () => {
            (this.sideButton as any).ease({
                opacity: 0,
                scale_x: 0.5,
                scale_y: 0.5,
                duration: 200,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                onComplete: () => {
                    (this.sideButton as any).hide();
                    (this.mainWidget as any).show();

                    (this.mainWidget as any).ease({
                        opacity: 255,
                        scale_x: 1.0,
                        scale_y: 1.0,
                        duration: 250,
                        mode: Clutter.AnimationMode.EASE_IN_QUAD,
                    });
                },
            });

            return Clutter.EVENT_STOP;
        };

        // Capture ESC Key Press to Collapse
        (this.mainWidget as any).connect(
            "captured-event",
            (actor: any, event: any) => {
                if (event.type() === Clutter.EventType.KEY_PRESS) {
                    if (event.get_key_symbol() === Clutter.KEY_Escape) {
                        collapse();
                        return Clutter.EVENT_STOP;
                    }
                }
                return Clutter.EVENT_PROPAGATE;
            },
        );

        (this.collapseButton as any).connect("clicked", collapse);
        (this.sideButton as any).connect("button-press-event", expand);

        // Update Clock
        this.timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
            this.updateClock();
            return GLib.SOURCE_CONTINUE;
        });
    }

    disable(): void {
        // Save text when extension is disabled or computer shuts down
        this.saveNotes();

        if (this.saveTimeoutId !== null) {
            GLib.source_remove(this.saveTimeoutId);
            this.saveTimeoutId = null;
        }

        if (this.timeout !== null) {
            GLib.source_remove(this.timeout);
            this.timeout = null;
        }

        if (this.mainWidget) {
            Main.layoutManager.removeChrome(this.mainWidget);
            (this.mainWidget as any).destroy();
        }

        if (this.sideButton) {
            Main.layoutManager.removeChrome(this.sideButton);
            (this.sideButton as any).destroy();
        }
    }

    private updateClock(): void {
        const date = new Date();
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");

        this.clockLabel.set_text(`${hours}:${minutes}:${seconds}`);
    }

    // --- File Storage Helpers ---

    private getNotesFilePath(): string {
        return GLib.build_filenamev([
            GLib.get_user_data_dir(),
            "gnome-shell",
            "extensions",
            "desktop-clock@sedki",
            "notes.txt",
        ]);
    }

    private saveNotes(): void {
        const text = this.notesEntry.get_text();
        const filePath = this.getNotesFilePath();
        try {
            GLib.file_set_contents(filePath, text);
        } catch (err) {
            console.error("[DesktopClock] Failed to save notes", err);
        }
    }

    private loadNotes(): string {
        const filePath = this.getNotesFilePath();
        try {
            if (GLib.file_test(filePath, GLib.FileTest.EXISTS)) {
                const [success, contents] = GLib.file_get_contents(filePath);
                if (success) {
                    const bytes = new Uint8Array(contents);
                    let str = "";
                    for (let i = 0; i < bytes.length; i++) {
                        str += String.fromCharCode(bytes[i]);
                    }
                    return str;
                }
            }
        } catch (err) {
            console.error("[DesktopClock] Failed to load notes", err);
        }
        return "";
    }
}
