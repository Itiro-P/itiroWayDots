import AstalNetwork from "gi://AstalNetwork";
import { Binding, Variable, bind, interval } from "astal";

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
  [AstalNetwork.DeviceState.DEACTIVATING]:  'Desativando',
  [AstalNetwork.DeviceState.FAILED]:        'Falha',
};

function stateString(s: AstalNetwork.DeviceState) {
  return stateTexts[s] ?? 'Estado desconhecido';
}

export default function Network() {
    const network = AstalNetwork.get_default();

    const stats = Variable(
        {
            wifi: {
                ssid: network.wifi.ssid ?? '',
                state: network.wifi.state ?? AstalNetwork.DeviceState.UNKNOWN
            }
        }
    );

    const handlers = [
        network.wifi.connect("state-changed", 
            () => {
                stats.set(
                    {
                        wifi: {
                            ssid: network.wifi.ssid ?? '',
                            state: network.wifi.state ?? AstalNetwork.DeviceState.UNAVAILABLE
                        }
                    }
                )
            }
        )
    ];

    return (
        <box cssClasses={[ "Network" ]} onDestroy={ () => { stats.drop(); handlers.forEach(h => { network.disconnect(h) }) } }>
            <box cssClasses={[ "Wifi" ]}>
                <label
                    maxWidthChars={ 20 }
                    label={ bind(stats).as(s => s.wifi.state === AstalNetwork.DeviceState.ACTIVATED ? `${s.wifi.ssid}` : stateString(s.wifi.state)) }
                />
            </box>
        </box>
    );
}