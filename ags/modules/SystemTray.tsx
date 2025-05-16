import { hook, Gtk, Gdk } from "astal/gtk4";
import Tray from "gi://AstalTray";
import { bind } from "astal";

function TrayItem({ item }: { item: Tray.TrayItem }) {
    const button = (
        <button
            cssClasses={[ "TrayItem" ]}
            tooltipText={bind(item, "tooltipMarkup")}
        >
            <image
                gicon={bind(item, "gicon")}
                pixelSize={16}
            />
        </button>
    ) as Gtk.Button;

    // Configuração do Popover
    const popover = new Gtk.PopoverMenu();
    popover.set_menu_model(item.menuModel);
    popover.set_parent(button);
    popover.set_position(Gtk.PositionType.RIGHT);

    // Controladores de Eventos
    const primaryClick = new Gtk.GestureClick();
    primaryClick.set_button(Gdk.BUTTON_PRIMARY);
    
    const secondaryClick = new Gtk.GestureClick();
    secondaryClick.set_button(Gdk.BUTTON_SECONDARY);

    // Middle click support
    const middleClick = new Gtk.GestureClick();
    middleClick.set_button(Gdk.BUTTON_MIDDLE);

    const handlersClick = [
        primaryClick.connect("pressed", (_, _n, x, y) => { if (item.is_menu) { popover.popup(); } else { item.activate(x, y); } }),
        secondaryClick.connect("pressed", () => { item.about_to_show(); popover.popup(); }),
        middleClick.connect("pressed", (_, _n, x, y) => { item.secondary_activate(x, y); })
    ];

    button.add_controller(primaryClick);
    button.add_controller(secondaryClick);
    button.add_controller(middleClick);

    const handlerActions = [
        item.connect("notify::menu-model", () => { popover.set_menu_model(item.menuModel); }),
        item.connect("notify::action-group", () => { button.insert_action_group("dbusmenu", item.actionGroup); })
    ];
    

    

    // Cleanup
    button.connect("destroy", () => {
        handlersClick.forEach((h: number) => button.disconnect(h));
        handlerActions.forEach((h: number) => item.disconnect(h));
        popover.unparent();
    });
    return button;
}

export default function SystemTray() {
    const tray = Tray.get_default();
    
    return (
        <box 
            cssClasses={[ "SystemTray" ]}
            orientation={Gtk.Orientation.HORIZONTAL}
            spacing={4}
            marginEnd={8}
        >
            {
                bind(tray, "items").as(items => 
                    items.map(
                        item => ( <TrayItem item={item}/>)
                    )
                )
            }
        </box>
    );
}