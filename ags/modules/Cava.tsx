import { Gtk } from "astal/gtk4";
import Gsk from 'gi://Gsk';
import AstalCava from "gi://AstalCava?version=0.1";
import GObject from 'gi://GObject';
import Graphene from "gi://Graphene?version=1.0";

const CavaConfig = {
  autosens: true,
  bars: 40,
  barWidth: 20,
  barHeight: 140,
  framerate: 60,
  input: AstalCava.Input.PIPEWIRE,
  noiseReduction: 0.77,
  sensitivity: 0.75,
  stereo: false,
  lerpFactor: 1
};

const cavaInstance = AstalCava.get_default();
let handler: number | null = null;

const Cava = GObject.registerClass({ GTypeName: 'Cava' }, class Cava extends Gtk.DrawingArea {
    private _rect = new Graphene.Rect();
    private _size = new Graphene.Size();
    private builder = new Gsk.PathBuilder();
    private clip!: Gsk.RoundedRect | null;
    private values!: Float32Array;
    private norm!: Float32Array;
    private _isDestroyed = false;

    constructor() {
      super();
      this.setupRect();
      this.setupCava();
    }

    private setupRect() {
      this.set_size_request(CavaConfig.barWidth * CavaConfig.bars, CavaConfig.barHeight);
      this.clip = new Gsk.RoundedRect();
      this._size.init(7, 7);
      this._rect.init(0, 0, this.get_allocated_width(), this.get_allocated_height());
      this.clip.init(this._rect, this._size, this._size, Graphene.Size.zero(), Graphene.Size.zero());
    }

    private setupCava() {
      if(cavaInstance) {
        try {
          cavaInstance.set_autosens(CavaConfig.autosens);
          cavaInstance.set_bars(CavaConfig.bars);
          cavaInstance.set_framerate(CavaConfig.framerate);
          cavaInstance.set_input(CavaConfig.input);
          cavaInstance.set_noise_reduction(CavaConfig.noiseReduction);
          cavaInstance.set_stereo(CavaConfig.stereo);
          this.add_css_class("CavaContainer");
          this.values = new Float32Array(CavaConfig.bars);
          this.norm = new Float32Array(CavaConfig.bars);

          // Limpar handler anterior se existir
          if (handler) {
            cavaInstance.disconnect(handler);
          }

          handler = cavaInstance.connect("notify::values", () => {
            if (!this._isDestroyed) {
              this.queue_draw();
            }
          });
        } catch (error) {
          console.warn("Erro ao configurar Cava:", error);
        }
      }
    }

    override vfunc_size_allocate(width: number, height: number): void {
      this.clip = null;
      super.vfunc_size_allocate(width, height, -1);
    }

    override vfunc_snapshot(snapshot: Gtk.Snapshot): void {
      if (!cavaInstance || this._isDestroyed) return;

      try {
        if (!this.clip) {
          this.clip = new Gsk.RoundedRect();
          this._rect.init(0, 0, this.get_allocated_width(), this.get_allocated_height());
          this.clip.init(this._rect, this._size, this._size, Graphene.Size.zero(), Graphene.Size.zero());
        }

        snapshot.push_rounded_clip(this.clip);
        this.draw_catmull_rom(snapshot);
        snapshot.pop();
      } catch (error) {
        console.warn("Erro no snapshot do Cava:", error);
      }
    }

    // Code from Kotontrion. See https://github.com/kotontrion/kompass/blob/main/libkompass/src/cava.vala
    private draw_catmull_rom(snapshot: Gtk.Snapshot): void {
      if(!cavaInstance || this._isDestroyed) return;

      try {
        if(!this.builder) this.builder = new Gsk.PathBuilder();

        const width = this.get_allocated_width();
        const height = this.get_allocated_height();
        const raw = cavaInstance.get_values();

        if (!raw || raw.length === 0) return;

        const bars = Math.min(CavaConfig.bars, raw.length);
        const barWidth = width / Math.max(1, bars-1);
        const color = this.get_color();
        const sens = CavaConfig.sensitivity;
        const lerp = CavaConfig.lerpFactor;
        const invSix = 1/6;

        // Validar arrays
        if (!this.values || this.values.length !== bars) {
          this.values = new Float32Array(bars);
        }
        if (!this.norm || this.norm.length !== bars) {
          this.norm = new Float32Array(bars);
        }

        for(let i = 0; i < bars; i++) {
          const vRaw = (raw[i] || 0) * sens;
          const v = this.values[i] += (vRaw - this.values[i]) * lerp;
          this.norm[i] = height - height * Math.max(0, Math.min(1, v));
        }

        this.builder.move_to(0, this.norm[0]);

        for (let i = 0; i < bars - 1; i++) {
          const p0x = (i - 1) * barWidth;
          const p0y = this.norm[i > 0 ? i - 1 : 0];
          const p1x = i * barWidth;
          const p1y = this.norm[i];
          const p2x = (i + 1) * barWidth;
          const p2y = this.norm[i + 1];
          const p3x = (i + 2) * barWidth;
          const p3y = this.norm[i + 2 < bars ? i + 2 : bars - 1];

          const c1x = p1x + (p2x - p0x) * invSix;
          const c1y = p1y + (p2y - p0y) * invSix;
          const c2x = p2x - (p3x - p1x) * invSix;
          const c2y = p2y - (p3y - p1y) * invSix;

          this.builder.cubic_to(c1x, c1y, c2x, c2y, p2x, p2y);
        }

        this.builder.line_to(width, height);
        this.builder.line_to(0, height);

        snapshot.append_fill(this.builder.to_path(), Gsk.FillRule.WINDING, color);
      } catch (error) {
        console.warn("Erro ao desenhar Cava:", error);
      }
    }

    public destroy() {
      this._isDestroyed = true;
      if (handler && cavaInstance) {
        try {
          cavaInstance.disconnect(handler);
        } catch (error) {
          console.warn("Erro ao desconectar handler do Cava:", error);
        }
        handler = null;
      }
    }
});

export default function CavaContainer() {
  let cavaWidget: InstanceType<typeof Cava> | null = null;

  return (
      <box
        setup={
          (self) => {
            self.set_size_request(CavaConfig.barWidth * CavaConfig.bars, CavaConfig.barHeight);
            cavaWidget = new Cava();
            self.append(cavaWidget);
          }
        }
        onDestroy={
          () => {
            if (cavaWidget) {
              cavaWidget.destroy();
              cavaWidget = null;
            }
            if(handler && cavaInstance) {
              try {
                cavaInstance.disconnect(handler);
              } catch (error) {
                console.warn("Erro ao limpar handler do Cava:", error);
              }
              handler = null;
            }
          }
        }
      />
  );
}
