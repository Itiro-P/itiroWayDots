import { App } from "astal/gtk4"
import style from "./style.scss"
import Bar from "./widget/Bar"
import Background from "./widget/Background"

App.start({
    css: style,
    main() {
        App.get_monitors().map(Bar);
        App.get_monitors().map(Background);
    },
})
