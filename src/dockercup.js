/*
DockerCup -- backs up Docker volumes in your host
By Javier Peletier <jm@epiclabs.io>
Released under GNU. All rights reserved. Epic Labs, S.L. 2016

Designed to run inside a container.
Requires that the whole host filesystem is mounted under /host
Requires that /var/run/docker.sock is mounted under /docker.sock
Reads and writes config to host's /etc/dockercup.conf.json

*/

var Docker = require('dockerode');
var docker = new Docker({ socketPath: '/docker.sock' });
var yargs = require('yargs');
var wait = require("wait.for");
var shell = require("shelljs");
var fs = require("fs");
var moment = require("moment");
var log = require("./dockercup.log.js");

var config;
var status;
var argv;

var BACKUP_FOLDER = "/backup";



function parseCommandLine() {
    yargs.option("config", {
        demand: true,
        describe: "configuration file",
        type: "string"
    })
        .default({ config: "/host/etc/dockercup.conf.json" });

}

function exec(cmd) {

    wait.for(function (cmd, callback) {

        shell.exec(cmd, function (code, stdout, stderr) {
            var err = (code == 0) ? null : code;
            callback(err, { code: code, stdout: stdout, stderr: stderr })
        });


    }, cmd);

}

function backupContainer(backupConfig) {

    var now = moment();
    if (!backupConfig.status)
        backupConfig.status = { lastBackup: 0, seq: 0 };

    if (backupConfig.status.lastBackup) {
        var diff = now.diff(moment(backupConfig.status.lastBackup).subtract(1, "hours"), "days");

        if (diff < backupConfig.volumes.frequency) {
            log.warn("Not the time to back up " + backupConfig.name + " yet. Skipping...");
            return;
        }


    }

    backupConfig.status.lastBackup = now;

    var cfg = (JSON.parse(JSON.stringify(config.default)));

    Object.keys(backupConfig).forEach(function (key) {
        cfg[key] = backupConfig[key];

    }, this);


    var backupFolder = BACKUP_FOLDER + "/" + cfg.name + "-" + backupConfig.status.seq;
    var tarFile = backupFolder + "/" + cfg.name + ".tar";
    var zipFile = tarFile + ".7z";

    shell.rm("-rf", backupFolder);
    shell.mkdir("-p", backupFolder);

    var container = docker.getContainer(cfg.name);
    var containerInfo = wait.forMethod(container, "inspect")
    var mounts = containerInfo.Mounts;

    var tarcmd = "";
    var commands;

    if (mounts.length == 0) {
        log.warn(cfg.name + " has no volumes. Skipping...");
        return;
    }

    backupConfig.status.seq = (backupConfig.status.seq + 1) % cfg.numBackups;

    log.info(cfg.name + " has the following volumes:")

    mounts.forEach(function (m) {

        log.info("\t*  " + m.Destination + " -> " + m.Source);

        if (tarcmd == "") {
            commands = "-c -p -f";
        } else {
            commands = "-r -p -f";
            tarcmd += " && "
        }

        tarcmd += 'cd "/host' + m.Source + '" && ';
        tarcmd += "tar --transform 's,^," + m.Destination + "/,S' " + commands + ' "' + tarFile + '" * ';

    })


    if (containerInfo.State.Running && cfg.stop) {

        try {
            log.info(cfg.name + " is running. Attempting to stop it...");
            wait.forMethod(container, "stop");
            log.info(cfg.name + " stopped. DockerCup will restart it after tarring up its volumes.");
        }
        catch (e) {
            log.err("Error attempting to stop " + cfg.name + ". Error:" + JSON.stringify(e));
            log.err(cfg.name + " backup aborted.");
            return;
        }
    }
    
    log.info("Tarring " + cfg.name + "'s volumes...");

    shell.pushd("/tmp");
    try {
        exec(tarcmd);
        log.info(cfg.name + "'s volumes tarred up.");
    }
    catch (e) {
        log.err("Error executing tar backing up " + cfg.name + ". Error:" + JSON.stringify(e) + ". command line: " + tarcmd);
        log.err(cfg.name + " backup aborted.");
        return;
    }

    if (containerInfo.State.Running && cfg.stop) {

        try {
            log.info("Attempting to restart " + cfg.name + " ...");
            wait.forMethod(container, "start");
            log.info(cfg.name + " restarted successfully.");
        }
        catch (e) {
            log.err("Error attempting to restart " + cfg.name + ". Error:" + JSON.stringify(e));
        }
    }

    shell.popd();
    log.info("Compressing " + cfg.name + "'s volumes...");

    var zipCmd = '7z a -t7z "' + zipFile + '" -bd -m0=lzma2 -mx=9 -aoa -v256m "' + tarFile + '"';
    try {
        exec(zipCmd)
    }
    catch (e) {
        log.err("Error executing 7z backing up " + cfg.name + ". Error:" + JSON.stringify(e) + ". command line: " + zipCmd);
        log.err(cfg.name + " backup aborted.");
        return;
    }

    log.info("Done compressing " + cfg.name + "'s volumes.");
    shell.rm(tarFile);

    log.info("Uploading " + cfg.name + " backup to " + cfg.ftpHostname + "...");
    var ftpCommand = 'lftp -c "open -u ' + cfg.ftpUsername + ',' + cfg.ftpPassword + ' ' + cfg.ftpHostname +
        ';mirror -R --verbose --delete-first --delete ' + backupFolder + '/ ' + cfg.ftpRemoteFolder + '"';

    try {
        exec(ftpCommand);
    }
    catch (e) {
        log.err("Error uploading files to FTP backing up " + cfg.name + ". Error:" + JSON.stringify(e) + ". command line: " + ftpCommand);
        log.err(cfg.name + " backup aborted.");
        return;
    }

    try {
        // Save config with current status.
        fs.writeFileSync(argv.config, JSON.stringify(config, null, 4));
    }
    catch (e) {
        log.err("Error writing status/configuration to " + argv.config + " after successfully backing up " + cfg.name + ".");
    }
}



function main() {

    parseCommandLine();
    argv = yargs.argv;

    log.info("DockerCup v1.0 Copyright(c) 2016 Epic Labs");
    log.info("Using config file " + argv.config);

    try {
        config = JSON.parse(fs.readFileSync(argv.config, 'utf8'));
    }
    catch (e) {
        log.err("Error reading " + argv.config + ". Backup process aborted.");
        return;

    }

    shell.rm("-rf", BACKUP_FOLDER);
    shell.mkdir("-p", BACKUP_FOLDER);

    config.backup.forEach(backupContainer);

    log.info("Done!");

}

wait.launchFiber(main)