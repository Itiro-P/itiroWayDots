import { Gtk } from "astal/gtk4"
import { Variable, bind, timeout } from "astal"
import { astalify } from "astal/gtk4";

const time = Variable({ clock: "", date: "" }).poll(60_000,
    () => {
        const dateConstructor = new Date();
        return {
            clock: dateConstructor.toLocaleTimeString("pt-br", { hour: "2-digit", minute: "2-digit" }),
            date: dateConstructor.toLocaleDateString("pt-br", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(/^./, char => char.toUpperCase())
        };
    }
);

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
  const shouldReveal = Variable(false);
  const transitionSpeed = 750;

  function toggleReveal() { shouldReveal.set(!shouldReveal.get()) }

  return (
      <box
        cssClasses={[ "MiniTime" ]}
        onDestroy={ () => { time.drop(); shouldReveal.drop() } }
        onHoverEnter={ () => toggleReveal() }
        onHoverLeave={ () => toggleReveal() }
      >
        <revealer
          revealChild = { bind(shouldReveal).as(s => !s) }
          transitionType={ Gtk.RevealerTransitionType.SLIDE_LEFT }
          transitionDuration={ transitionSpeed/4 }
        >
          <label label={ bind(time).as(t => `${t.clock}`) } />
        </revealer>
        <revealer
          revealChild = { bind(shouldReveal).as(s => s) }
          transitionType={ Gtk.RevealerTransitionType.SLIDE_RIGHT }
          transitionDuration={ transitionSpeed }
        >
        <label label={ bind(time).as(t => `Hoje é: ${t.date}`) } />
        </revealer>
      </box>
  );
}
