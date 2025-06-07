import { App, Gdk, Gtk } from "astal/gtk4"
import style from "./style.scss"
import Bar from "./widget/Bar"
import Background from "./widget/Background"

App.start({
    instanceName: "AgsEcosystem",
    css: "",
    main() {
        const provider = new Gtk.CssProvider();
        provider.load_from_string(style);
        Gtk.StyleContext.add_provider_for_display(Gdk.Display.get_default()!, provider, Gtk.STYLE_PROVIDER_PRIORITY_USER);

        App.get_monitors().map(
            (monitor) => {
                Bar(monitor);
                Background(monitor);
            }
        );
    }
})
