import { App, Astal, Gtk, Gdk } from "astal/gtk4"
import SystemMonitor from "../modules/SystemMonitor";
import AudioControl from "../modules/AudioControl";
import Network from "../modules/Network";
import SystemTray from "../modules/SystemTray";
import { MiniTime } from "../modules/DateTime";

export default function Bar(gdkmonitor: Gdk.Monitor) {
    const { TOP, LEFT, RIGHT } = Astal.WindowAnchor

    return (
        <window
            visible
            gdkmonitor={ gdkmonitor }
            exclusivity={ Astal.Exclusivity.EXCLUSIVE }
            anchor={ TOP | RIGHT | LEFT }
            application={ App }
        >
            <centerbox cssClasses={[ "Bar" ]} halign={ Gtk.Align.FILL }>
                <box halign={ Gtk.Align.START }>
                    <SystemTray />
                </box>

                <box halign={ Gtk.Align.CENTER }>
                    <MiniTime />
                </box>

                <box halign={ Gtk.Align.END }>
                    <Network />
                    <AudioControl />
                    <SystemMonitor />
                </box>
            </centerbox>
        </window>
    );
}