import AstalBattery from "gi://AstalBattery"
import { Variable, bind } from "astal"
import GTop from 'gi://GTop?version=2.0';

function formatTime(seconds: number): string {
    return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}m`;
}


const milliseconds = 2000;

const cpu = new GTop.glibtop_cpu();
const mem = new GTop.glibtop_mem();
const battery = AstalBattery.get_default();

let prev = {
    user: cpu.user,
    sys: cpu.sys,
    total: cpu.total
};

let diff = {
    user: 0,
    sys: 0,
    total: 0
};

const metrics = Variable(
    {
        cpu: 0,
        mem: 0
    }
).poll(
    milliseconds,
    () => {
        prev.user = cpu.user;
        prev.sys = cpu.sys;
        prev.total = cpu.total;
        GTop.glibtop_get_cpu(cpu);
        GTop.glibtop_get_mem(mem);
        diff.user = cpu.user - prev.user;
        diff.sys = cpu.sys - prev.sys;
        diff.total = cpu.total - prev.total;
        return {
            cpu: diff.total > 0 ? Math.round(((diff.user + diff.sys) / diff.total) * 100): 0,
            mem: Math.round((mem.user / mem.total) * 100)
        };
    }
);

const CpuUsage = () => {
    return (
        <box cssClasses={[ "CpuUsage" ]}>
            <label cssClasses={[ "CpuUsageIcon" ]} label={ '' } />
            <label cssClasses={[ "CpuUsageLabel" ]} label={ bind(metrics).as(m => `${m.cpu}%`) } />
        </box>
    );
}
    
const MemoryUsage = () => {
    return (
        <box cssClasses={[ "MemoryUsage" ]}>
            <label cssClasses={[ "MemoryUsageIcon" ]} label={ '' } />
            <label cssClasses={[ "MemoryUsageLabel" ]} label={ bind(metrics).as(m => `${m.mem}%`) } />
        </box>
    );
}
    
const Battery = () => {
    return (
        <box 
            cssClasses={[ "Battery" ]}
            tooltipText={ bind(battery, "charging").as(b => `${battery.get_charging() ? `Carregando: ${formatTime(battery.time_to_full)} restante(s)` : `Descarregando: ${formatTime(battery.time_to_empty)} restante(s)`}`) }
            setup={
                (self) => {
                    battery.connect("notify::charging", 
                        () => {
                            if(battery.percentage <= 0.2 && !battery.charging) { self.add_css_class("BatteryCritical"); }
                            else { self.remove_css_class("BatteryCritical"); }
                        }
                    )
                }
            }
        >
            <image cssClasses={[ "BatteryIcon" ]} iconName={ bind(battery, "iconName") } />
            <label label={ bind(battery, "percentage").as(p => `${Math.round(p * 100)}%`) } />
        </box>
    );
}

export default function SystemMonitor() {
    return (
        <box cssClasses={[ "SystemMonitor" ]} onDestroy={() => metrics.drop() }>
            <CpuUsage/>
            <MemoryUsage/>
            <Battery/>
        </box>
    );
}