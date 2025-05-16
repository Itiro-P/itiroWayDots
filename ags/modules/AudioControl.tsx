import Wp from "gi://AstalWp"
import { bind, GLib } from "astal"
import { Gtk, Gdk } from "astal/gtk4";

export default function AudioControl() {
    const audio = Wp.get_default()!.defaultSpeaker!;
    const step = 0.02;
    const scroll = new Gtk.EventControllerScroll({ flags: Gtk.EventControllerScrollFlags.VERTICAL });
    const click = { left: new Gtk.GestureClick(), right: new Gtk.GestureClick() };
    click.left.set_button(Gdk.BUTTON_PRIMARY);
    click.right.set_button(Gdk.BUTTON_SECONDARY);
    const handlers = [
        scroll.connect("scroll", (controler, dx, dy) => { audio.volume = (dy < 0 ? Math.min(audio.get_volume()+step, 1) : audio.get_volume()-step) }),
        click.left.connect("pressed", () => { audio.set_mute(!audio.get_mute()) } ),
        click.right.connect("pressed", () => { GLib.spawn_command_line_async("pavucontrol") } )
    ];
    return (
        <box 
            cssClasses={[ "AudioControl" ]}
            setup={
                (self) => {
                    self.add_controller(click.left);
                    self.add_controller(click.right);
                    self.add_controller(scroll);
                }
            }
            onDestroy={
                () => {
                    scroll.disconnect(handlers[0]);
                    click.left.disconnect(handlers[1]);
                    click.right.disconnect(handlers[2]);
                }
            }
            tooltipText={ bind(audio, "description").as(n => `Dispositivo atual: ${n}`) }
        >
            <image 
                cssClasses={[ "AudioControlBtn" ]} 
                iconName={ bind(audio, "volumeIcon") }
            />
            <label 
                cssClasses={[ "LabelAudioControl" ]} 
                label={ bind(audio, "volume").as(a => `${Math.round(a * 100)}%`) }
            />
        </box>
    );
}