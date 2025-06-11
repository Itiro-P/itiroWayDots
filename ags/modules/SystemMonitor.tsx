import AstalBattery from "gi://AstalBattery"
import { Variable, bind } from "astal"
import GTop from "gi://GTop?version=2.0";

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}m`;
}

const milliseconds = 2000;

const cpu = new GTop.glibtop_cpu();
const mem = new GTop.glibtop_mem();
const battery = AstalBattery.get_default();

const cpuData = {
  prev: { user: 0, sys: 0, total: 0 },
  diff: { user: 0, sys: 0, total: 0 }
};

GTop.glibtop_get_cpu(cpu);
cpuData.prev.user = cpu.user;
cpuData.prev.sys = cpu.sys;
cpuData.prev.total = cpu.total;

const metrics = Variable({ cpu: 0, mem: 0 }).poll(
    milliseconds,
    () => {
        try {
            const prevUser = cpuData.prev.user;
            const prevSys = cpuData.prev.sys;
            const prevTotal = cpuData.prev.total;

            GTop.glibtop_get_cpu(cpu);
            GTop.glibtop_get_mem(mem);

            cpuData.diff.user = cpu.user - prevUser;
            cpuData.diff.sys = cpu.sys - prevSys;
            cpuData.diff.total = cpu.total - prevTotal;

            cpuData.prev.user = cpu.user;
            cpuData.prev.sys = cpu.sys;
            cpuData.prev.total = cpu.total;

            const cpuPercent = cpuData.diff.total > 0
                ? Math.round(((cpuData.diff.user + cpuData.diff.sys) / cpuData.diff.total) * 100)
                : 0;
            const memPercent = mem.total > 0
                ? Math.round((mem.user / mem.total) * 100)
                : 0;

            return {
                cpu: Math.max(0, Math.min(100, cpuPercent)),
                mem: Math.max(0, Math.min(100, memPercent))
            };
        } catch (error) {
            console.warn("Erro ao obter métricas do sistema:", error);
            return { cpu: 0, mem: 0 };
        }
    }
);

const CpuUsage = () => {
    return (
        <box cssClasses={[ "CpuUsage" ]}>
            <label cssClasses={[ "CpuUsageIcon" ]} label={ '' } />
            <label cssClasses={[ "CpuUsageLabel" ]} label={ bind(metrics).as(m => `${m.cpu}%`) } />
        </box>
    );
}

const MemoryUsage = () => {
    return (
        <box cssClasses={[ "MemoryUsage" ]}>
            <label cssClasses={[ "MemoryUsageIcon" ]} label={ '' } />
            <label cssClasses={[ "MemoryUsageLabel" ]} label={ bind(metrics).as(m => `${m.mem}%`) } />
        </box>
    );
}

let batteryHandler: number | null = null;

const Battery = () => {
    return (
        <box
            cssClasses={[ "Battery" ]}
            tooltipText={ bind(battery, "charging").as(() => {
                try {
                    const isCharging = battery.get_charging();
                    const timeRemaining = isCharging ? battery.time_to_full : battery.time_to_empty;
                    const action = isCharging ? "Carregando" : "Descarregando";
                    return `${action}: ${formatTime(timeRemaining)} restante(s)`;
                } catch {
                    return "Informações da bateria indisponíveis";
                }
            }) }
            setup={
                (self) => {
                    if (batteryHandler) {
                        battery.disconnect(batteryHandler);
                    }

                    batteryHandler = battery.connect("notify::charging", () => {
                        try {
                            if(battery.percentage <= 0.2 && !battery.charging) {
                                self.add_css_class("BatteryCritical");
                            } else {
                                self.remove_css_class("BatteryCritical");
                            }
                        } catch (error) {
                            console.warn("Erro ao verificar status da bateria:", error);
                        }
                    });
                }
            }
            onDestroy={
              () => {
                if (batteryHandler) {
                    battery.disconnect(batteryHandler);
                    batteryHandler = null;
                }
            }}
        >
            <image cssClasses={[ "BatteryIcon" ]} iconName={ bind(battery, "iconName") } />
            <label label={ bind(battery, "percentage").as(p => {
                try {
                    return `${Math.round(Math.max(0, Math.min(100, p * 100)))}%`;
                } catch {
                    return "0%";
                }
            }) } />
        </box>
    );
}

export default function SystemMonitor() {
    return (
        <box
            cssClasses={[ "SystemMonitor" ]}
            onDestroy={() => {
                metrics.drop();
                if (batteryHandler) {
                    battery.disconnect(batteryHandler);
                    batteryHandler = null;
                }
            }}
        >
            <CpuUsage/>
            <MemoryUsage/>
            <Battery/>
        </box>
    );
}
