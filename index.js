const blessed = require('blessed')
const contrib = require('blessed-contrib')
const os = require('os');
const { snapshot } = require("process-list");



const screen = blessed.screen();


var grid = new contrib.grid({ rows: 12, cols: 12, screen: screen })


var cpuBar = grid.set(1, 1, 4, 4, contrib.bar,
    {
        barWidth: 4
        , barSpacing: 6
        , xOffset: 2
        , maxHeight: 9
        , label: "CPUs %"
    }
);
screen.append(cpuBar);
var membar = grid.set(1, 5, 4, 3, contrib.bar,
    {
        barWidth: 4
        , barSpacing: 6
        , xOffset: 2
        , maxHeight: 9
        , label: "Mem %"
    }
);
screen.append(membar);

var processTab = grid.set(5, 1, 7, 7, contrib.table,
    {
        keys: true
        , fg: 'green'
        , label: 'Active Processes'
        , columnSpacing: 1
        , columnWidth: [25, 10, 10, 10]
        , interactive: true
    }


);

screen.append(processTab);

async function fillProcessTab() {
    const tasks = await snapshot('pid', 'name', 'cpu', 'pmem');
    //console.log(tasks);
    var data = [];
    for (let i = 0; i < tasks.length; i++) {
        const proc = tasks[i];
        if (proc.pid === 0) {
            continue;
        }
        proc.cpu = (100 * proc.cpu).toFixed(2);
        proc.pmem = bytesToSize(proc.pmem, 3)
        data.push(Object.values(proc));
    }

    setInterval(function () {
        fillProcessTab();
        processTab.setData({ headers: ['PID', 'Process', 'Cpu (%)', 'Memory'], data: data });
        screen.render()
    }, 1000);

}
fillProcessTab();

function bytesToSize(bytes) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return '0 Byte';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

function fillMemBar() {
    var usedMem = [];
    usedMem.push(((1 - os.freemem() / os.totalmem()) * 100).toFixed(1));

    setInterval(function () {
        fillMemBar();
        membar.setData({ titles: ["mem"], data: usedMem });
        screen.render()
    }, 2000);


}
fillMemBar();


function fillCpuBar() {

    var cpuLabels = []

    var stats1 = getCPUUsage()
    for (let i = 0; i < stats1.length; i++) {
        var cpuStats1 = stats1[i];
        cpuLabels.push(cpuStats1.cpuNum);
    }

    setInterval(function () {
        var cpuValues = []
        var stats2 = getCPUUsage();
        for (let i = 0; i < stats2.length; i++) {
            var cpuStats1 = stats1[i];
            var cpuStats2 = stats2[i];

            var idle = cpuStats2.cpuIdle - cpuStats1.cpuIdle;
            var total = cpuStats2.cupTotal - cpuStats1.cupTotal;
            var perc = 1 - (idle / total);
            cpuValues.push((100 * perc).toFixed(1));
        }
        cpuBar.setData({ titles: cpuLabels, data: cpuValues })
        screen.render();
    }, 3000);

}

fillCpuBar();

function getCPUUsage() {
    var cpus = []
    for (let i = 0; i < os.cpus().length; i++) {
        const cpu = os.cpus()[i];
        var user = 0;
        var nice = 0;
        var sys = 0;
        var idle = 0;
        var irq = 0;
        total = 0;

        user += cpu.times.user;
        nice += cpu.times.nice;
        sys += cpu.times.sys;
        irq += cpu.times.irq;
        idle += cpu.times.idle;

        var total = user + nice + sys + idle + irq;

        cpus.push({ cpuNum: (i + 1).toString(), cpuIdle: idle, cupTotal: total });

    }

    return cpus;
}


screen.key(['escape', 'q', 'C-c'], function (ch, key) {
    return process.exit(0);
});

screen.render()