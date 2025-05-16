import { Gtk, Gdk, hook } from "astal/gtk4";
import Gsk from 'gi://Gsk';
import AstalCava from "gi://AstalCava?version=0.1";
import GObject from 'gi://GObject';
import Graphene from "gi://Graphene?version=1.0";
import Mpris from "gi://AstalMpris";
import { Variable, bind , interval } from "astal";

const CavaConfig = {
  autosens: true,
  bars: 40,
  barWidth: 20,
  barHeight: 140,
  framerate: 60,
  input: AstalCava.Input.PIPEWIRE,
  noiseReduction: 0.77,
  sensitivity: 0.8,
  stereo: false
};

function Media() {
  const mpris = Mpris.get_default();
  const currentState = Variable<string>("Nada tocando...");
  const currentCss = Variable<"MediaPlaying" | "MediaNotPlaying">("MediaNotPlaying");
  const lastPlayer = Variable< { player: Mpris.Player | null, handler: number | null } >({ player: null, handler: null });
  const playbackStatusProp = Mpris.Player.find_property('playback-status');

  const deletePlayer = () => {
    const toDelete = lastPlayer?.get() ?? null;
    if(toDelete) { toDelete.player?.disconnect(toDelete.handler!); }
  }

  const updateHandler = (player: Mpris.Player | null) => {
    if (!player) {
      currentState.set("Nada tocando…");
      currentCss.set("MediaNotPlaying");
      return;
    }
    switch(player.playbackStatus) {
      case Mpris.PlaybackStatus.PLAYING:
        currentState.set(`Tocando agora: ${player.title} – ${player.artist}`);
        currentCss.set("MediaPlaying");
        break;
      case Mpris.PlaybackStatus.PAUSED:
        currentState.set(`Pausado: ${player.title} – ${player.artist}`);
        currentCss.set("MediaPlaying");
        break;
      case Mpris.PlaybackStatus.STOPPED:
        currentState.set("Nada tocando…");
        currentCss.set("MediaNotPlaying");
    }
  }

  const setupPlayer = (player: Mpris.Player) => {
    deletePlayer();
    player.notify_by_pspec(playbackStatusProp);
    const handler = player.connect("notify::playback-status", () => { updateHandler(player); });
    lastPlayer.set({ player, handler });
    updateHandler(player);
  };

  if(mpris.players.length > 0) { setupPlayer(mpris.players[0]) }

  const mprisHandlers = [
    mpris.connect("player-added", 
      (_, player) => {
        deletePlayer();
        player.notify_by_pspec(playbackStatusProp);
        const handler = player.connect("notify::playback-status", () => { updateHandler(player); });
        lastPlayer.set({ player: player, handler: handler });
      }
    ),
    mpris.connect("player-closed",
      (_, player) => {
        deletePlayer();
        const newPlayer = mpris.players[0] ?? null;
        if(newPlayer) {
          newPlayer.notify_by_pspec(playbackStatusProp);
          const newHandler = newPlayer?.connect("notify::playback-status", () => { updateHandler(newPlayer); } );
          lastPlayer.set({ player: newPlayer, handler: newHandler });
        }
        else { lastPlayer.set({ player: null, handler: null }); }
      }
    )
  ];

  return (
    <box
      cssClasses={ bind(currentCss).as(c => [ "Media", c ]) }
      setup={
        (self) => {
          const click = new Gtk.GestureClick();
          click.set_button(Gdk.BUTTON_PRIMARY);
          click.connect("pressed", () => { if(lastPlayer.get().player) lastPlayer.get().player?.play_pause(); });
          self.add_controller(click);
        }
      }
      onDestroy={
          () => {
            deletePlayer();
            mprisHandlers.forEach(h => mpris.disconnect(h));
            currentState.drop();
            currentCss.drop();
            lastPlayer.drop();
          }
        }
        vexpand
      >
        <label cssClasses={[ "MediaLabel" ]} label={ bind(currentState) } ellipsize={ 3 } maxWidthChars={ 75 } />
      </box>
  );
}

const Cava = GObject.registerClass({ GTypeName: 'Cava' }, class Cava extends Gtk.DrawingArea {
    _points!: Graphene.Point[];
    cava!: AstalCava.Cava | null;
    private builder = new Gsk.PathBuilder();
    private clip!: Gsk.RoundedRect | null;

    constructor() {
        super();
        this._points = Array.from({ length: 4 }, () => new Graphene.Point({ x: 0, y: 0 }));
        this.cava = AstalCava.get_default();
        if(this.cava) {
          this.cava.set_autosens(CavaConfig.autosens);
          this.cava.set_bars(CavaConfig.bars);
          this.cava.set_framerate(CavaConfig.framerate);
          this.cava.set_input(CavaConfig.input);
          this.cava.set_noise_reduction(CavaConfig.noiseReduction);
          this.cava.set_stereo(CavaConfig.stereo);
          this.add_css_class("CavaContainer");
          this.set_size_request(CavaConfig.barWidth * CavaConfig.bars, CavaConfig.barHeight);
          this.cava.connect("notify::values", () => this.queue_draw());
        }
    }

    override vfunc_size_allocate(width: number, height: number): void {
      this.clip = null;
      super.vfunc_size_allocate(width, height, -1);
    }

    override vfunc_snapshot(snapshot: Gtk.Snapshot): void {
      const allocation = this.get_allocation();
      
      if (this.clip === null) {
        this.clip = new Gsk.RoundedRect();
        this.clip.init(
          new Graphene.Rect().init(0, 0, this.get_allocated_width(), this.get_allocated_height()),
          new Graphene.Size().init(7, 7),
          new Graphene.Size().init(7, 7),
          new Graphene.Size().init(0, 0),
          new Graphene.Size().init(0, 0)
        );
      }
      
      snapshot.push_rounded_clip(this.clip);
      this.draw_catmull_rom(snapshot);
      snapshot.pop();
    }

    private draw_rects(snapshot: Gtk.Snapshot): void {
      if(!this.cava) return;
      this.builder = new Gsk.PathBuilder();
      const width = this.get_allocated_width();
      const height = this.get_allocated_height();
      const values = this.cava.get_values().map(v => v * CavaConfig.sensitivity);
      const bars = this.cava.bars;
      const barWidth = width / bars;
      const color = this.get_style_context().get_color();

      for(let i = 0; i < bars; i++) {
        const barHeight = values[i] * height;
        const x = i * barWidth;
        this.builder.add_rect(new Graphene.Rect().init(
          x,
          height - barHeight,
          barWidth,
          barHeight
        ));
      }

      this.builder.close();
      snapshot.append_fill(this.builder.to_path(), Gsk.FillRule.WINDING, color);
    }

    // Code from Kotontrion. See https://github.com/kotontrion/kompass/blob/main/libkompass/src/cava.vala
    private draw_catmull_rom(snapshot: Gtk.Snapshot): void {
      if(!this.cava) return;
      this.builder = new Gsk.PathBuilder();
      const width = this.get_allocated_width();
      const height = this.get_allocated_height();
      const values = this.cava.get_values().map(v => v * CavaConfig.sensitivity);
      const bars = this.cava.bars;
      const barWidth = width / (bars-1);
      const color = this.get_style_context().get_color();
      this.builder.move_to(0, (height - height * values[0]))

      for (let i = 0; i <= bars - 2; i++) {
        if (i == 0) {
          this._points[0].x = 0;
          this._points[0].y = height - height * values[i];
        } else {
          this._points[0].x = (i - 1) * barWidth;
          this._points[0].y = height - height * values[i - 1];
        }

        this._points[1].x = i * barWidth;
        this._points[1].y = height - height * values[i];

        this._points[2].x = (i + 1) * barWidth;
        this._points[2].y = height - height * values[i + 1];

        if (i == bars - 2) {
          this._points[3].x = (i + 1) * barWidth;
          this._points[3].y = height - height * values[i + 1];
        } else {
          this._points[3].x = (i + 2) * barWidth;
          this._points[3].y = height - height * values[i + 2];
        }
        const c1x = this._points[1].x + (this._points[2].x - this._points[0].x) / 6;
        const c1y = this._points[1].y + (this._points[2].y - this._points[0].y) / 6;
        const c2x = this._points[2].x - (this._points[3].x - this._points[1].x) / 6;
        const c2y = this._points[2].y - (this._points[3].y - this._points[1].y) / 6;

        this.builder.cubic_to(c1x, c1y, c2x, c2y, this._points[2].x, this._points[2].y);
      }
      this.builder.line_to(width, height);
      this.builder.line_to(0, height);

      snapshot.append_fill(this.builder.to_path(), Gsk.FillRule.WINDING, color);
    }

});

export default function CavaBackground() {
  return (
    <box 
      cssClasses={[ "CavaBackground" ]} 
      orientation={ Gtk.Orientation.VERTICAL }
    >
      <box setup={ (self) => self.set_size_request(CavaConfig.barWidth * CavaConfig.bars, CavaConfig.barHeight) }>
        <Cava />
      </box>
      <Media />
    </box>
  );
}