declare module "resource:///org/gnome/shell/ui/main.js" {
    const Main: any;
    export = Main;
}
declare module "untyped-library";
// Fixes TS2339 when adding custom/runtime methods
declare module "gi://St" {
    interface BoxLayout {
        ease(params: Record<string, unknown>): void;
    }
}

declare const global: {
    stage: {
        set_key_focus: (actor: any) => void;
    };
};
