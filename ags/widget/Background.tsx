import { App, Astal, Gtk, Gdk } from "astal/gtk4";
import { DateTime } from "../modules/DateTime";
import CavaBackground from "../modules/Cava";

export default function Background(gdkmonitor: Gdk.Monitor) {
    const { BOTTOM, RIGHT, LEFT } = Astal.WindowAnchor

    return (
        <window
            visible
            gdkmonitor={ gdkmonitor }
            exclusivity={ Astal.Exclusivity.IGNORE }
            layer={ Astal.Layer.BOTTOM }
            anchor={ BOTTOM | LEFT | RIGHT }
            application={ App }
            popup={ false }
        >
            <centerbox cssClasses={["Background"]} halign={Gtk.Align.FILL}>
                <box cssClasses={[ "BackgroundLeftModules" ]} halign={ Gtk.Align.START }>
                    <CavaBackground />
                </box>
                <box cssClasses={[ "BackgroundLeftModules" ]} halign={ Gtk.Align.CENTER } hexpand>
                    
                </box>
                <box cssClasses={[ "BackgroundRightModules" ]} halign={ Gtk.Align.END }>
                    <DateTime />
                </box>
            </centerbox>
        </window>
    );
}