# DockerCup -- backs up Docker containers to FTP

This image backs up Docker volumes in your host creating a 7z/tar file with the portion of the filesystem those volumes are mounted on, according to a configuration and schedule.

This script is designed to be run once a day as root, via a crontab. The backup frequency can be defined in days in the configuration file.

To back up a Docker container, if it is running, DockerCup stops it gracefully (only if the `stop` config parameter is set to `true`). Then, compresses all volumes mounted in it and uploads the result to the specified FTP space.

Backups in the FTP space are rotated so that space consumed for backups does not continuously grow.

## How to install

1. Copy `dockercup.sh` to `/usr/local/bin` and make it executable `chmod +x /usr/local/bin/dockercup.sh`
2. Create your global `/etc/dockercup.conf.json` starting off the included `dockercup.conf.json.sample` file.
3. For each Docker container you want its volumes to be to backed up, add an entry to the `backup` array in the configuration file
4. Add the script to crontab. For example, this line runs the backup every day at 4am:

```
0 4 * * * /usr/local/bin/dockercup.sh
```
Although the script runs every day, it will check each container's schedule to see if it has to actually execute the backup that day or not.

Trick: You can override gobal variables in each containers's backup configuration file, for example to back up a specific machine to a different FTP host.

### Configuration file details:

```javascript
{
    "default": { /* default section. These values can be overriden on a per-container basis */
        "ftpHostname": "ftp.hostname.com",
        "ftpUsername": "username",
        "ftpPassword": "password",
        "ftpRemoteFolder": "/vmbackup",
        "numBackups": 4, /* how many backups to keep in the FTP server */
        "frequency": 7, /* in days, how often to execute the backup */
        "stop": true /* if the container must be stopped to back its volumes up */
    },
    "logFolder" : "/var/log/dockercup" /* Where to put logs */
    "backup": [ /* array of per-container configurations */
        {
            "name": "container1", /* name of the container to back up */
            "stop": true,
            "numBackups": 7, /* how many backups to keep in the FTP server */
            "frequency": 1 /* in days, how often to execute the backup */
        }
    ]
}
```

### Logging

The script automatically saves rotating logs to the logging folder specified in the configuration file, by default `/var/log/dockercup/`

## License

Released under GPL!. Contributions welcome!

