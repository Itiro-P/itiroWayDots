import { Gtk, Gdk } from "astal/gtk4";
import Mpris from "gi://AstalMpris";
import { GLib, GObject, Variable, bind } from "astal";
import CavaContainer from "./Cava";

const mediaState = Variable(
  {
    currentState: "Nada tocando...",
    currentCss: "",
    lastPlayer: null as Mpris.Player | null,
    handlers: [] as number[]
  }
);

let updateTimeout: number | null = null;
const DEBOUNCE_DELAY = 100;

const mpris = Mpris.get_default();

function disconnectFromPlayer() {
  const state = mediaState.get();

  // Cancela qualquer atualização pendente
  if (updateTimeout) {
    GLib.source_remove(updateTimeout);
    updateTimeout = null;
  }

  if (state.lastPlayer && state.handlers.length > 0) {
    // Desconecta todos os handlers
    state.handlers.forEach(handler => {
      if (state.lastPlayer && GObject.signal_handler_is_connected(state.lastPlayer, handler)) {
        state.lastPlayer.disconnect(handler);
      }
    });
  }
  mediaState.set({
    ...state,
    lastPlayer: null,
    handlers: [],
    currentCss: "",
    currentState: "Nada tocando..."
  });
}

function connectToPlayer(player: Mpris.Player) {
  disconnectFromPlayer();

  if (!player) return;

  // Verifica se o player ainda é válido antes de conectar
  try {
    if (!player.busName) return;
  } catch {
    return;
  }

  // Conecta múltiplos sinais para maior confiabilidade
  const handlers = [
    player.connect("notify::playback-status", () => {
      updateMediaState(player);
    }),
    player.connect("notify::title", () => {
      updateMediaState(player);
    }),
    player.connect("notify::artist", () => {
      updateMediaState(player);
    }),
    // Alguns players enviam notify::metadata em vez dos campos específicos
    player.connect("notify::metadata", () => {
      updateMediaState(player);
    })
  ];

  mediaState.set({
    ...mediaState.get(),
    lastPlayer: player,
    handlers: handlers
  });

  // Atualiza imediatamente
  updateMediaState(player);
}

function updateMediaState(player: Mpris.Player | null) {
  if (updateTimeout) {
    GLib.source_remove(updateTimeout);
    updateTimeout = null;
  }

  updateTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, DEBOUNCE_DELAY, () => {
    executeUpdateMediaState(player);
    updateTimeout = null;
    return GLib.SOURCE_REMOVE;
  });
}

function executeUpdateMediaState(player: Mpris.Player | null) {

  if (!player) {
    mediaState.set({
      ...mediaState.get(),
      currentCss: "",
      currentState: "Nada tocando..."
    });
    return;
  }

  try {
    if (!player.busName) {
      const nextPlayer = findBestPlayer();
      if (nextPlayer && nextPlayer !== player) {
        connectToPlayer(nextPlayer);
        return;
      }
    }

    const title = player.title || "Título desconhecido";
    const artist = player.artist || "Artista desconhecido";
    const status = player.playbackStatus;

    switch (status) {
      case Mpris.PlaybackStatus.PLAYING:
        mediaState.set({
          ...mediaState.get(),
          currentCss: "MediaPlaying",
          currentState: `Tocando agora: ${title} – ${artist}`
        });
        break;
      case Mpris.PlaybackStatus.PAUSED:
        mediaState.set({
          ...mediaState.get(),
          currentCss: "MediaPlaying",
          currentState: `Pausado: ${title} – ${artist}`
        });
        break;
      case Mpris.PlaybackStatus.STOPPED:
      default:
        mediaState.set({
          ...mediaState.get(),
          currentCss: "",
          currentState: "Nada tocando..."
        });
        break;
    }
  } catch (error) {
    console.warn("Erro ao acessar propriedades do player MPRIS:", error);
    // Tenta encontrar um player válido
    const nextPlayer = findBestPlayer();
    if (nextPlayer && nextPlayer !== player) {
      connectToPlayer(nextPlayer);
    } else {
      mediaState.set({
        ...mediaState.get(),
        currentCss: "",
        currentState: "Nada tocando..."
      });
    }
  }
}

function findBestPlayer(): Mpris.Player | null {
  const players = mpris.players;

  if (players.length === 0) return null;

  const validPlayers = players.filter(p => {
    try {
      return p.busName && p.busName.length > 0;
    } catch {
      return false;
    }
  });

  if (validPlayers.length === 0) return null;

  const playingPlayer = validPlayers.find(p => {
    try {
      return p.playbackStatus === Mpris.PlaybackStatus.PLAYING;
    } catch {
      return false;
    }
  });

  if (playingPlayer) {
    return playingPlayer;
  }

  const pausedPlayer = validPlayers.find(p => {
    try {
      return p.playbackStatus === Mpris.PlaybackStatus.PAUSED;
    } catch {
      return false;
    }
  });

  if (pausedPlayer) {
    return pausedPlayer;
  }

  return validPlayers[0];
}

function initializeMpris() {
  console.log("Inicializando MPRIS...");
  const initialPlayer = findBestPlayer();
  if (initialPlayer) {
    connectToPlayer(initialPlayer);
  } else {
    console.log("Nenhum player disponível na inicialização");
  }
}

let mprisHandlers: number[] = [];

function setupMprisHandlers() {
  mprisHandlers = [
    mpris.connect("player-added", (_, player: Mpris.Player) => {
      const currentPlayer = mediaState.get().lastPlayer;

      if (!currentPlayer) {
        connectToPlayer(player);
      } else {
        try {
          if (player.playbackStatus === Mpris.PlaybackStatus.PLAYING) {
            connectToPlayer(player);
          }
        } catch (error) {
          console.warn("Erro ao verificar status do novo player:", error);
        }
      }
    }),

    mpris.connect("player-closed", (_, player: Mpris.Player) => {
      const currentPlayer = mediaState.get().lastPlayer;

      if (currentPlayer === player) {
        const nextPlayer = findBestPlayer();
        if (nextPlayer) {
          connectToPlayer(nextPlayer);
        } else {
          disconnectFromPlayer();
        }
      }
    })
  ];
}

function MprisInfo() {
  return (
    <box cssClasses={["MprisInfo"]} vexpand>
      <label
        cssClasses={["MprisLabel"]}
        label={bind(mediaState).as(c => c.currentState)}
        ellipsize={3}
        maxWidthChars={75}
      />
    </box>
  );
}

export default function Media() {
  // Inicializa o MPRIS quando o componente é criado
  initializeMpris();
  setupMprisHandlers();

  return (
    <box
      cssClasses={bind(mediaState).as(m => ["Media", m.currentCss])}
      orientation={Gtk.Orientation.VERTICAL}
      setup={(self) => {
        const click = new Gtk.GestureClick();
        click.set_button(Gdk.BUTTON_PRIMARY);
        const clickHandler = click.connect("pressed", () => {
          const player = mediaState.get().lastPlayer;
          if (player) {
            try {
              player.play_pause();
              // Use GLib.timeout_add em vez de setTimeout
              GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                executeUpdateMediaState(player);
                return GLib.SOURCE_REMOVE;
              });
            } catch (error) {
              console.warn("Erro ao pausar/tocar:", error);
            }
          }
        });
        self.add_controller(click);

        (self as any)._clickHandler = clickHandler;
        (self as any)._clickController = click;
      }}
      onDestroy={() => {
        disconnectFromPlayer();
        mediaState.drop();

        mprisHandlers.forEach(h => {
          if (GObject.signal_handler_is_connected(mpris, h)) {
            mpris.disconnect(h);
          }
        });
        mprisHandlers = [];

        if (updateTimeout) {
          GLib.source_remove(updateTimeout);
          updateTimeout = null;
        }
      }}
    >
      <CavaContainer />
      <MprisInfo />
    </box>
  );
}
