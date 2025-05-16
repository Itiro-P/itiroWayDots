import { Gtk } from "astal/gtk4"
import { Variable, bind } from "astal"
import { astalify, type ConstructProps } from "astal/gtk4";

const time = Variable(
    {
        clock: "",
        date: ""
    }
).poll(60_000, 
    () => {
        const dateConstructor = new Date();
        return {
            clock: dateConstructor.toLocaleTimeString("pt-br", { hour: "2-digit", minute: "2-digit" }),
            date: dateConstructor.toLocaleDateString("pt-br", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(/^./, char => char.toUpperCase())
        };
    }
);

type CalendarProps = ConstructProps<Gtk.Calendar, Gtk.Calendar.ConstructorProps>
const Calendar = astalify<Gtk.Calendar, Gtk.Calendar.ConstructorProps>(Gtk.Calendar, {
    getChildren(self) { return [] },
    setChildren(self, children) {},
});

function MenuCalendar() {
    const selectedDate = Variable("Nenhuma data selecionada");

    return (
        <box cssClasses={[ "Calendar" ]} orientation={ Gtk.Orientation.VERTICAL } onDestroy={ () => { selectedDate.drop() } } >
            <label cssClasses={[ "CalendarLabel" ]} label={ bind(selectedDate) } />
            <Calendar
                cssClasses={ ["CalendarContainer"] }
                setup={(self) => {
                    const daySelectedId = self.connect("day-selected", () => {
                        const date = self.get_date();
                        selectedDate.set(`Selecionado: ${date.format("%d-%m-%Y")}`);
                    });

                    return () => { self.disconnect(daySelectedId); };
                }}
            />
        </box>
    );
}

export function DateTime() {
    return (
        <box 
            cssClasses={[ "DateTime" ]} 
            orientation={ Gtk.Orientation.VERTICAL } 
            onDestroy={() => { time.drop(); }}
        >
            <menubutton cssClasses={[ "Time" ]} halign={ Gtk.Align.END }>
                <label cssClasses={[ "TimeLabel" ]} label={ bind(time).as(t => `${t.clock}`) }/>
                <popover position={ Gtk.PositionType.TOP }>
                    <MenuCalendar />
                </popover>
            </menubutton>
            <label cssClasses={[ "Date" ]} label={ bind(time).as(t => `${t.date}`) } />
        </box>
    );
}

export function MiniTime() {
    return (
        <label cssClasses={[ "MiniTime" ]} onDestroy={() => { time.drop(); }} label={ bind(time).as(t => `${t.clock}`) } />
    );
}