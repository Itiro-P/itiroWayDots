import AstalNetwork from "gi://AstalNetwork";
import { Variable, bind } from "astal";

// Converte o enum DeviceState para texto em português
const stateTexts: Record<AstalNetwork.DeviceState, string> = {
  [AstalNetwork.DeviceState.UNKNOWN]:       'Desconhecido',
  [AstalNetwork.DeviceState.UNMANAGED]:     'Não gerenciado',
  [AstalNetwork.DeviceState.UNAVAILABLE]:   'Indisponível',
  [AstalNetwork.DeviceState.DISCONNECTED]:  'Desconectado',
  [AstalNetwork.DeviceState.PREPARE]:       'Preparando',
  [AstalNetwork.DeviceState.CONFIG]:        'Configurando',
  [AstalNetwork.DeviceState.NEED_AUTH]:     'Necessita autenticação',
  [AstalNetwork.DeviceState.IP_CONFIG]:     'Configurando IP',
  [AstalNetwork.DeviceState.IP_CHECK]:      'Verificando IP',
  [AstalNetwork.DeviceState.SECONDARIES]:   'Configurando secundários',
  [AstalNetwork.DeviceState.ACTIVATED]:     'Ativado',
  [AstalNetwork.DeviceState.DEACTIVATING]:  'Desconectado',
  [AstalNetwork.DeviceState.FAILED]:        'Falha',
};

function stateString(s: AstalNetwork.DeviceState) {
  return stateTexts[s] ?? 'Estado desconhecido';
}

const network = AstalNetwork.get_default();

const stats = Variable(
    {
        wifi: {
          name: network.wifi.device.get_iface(),
          ssid: network.wifi.ssid ?? '',
          state: network.wifi.state ?? AstalNetwork.DeviceState.UNKNOWN,
        },
        wired: {
          name: network.wired?.device.get_iface() ?? "Sem dispositivo",
          state: AstalNetwork.DeviceState.UNKNOWN
        }
    }
);

const handlers = [
  network.wifi.connect("state-changed",
    () => {
      stats.set(
        {
          ...stats.get(),
          wifi: {
            name: network.wifi.device.get_iface() ?? "Sem dispositivo",
            ssid: network.wifi.ssid ?? '',
            state: network.wifi.state ?? AstalNetwork.DeviceState.UNAVAILABLE
          }
        }
      )
    }
  ),
];

function Wifi() {
  return (
    <box cssClasses={[ "Wifi" ]}>
      <label
        maxWidthChars={20}
        label={bind(stats).as(s => s.wifi.state === AstalNetwork.DeviceState.ACTIVATED || s.wifi.state === AstalNetwork.DeviceState.SECONDARIES ? `${s.wifi.name}: ${s.wifi.ssid}` : `${s.wifi.name}: ${stateString(s.wifi.state)}`) }
        />
    </box>
  );
}

function Wired() {
  return (
    <box cssClasses={[ "Wired" ]}>
        <label
            maxWidthChars={ 20 }
            label={ bind(stats).as(s => s.wired.state === AstalNetwork.DeviceState.ACTIVATED || s.wired.state === AstalNetwork.DeviceState.SECONDARIES ? `${s.wired.name}: Connectado` : `${s.wired.name}${s.wired.name === "Sem dispositivo" ? '': ": " + stateString(s.wired.state)}`) }
        />
    </box>
  );
}

export default function Network() {

    return (
        <box
          cssClasses={[ "Network" ]}
          onDestroy={
            () => {
              stats.drop();
              network.wifi.disconnect(handlers[0]);
            }
          }
        >
          <Wifi />
          <Wired />
        </box>
    );
}
